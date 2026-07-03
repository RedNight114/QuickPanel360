'use client';

import { Eye, Package, PackageSearch, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types';
import { quantityLabel } from '../../inventory/components/inventory-utils';
import { getStockStatus, isArchived, toNumber } from './product-utils';

type ProductCardProps = {
  product: Product;
  canViewCost: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  canAddStock: boolean;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onAddStock: (product: Product) => void;
  onViewMovements?: (product: Product) => void;
};

function ProductPlaceholder({ unitType }: { unitType?: string | null }) {
  const isWeight = unitType === 'KG' || unitType === 'GRAM';
  return (
    <div className={`grid h-full place-items-center gap-1 ${isWeight ? 'bg-amber-50' : 'bg-sky-50'}`}>
      {isWeight ? (
        <Scale size={28} className="text-green-500" />
      ) : (
        <PackageSearch size={28} className="text-sky-400" />
      )}
      <span className="text-[10px] font-medium text-text-muted">
        {isWeight ? 'Granel / peso' : 'Por unidad'}
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  canViewCost,
  canUpdate,
  canArchive,
  canAddStock,
  onEdit,
  onArchive,
  onAddStock,
  onViewMovements,
}: ProductCardProps) {
  const stockStatus = getStockStatus(product);
  const archived = isArchived(product);
  const margin = toNumber(product.price) - toNumber(product.cost);
  const stockDisplay = quantityLabel(product.inventory?.currentQuantity, product.unitType);

  return (
    <Card className="overflow-hidden border border-border-light bg-white p-0 shadow-sm transition hover:border-brand-primary/40 hover:shadow-card">
      <div className="relative h-28">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ProductPlaceholder unitType={product.unitType} />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <Badge variant={stockStatus.tone}>{stockStatus.label}</Badge>
          {archived ? <Badge variant="secondary">Archivado</Badge> : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-text-primary">{product.name}</h3>
          <p className="mt-1 text-xs text-text-muted">
            {product.sku ?? 'Sin SKU'} · {product.unitType ?? 'UNIT'}
          </p>
          {(product.minimumStock != null || product.inventory?.minimumQuantity != null) ? (
            <p className="mt-0.5 text-xs text-text-muted">
              Min. {quantityLabel(product.minimumStock ?? product.inventory?.minimumQuantity, product.unitType)}
              {product.idealStock != null ? ` · Ideal ${quantityLabel(product.idealStock, product.unitType)}` : ''}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-border-light bg-bg-soft p-2">
            <p className="text-xs text-text-muted">Valor</p>
            <p className="font-semibold text-brand-primary">{formatCurrency(product.price)}</p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-2">
            <p className="text-xs text-text-muted">Inventario disponible</p>
            <p className="font-semibold text-text-primary">{stockDisplay}</p>
          </div>
          {canViewCost ? (
            <>
              <div className="rounded-lg border border-border-light bg-bg-soft p-2">
                <p className="text-xs text-text-muted">Coste interno</p>
                <p className="font-semibold text-text-primary">
                  {product.cost == null ? '-' : formatCurrency(product.cost)}
                </p>
              </div>
              <div className="rounded-lg border border-border-light bg-bg-soft p-2">
                <p className="text-xs text-text-muted">Margen</p>
                <p className="font-semibold text-[#15140F]">
                  {product.cost == null ? '-' : formatCurrency(margin)}
                </p>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {canUpdate ? (
            <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
              Editar
            </Button>
          ) : null}
          {canAddStock ? (
            <Button size="sm" variant="secondary" onClick={() => onAddStock(product)}>
              <Package size={14} />
              Anadir inventario
            </Button>
          ) : null}
          {onViewMovements ? (
            <Button size="sm" variant="outline" onClick={() => onViewMovements(product)}>
              <Eye size={14} />
              Movimientos
            </Button>
          ) : null}
          {canArchive && !archived ? (
            <Button size="sm" variant="danger" onClick={() => onArchive(product)}>
              Archivar
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
