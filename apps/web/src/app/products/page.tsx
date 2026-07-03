'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Tags, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/api';
import { readStoredAuth } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';
import { QK } from '@/lib/query-keys';
import type {
  InventoryItem,
  Product,
  ProductCategory,
} from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import {
  ProductCard,
} from './components/product-card';
import {
  ProductFilters,
  type ProductFilter,
  type ProductSort,
} from './components/product-filters';
import {
  emptyProductForm,
  ProductFormModal,
  productFormToPayload,
  productToForm,
  type ProductForm,
} from './components/product-form-modal';
import { ProductKpiBar } from './components/product-kpi-bar';
import { getProductStock, isArchived } from './components/product-utils';
import { InventoryItemCard } from '../inventory/components/inventory-item-card';
import {
  StockActionModal,
  type StockActionMode,
  type StockActionPayload,
} from '../inventory/components/stock-action-modal';
import { StockMovementList } from '../inventory/components/stock-movement-list';
import {
  useAddStock,
  useAdjustStock,
  useInventory,
  useInventoryMovements,
  useWasteStock,
} from '@/hooks/useInventory';
import {
  useCreateProductCategory,
  useDeleteProductCategory,
  useProductCategories,
  useProducts,
  useUpdateProductCategory,
} from '@/hooks/useProducts';

