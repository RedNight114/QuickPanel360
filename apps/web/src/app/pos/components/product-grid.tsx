'use client';

import { Plus, Search, ShoppingBasket } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HelpTip } from '@/components/help/help-tip';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types';
import { formatPricePerGram, formatWeightKg, isKgProduct, type AddCartInput } from '@/lib/weight';
import { getProductStock, isLowStock } from './pos-metrics';
import { WeightSaleModal } from './weight-sale-modal';

type ProductGridProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  onAddProduct: (product: Product, quantity?: AddCartInput) => void;
  getCartQuantity: (productId: string) => number;
};

type StockFilter = 'all' | 'available' | 'out' | 'low';

export function ProductGrid({
  products,
  loading,
  error,
  onAddProduct,
  getCartQuantity,
}: ProductGridProps) {
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [manualProduct, setManualProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matching = products.filter((product) => {
      const stock = getProductStock(product);
      const matchesQuery = !normalizedQuery
        || [product.name, product.sku, product.unitType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

      if (!matchesQuery) return false;
      if (stockFilter === 'available') return stock > 0;
      if (stockFilter === 'out') return stock <= 0;
      if (stockFilter === 'low') return isLowStock(product);
      return true;
    });

    return matching.sort((a, b) => {
      const stockA = getProductStock(a);
      const stockB = getProductStock(b);
      if (stockA > 0 && stockB <= 0) return -1;
      if (stockA <= 0 && stockB > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, query, stockFilter]);

  const filters: Array<{ value: StockFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'available', label: 'Con stock' },
    { value: 'out', label: 'Sin stock' },
    { value: 'low', label: 'Stock bajo' },
  ];

  return (
    <Card className="overflow-visible border border-border-light bg-white shadow-card">
      {/* Header */}
      <div className="border-b border-border-light px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-2 text-text-muted" size={14} />
            <input
              className="h-8 w-full rounded-lg border border-border-light bg-bg-soft pl-8 pr-3 text-xs text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Buscar producto o SKU..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <HelpTip
            title="Productos"
            text="Pulsa un producto para añadirlo al carrito. Usa los botones rápidos para cantidades predefinidas. Los botones en gramos añaden por peso, los de CR por importe."
            size={13}
            side="bottom"
            variant="info"
          />
          <span className="shrink-0 text-[11px] text-text-muted">{filteredProducts.length}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                stockFilter === filter.value
                  ? 'bg-brand-primary text-white'
                  : 'bg-bg-soft text-text-secondary hover:bg-brand-lighter hover:text-brand-primary'
              }`}
              onClick={() => setStockFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-2">
        {error ? (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        ) : null}

        <div className="grid gap-2 overflow-visible sm:grid-cols-2 xl:max-h-[calc(100dvh-14rem)] xl:overflow-y-auto xl:pr-1 2xl:grid-cols-3">
          {loading ? (
            <p className="col-span-full py-6 text-center text-sm text-text-muted">Cargando productos...</p>
          ) : null}

          {!loading && filteredProducts.length === 0 ? (
            <div className="col-span-full py-4">
              <EmptyState title="No hay productos disponibles" />
            </div>
          ) : null}

          {filteredProducts.map((product) => {
            const stock = getProductStock(product);
            const inCart = getCartQuantity(product.id);
            const available = stock - inCart;
            const canAdd = product.status === 'ACTIVE' && available > 0;
            const low = isLowStock(product);
            const stockLabel = available <= 0 ? 'Sin stock' : low ? 'Stock bajo' : 'Disponible';
            const stockVariant = available <= 0 ? 'danger' : low ? 'warning' : 'success';
            const kg = isKgProduct(product.unitType);
            const weightQuickActions = [
              { label: '+0,5 g', input: { quantityGrams: 0.5, pricingMode: 'BY_WEIGHT' as const } },
              { label: '+1 g', input: { quantityGrams: 1, pricingMode: 'BY_WEIGHT' as const } },
              { label: '+5 g', input: { quantityGrams: 5, pricingMode: 'BY_WEIGHT' as const } },
              { label: '+5 CR', input: { amountEuros: 5, pricingMode: 'BY_AMOUNT' as const } },
              { label: '+10 CR', input: { amountEuros: 10, pricingMode: 'BY_AMOUNT' as const } },
              { label: '+20 CR', input: { amountEuros: 20, pricingMode: 'BY_AMOUNT' as const } },
            ];

            return (
              <div
                key={product.id}
                className={`group overflow-hidden rounded-xl border transition-all duration-200 ${
                  canAdd
                    ? 'border-border-light bg-white hover:border-brand-primary/40 hover:shadow-md'
                    : 'cursor-not-allowed border-border-light bg-slate-50/50 opacity-50'
                } ${inCart > 0 ? 'ring-2 ring-brand-primary/20 border-brand-primary/30' : ''}`}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  disabled={!canAdd}
                  onClick={() => onAddProduct(product, kg ? { quantityGrams: 1, pricingMode: 'BY_WEIGHT' } : 1)}
                >
                  {/* Image — compact */}
                  <div className="relative h-14 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 sm:h-16">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-300">
                        <ShoppingBasket size={22} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute right-1.5 top-1.5">
                      <Badge variant={stockVariant} size="sm">{stockLabel}</Badge>
                    </div>
                    {inCart > 0 ? (
                      <div className="absolute left-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
                        {kg ? `${(inCart * 1000).toFixed(1)}g` : inCart}
                      </div>
                    ) : null}
                  </div>

                  {/* Info — compact */}
                  <div className="px-2.5 pb-1.5 pt-2">
                    <h4 className="line-clamp-1 text-[13px] font-semibold text-text-primary">{product.name}</h4>
                    <p className="truncate text-[10px] text-text-muted">
                      {product.sku ?? 'Sin SKU'} · {product.unitType ?? 'unidad'} · Stock: {kg ? formatWeightKg(available) : available}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-base font-bold text-brand-primary">
                        {kg ? formatPricePerGram(product.price) : formatCurrency(product.price)}
                      </span>
                      {canAdd ? (
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-primary text-white transition-transform group-hover:scale-110">
                          <Plus size={14} />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>

                {/* Quick actions — compact */}
                <div className="grid grid-cols-3 gap-1 border-t border-border-light bg-slate-50/50 p-1">
                  {kg ? (
                    <>
                      <button
                        type="button"
                        className="col-span-3 h-7 rounded-md bg-brand-primary text-[11px] font-semibold text-white transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                        disabled={!canAdd}
                        onClick={() => setManualProduct(product)}
                      >
                        Manual
                      </button>
                      {weightQuickActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className="h-7 rounded-md border border-border-light bg-white text-[11px] font-medium text-text-primary transition hover:bg-brand-lighter disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!canAdd}
                          onClick={() => onAddProduct(product, action.input)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-md bg-brand-primary text-[11px] font-semibold text-white transition hover:bg-brand-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                        disabled={!canAdd}
                        onClick={() => onAddProduct(product, 1)}
                      >
                        <Plus size={12} className="mr-0.5" /> 1
                      </button>
                      <button
                        type="button"
                        className="h-7 rounded-md border border-border-light bg-white text-[11px] font-medium text-text-primary transition hover:bg-brand-lighter disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!canAdd}
                        onClick={() => onAddProduct(product, 2)}
                      >
                        +2
                      </button>
                      <button
                        type="button"
                        className="h-7 rounded-md border border-border-light bg-white text-[11px] font-medium text-text-primary transition hover:bg-brand-lighter disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!canAdd}
                        onClick={() => onAddProduct(product, 5)}
                      >
                        +5 CR
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <WeightSaleModal
        product={manualProduct}
        open={Boolean(manualProduct)}
        onClose={() => setManualProduct(null)}
        onAdd={onAddProduct}
      />
    </Card>
  );
}
