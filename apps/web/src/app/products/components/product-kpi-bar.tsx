'use client';

import { Archive, Boxes, PackageCheck, TriangleAlert, WalletCards } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/lib/types';
import { getProductStock, getStockStatus, isArchived, toNumber } from './product-utils';

export function ProductKpiBar({
  products,
  canViewCost,
}: {
  products: Product[];
  canViewCost: boolean;
}) {
  const active = products.filter((product) => !isArchived(product));
  const out = active.filter((product) => getProductStock(product) <= 0).length;
  const low = active.filter((product) => getStockStatus(product).tone === 'warning').length;
  const inventoryValue = active.reduce(
    (sum, product) => sum + getProductStock(product) * toNumber(product.cost),
    0,
  );
  const items = [
    { label: 'Total productos', value: products.length, icon: Boxes },
    { label: 'Activos', value: active.length, icon: PackageCheck },
    { label: 'Sin disponibilidad', value: out, icon: Archive },
    { label: 'Inventario bajo', value: low, icon: TriangleAlert },
    ...(canViewCost
      ? [{ label: 'Valor estimado', value: formatCurrency(inventoryValue), icon: WalletCards }]
      : []),
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="rounded-xl border border-border-light bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Icon size={15} />
              {item.label}
            </div>
            <p className="mt-1 text-lg font-bold text-text-primary">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