type CategoryDraft = {
  name: string;
  description: string;
};

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportProductsCsv(products: Product[], categories: ProductCategory[]) {
  const headers = [
    'Nombre',
    'SKU',
    'Categoria',
    'Precio',
    'Tipo unidad',
    'Estado',
  ];

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Activo',
    ARCHIVED: 'Archivado',
  };

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const rows = products.map((product) => [
    product.name,
    product.sku ?? '',
    product.categoryId ? categoryMap.get(product.categoryId) ?? '' : '',
    Number(product.price ?? 0).toFixed(2),
    product.unitType ?? '',
    statusLabels[product.status ?? ''] ?? product.status ?? '',
  ]);

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')),
  ].join('\n');

  const blob = new Blob([`ï»¿${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function productMatchesFilter(product: Product, filter: ProductFilter) {
  const stock = getProductStock(product);
  if (filter === 'all') return true;
  if (filter === 'active') return !isArchived(product);
  if (filter === 'archived') return isArchived(product);
  if (filter === 'out') return !isArchived(product) && stock <= 0;
  if (filter === 'low') {
    const minimum = Number(product.inventory?.minimumQuantity ?? 0);
    return !isArchived(product) && stock > 0 && stock <= minimum;
  }
  return true;
}

function productSorter(sort: ProductSort) {
  if (sort === 'name') {
    return (a: Product, b: Product) => a.name.localeCompare(b.name, 'es');
  }
  if (sort === 'price') {
    return (a: Product, b: Product) =>
      Number(b.price ?? 0) - Number(a.price ?? 0);
  }
  if (sort === 'stock') {
    return (a: Product, b: Product) => getProductStock(b) - getProductStock(a);
  }
  return (a: Product, b: Product) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { tenant, hasPermission, hasRole } = useAuth();

  const canReadProducts = hasPermission('products.read') || hasPermission('products.read_basic');
  const canCreateProducts = hasPermission('products.create');
  const canUpdateProducts = hasPermission('products.update');
  const canArchiveProducts = hasPermission('products.archive');
  const canViewCost = hasRole('OWNER') || hasPermission('products.view_cost');
  const canReadStock = hasPermission('stock.read') || hasPermission('stock.read_basic');
  const canAddStock = hasPermission('stock.add');
  const canAdjustStock = hasPermission('stock.adjust');
  const canReadMovements = hasPermission('stock.movements.read');
  const canManageCategories =
    hasPermission('product_categories.create') ||
    hasPermission('product_categories.update');

  const productsQuery = useProducts({ enabled: canReadProducts });
  const categoriesQuery = useProductCategories();
  const inventoryQuery = useInventory({ enabled: canReadStock });
  const movementsQuery = useInventoryMovements({ enabled: canReadMovements });

  const addStock = useAddStock();
  const adjustStock = useAdjustStock();
  const wasteStock = useWasteStock();
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();

  const [tab, setTab] = useState('catalog');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [sort, setSort] = useState<ProductSort>('recent');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [archiveProduct, setArchiveProduct] = useState<Product | null>(null);
  const [archivePending, setArchivePending] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [stockMode, setStockMode] = useState<StockActionMode>('add');
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [movementProductId, setMovementProductId] = useState<string>('all');
  const [newCategory, setNewCategory] = useState<CategoryDraft>({
    name: '',
    description: '',
  });
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingCategoryDraft, setEditingCategoryDraft] = useState<CategoryDraft>({
    name: '',
    description: '',
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const saveProductMutation = useMutation({
    mutationFn: async (form: ProductForm) => {
      const payload = productFormToPayload(form, canViewCost);
      if (editingProduct) {
        return apiFetch<Product>(`/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: payload,
        });
      }
      return apiFetch<Product>('/products', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.products.all }),
        queryClient.invalidateQueries({ queryKey: QK.inventory.all }),
        queryClient.invalidateQueries({ queryKey: QK.inventory.movements }),
      ]);
      setProductModalOpen(false);
      setEditingProduct(null);
      setProductFormError(null);
      toast.success(
        editingProduct ? 'Producto actualizado.' : 'Producto creado.',
      );
    },
    onError: (error) => {
      setProductFormError(getErrorMessage(error, 'No se pudo guardar el producto.'));
    },
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const inventory = useMemo(
    () => inventoryQuery.data ?? [],
    [inventoryQuery.data],
  );
  const movements = useMemo(
    () => movementsQuery.data ?? [],
    [movementsQuery.data],
  );

  const inventoryByProductId = useMemo(
    () => new Map(inventory.map((item) => [item.productId, item])),
    [inventory],
  );

  const productsWithInventory = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        inventory:
          inventoryByProductId.get(product.id) ?? product.inventory ?? null,
      })),
    [inventoryByProductId, products],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredProducts = productsWithInventory
      .filter((product) => productMatchesFilter(product, filter))
      .filter((product) => {
        if (!normalizedQuery) return true;
        const category = categories.find((item) => item.id === product.categoryId);
        const haystack = [
          product.name,
          product.sku ?? '',
          product.barcode ?? '',
          category?.name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort(productSorter(sort));

    return filteredProducts;
  }, [categories, filter, productsWithInventory, query, sort]);

  const movementOptions = useMemo(() => {
    return productsWithInventory
      .map((product) => ({ id: product.id, name: product.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [productsWithInventory]);

  const visibleMovements = useMemo(() => {
    if (movementProductId === 'all') return movements;
    return movements.filter((movement) => movement.productId === movementProductId);
  }, [movementProductId, movements]);

  const inventoryCards = useMemo(() => {
    return inventory.map((item) => {
      const lastMovement = movements.find((movement) => movement.productId === item.productId);
      return { item, lastMovement };
    });
  }, [inventory, movements]);

  function openCreateProduct() {
    setEditingProduct(null);
    setProductFormError(null);
    setProductModalOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductFormError(null);
    setProductModalOpen(true);
  }

  function openStockModal(mode: StockActionMode, item: InventoryItem | null) {
    setStockMode(mode);
    setStockItem(item);
    setStockError(null);
  }

  async function handleStockSubmit(payload: StockActionPayload) {
    if (!stockItem) return;

    setStockError(null);
    try {
      if (stockMode === 'add') {
        await addStock.mutateAsync({ productId: stockItem.productId, ...payload });
      } else if (stockMode === 'adjust') {
        await adjustStock.mutateAsync({
          productId: stockItem.productId,
          ...payload,
          reason: payload.reason ?? '',
        });
      } else {
        await wasteStock.mutateAsync({
          productId: stockItem.productId,
          ...payload,
          reason: payload.reason ?? '',
        });
      }
      setStockItem(null);
      toast.success('Inventario actualizado.');
    } catch (error) {
      setStockError(getErrorMessage(error, 'No se pudo actualizar el inventario.'));
    }
  }

  async function handleArchiveProduct() {
    if (!archiveProduct) return;

    setArchivePending(true);
    try {
      await apiFetch<Product>(`/products/${archiveProduct.id}/archive`, {
        method: 'PATCH',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.products.all }),
        queryClient.invalidateQueries({ queryKey: QK.inventory.all }),
      ]);
      toast.success('Producto archivado.');
      setArchiveProduct(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo archivar el producto.'));
    } finally {
      setArchivePending(false);
    }
  }

  async function handleCreateCategory() {
    if (!newCategory.name.trim()) return;
    try {
      await createCategory.mutateAsync({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || undefined,
      });
      setNewCategory({ name: '', description: '' });
      toast.success('Categoria creada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo crear la categoria.'));
    }
  }

  async function handleUpdateCategory() {
    if (!editingCategory || !editingCategoryDraft.name.trim()) return;
    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        body: {
          name: editingCategoryDraft.name.trim(),
          description: editingCategoryDraft.description.trim() || undefined,
        },
      });
      setEditingCategory(null);
      toast.success('Categoria actualizada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar la categoria.'));
    }
  }

  async function handleDeleteCategory(category: ProductCategory) {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success('Categoria archivada.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo archivar la categoria.'));
    }
  }

  async function handleImportCsv() {
    const file = importFileRef.current?.files?.[0];
    if (!file) return;

    setImportPending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const storedAuth = readStoredAuth();
      const token = storedAuth?.accessToken;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/products/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Error HTTP ${response.status}`);
      }

      const result = await response.json() as { created: number; errors: string[] };

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.products.all }),
        queryClient.invalidateQueries({ queryKey: QK.inventory.all }),
      ]);

      if (result.created > 0) {
        toast.success(`${result.created} producto(s) importado(s).`);
      }
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} fila(s) con errores: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '...' : ''}`);
      }
      if (result.created === 0 && result.errors.length === 0) {
        toast.info('No se encontraron productos para importar.');
      }

      setImportOpen(false);
      if (importFileRef.current) importFileRef.current.value = '';
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo importar el archivo.'));
    } finally {
      setImportPending(false);
    }
  }

  if (!canReadProducts) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes acceso al catalogo de productos." />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Productos e inventario"
          description="Gestiona catalogo, existencias, movimientos y categorias del club."
          action={
            canCreateProducts ? (
              <Button onClick={openCreateProduct}>
                <Plus size={16} />
                Nuevo producto
              </Button>
            ) : null
          }
        />

        <ProductKpiBar products={productsWithInventory} canViewCost={canViewCost} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line">
            <TabsTrigger value="catalog">Catalogo</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
            <TabsTrigger value="movements">Movimientos</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            <ProductFilters
              query={query}
              filter={filter}
              sort={sort}
              onQueryChange={setQuery}
              onFilterChange={setFilter}
              onSortChange={setSort}
            />

            <div className="flex justify-end gap-2">
              {canCreateProducts ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={15} />
                  Importar CSV
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportProductsCsv(visibleProducts, categories)}
                disabled={visibleProducts.length === 0}
              >
                <Download size={15} />
                Exportar CSV
              </Button>
            </div>

            {productsQuery.isLoading ? <ListSkeleton rows={6} /> : null}
            {productsQuery.error ? (
              <ErrorState
                message="No se pudo cargar el catalogo."
                onRetry={() => productsQuery.refetch()}
              />
            ) : null}

            {!productsQuery.isLoading && !productsQuery.error ? (
              visibleProducts.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      canViewCost={canViewCost}
                      canUpdate={canUpdateProducts}
                      canArchive={canArchiveProducts}
                      canAddStock={canAddStock}
                      onEdit={openEditProduct}
                      onArchive={setArchiveProduct}
                      onAddStock={(target) =>
                        openStockModal(
                          'add',
                          inventoryByProductId.get(target.id) ?? {
                            id: `virtual-${target.id}`,
                            productId: target.id,
                            currentQuantity: target.inventory?.currentQuantity ?? 0,
                            minimumQuantity: target.inventory?.minimumQuantity ?? 0,
                            product: target,
                          },
                        )
                      }
                      onViewMovements={(target) => {
                        setMovementProductId(target.id);
                        setTab('movements');
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No hay productos para mostrar"
                  text="Ajusta los filtros o crea un producto nuevo."
                />
              )
            ) : null}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            {inventoryQuery.isLoading ? <ListSkeleton rows={6} /> : null}
            {inventoryQuery.error ? (
              <ErrorState
                message="No se pudo cargar el inventario."
                onRetry={() => inventoryQuery.refetch()}
              />
            ) : null}
            {!inventoryQuery.isLoading && !inventoryQuery.error ? (
              inventoryCards.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {inventoryCards.map(({ item, lastMovement }) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      lastMovement={lastMovement}
                      canAdd={canAddStock}
                      canAdjust={canAdjustStock}
                      canReadMovements={canReadMovements}
                      onAdd={(target) => openStockModal('add', target)}
                      onAdjust={(target) => openStockModal('adjust', target)}
                      onWaste={(target) => openStockModal('waste', target)}
                      onViewMovements={(target) => {
                        setMovementProductId(target.productId);
                        setTab('movements');
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No hay inventario registrado"
                  text="Los productos con control de stock apareceran aqui."
                />
              )
            ) : null}
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Movimientos de stock
                  </h2>
                  <p className="text-sm text-text-muted">
                    Entradas, ajustes, mermas y salidas registradas.
                  </p>
                </div>
                <select
                  className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={movementProductId}
                  onChange={(event) => setMovementProductId(event.target.value)}
                >
                  <option value="all">Todos los productos</option>
                  {movementOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            {movementsQuery.isLoading ? <ListSkeleton rows={6} /> : null}
            {movementsQuery.error ? (
              <ErrorState
                message="No se pudieron cargar los movimientos."
                onRetry={() => movementsQuery.refetch()}
              />
            ) : null}
            {!movementsQuery.isLoading && !movementsQuery.error ? (
              <StockMovementList
                movements={visibleMovements}
                title={
                  movementProductId === 'all'
                    ? 'Ultimos movimientos'
                    : 'Movimientos del producto'
                }
              />
            ) : null}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-lighter text-brand-primary">
                  <Tags size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Categorias del catalogo
                  </h2>
                  <p className="text-sm text-text-muted">
                    Organiza productos por familia para facilitar busqueda y reporting.
                  </p>
                </div>
              </div>

              {canManageCategories ? (
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    placeholder="Nombre de categoria"
                    value={newCategory.name}
                    onChange={(event) =>
                      setNewCategory((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <input
                    className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    placeholder="Descripcion opcional"
                    value={newCategory.description}
                    onChange={(event) =>
                      setNewCategory((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategory.name.trim() || createCategory.isPending}
                  >
                    {createCategory.isPending ? 'Creando...' : 'Crear'}
                  </Button>
                </div>
              ) : null}
            </Card>

            {categoriesQuery.isLoading ? <ListSkeleton rows={4} /> : null}
            {categoriesQuery.error ? (
              <ErrorState
                message="No se pudieron cargar las categorias."
                onRetry={() => categoriesQuery.refetch()}
              />
            ) : null}

            {!categoriesQuery.isLoading && !categoriesQuery.error ? (
              categories.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-text-primary">
                              {category.name}
                            </h3>
                            <Badge variant="secondary">
                              {category._count?.products ?? 0} productos
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-text-muted">
                            {category.description || 'Sin descripcion'}
                          </p>
                        </div>
                        {category.status !== 'ARCHIVED' ? (
                          <Badge variant="success">Activa</Badge>
                        ) : (
                          <Badge variant="secondary">Archivada</Badge>
                        )}
                      </div>

                      {canManageCategories ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(category);
                              setEditingCategoryDraft({
                                name: category.name,
                                description: category.description ?? '',
                              });
                            }}
                          >
                            Editar
                          </Button>
                          {category.status !== 'ARCHIVED' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteCategory(category)}
                            >
                              Archivar
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Sin categorias"
                  text="Crea la primera categoria para ordenar el catalogo."
                />
              )
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      <ProductFormModal
        open={productModalOpen}
        mode={editingProduct ? 'edit' : 'create'}
        initialValue={editingProduct ? productToForm(editingProduct) : emptyProductForm}
        canViewCost={canViewCost}
        saving={saveProductMutation.isPending}
        error={productFormError}
        tenantName={tenant?.name ?? 'QuickPanel360'}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
          setProductFormError(null);
        }}
        onSubmit={async (form) => {
          setProductFormError(null);
          await saveProductMutation.mutateAsync(form);
        }}
      />

      <StockActionModal
        open={Boolean(stockItem)}
        mode={stockMode}
        item={stockItem}
        saving={
          addStock.isPending || adjustStock.isPending || wasteStock.isPending
        }
        error={stockError}
        onClose={() => {
          setStockItem(null);
          setStockError(null);
        }}
        onSubmit={handleStockSubmit}
      />

      <Dialog
        open={Boolean(archiveProduct)}
        onOpenChange={(open) => !open && setArchiveProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar producto</DialogTitle>
            <DialogDescription>
              {archiveProduct
                ? `El producto "${archiveProduct.name}" dejara de estar disponible para nuevas operaciones.`
                : 'Confirma el archivado del producto.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveProduct(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleArchiveProduct}
              disabled={archivePending}
            >
              {archivePending ? 'Archivando...' : 'Archivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingCategory)}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Ajusta nombre y descripcion de la categoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              className="h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Nombre"
              value={editingCategoryDraft.name}
              onChange={(event) =>
                setEditingCategoryDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <input
              className="h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Descripcion"
              value={editingCategoryDraft.description}
              onChange={(event) =>
                setEditingCategoryDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={!editingCategoryDraft.name.trim() || updateCategory.isPending}
            >
              {updateCategory.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!open) {
            setImportOpen(false);
            if (importFileRef.current) importFileRef.current.value = '';
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar productos desde CSV</DialogTitle>
            <DialogDescription>
              Sube un archivo CSV con columnas: name (o nombre), price (o precio), category (o categoria), sku, barcode, description, unittype (UNIT, GRAM, KG, ML, PACK).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,text/csv"
              className="h-10 w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded file:border-0 file:bg-brand-lighter file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                if (importFileRef.current) importFileRef.current.value = '';
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportCsv}
              disabled={importPending}
            >
              {importPending ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}

