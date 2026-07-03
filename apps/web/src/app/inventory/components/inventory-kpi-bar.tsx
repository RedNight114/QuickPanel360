'use client';

import { Activity, Boxes, PackageCheck, Scale, TriangleAlert, WalletCards } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { InventoryItem, InventoryMovement } from '@/lib/types';
import { getInventoryStatus, toNumber } from './inventory-utils';

export function InventoryKpiBar({
  inventory,
  movements,
  canViewCost,
}: {
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  canViewCost: boolean;
}) {
  const active = inventory.filter((item) => item.product?.status !== 'ARCHIVED');
  const out = active.filter((item) => toNumber(item.currentQuantity) <= 0).length;
  const low = active.filter((item) => getInventoryStatus(item).tone === 'warning').length;
  const units = active.reduce((sum, item) => sum + toNumber(item.currentQuantity), 0);
  const lost = active.reduce((sum, item) => sum + toNumber(item.lostQuantity), 0);
  const today = new Date();
  const movementsToday = movements.filter((movement) => {
    const date = new Date(movement.createdAt);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;
  const value = active.reduce(
    (sum, item) => sum + toNumber(item.currentQuantity) * toNumber(item.product?.cost),
    0,
  );
  const items = [
    { label: 'Productos activos', value: active.length, icon: PackageCheck },
    { label: 'Sin disponibilidad', value: out, icon: Boxes },
    { label: 'Inventario bajo', value: low, icon: TriangleAlert },
    { label: 'Unidades disponibles', value: units.toLocaleString('es-ES'), icon: Boxes },
    { label: 'Merma acumulada', value: lost.toLocaleString('es-ES'), icon: Scale },
    { label: 'Movimientos hoy', value: movementsToday, icon: Activity },
    ...(canViewCost ? [{ label: 'Valor estimado', value: formatCurrency(value), icon: WalletCards }] : []),
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
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
