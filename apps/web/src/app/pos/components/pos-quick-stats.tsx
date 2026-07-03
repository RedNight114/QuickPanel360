'use client';

import { Banknote, Boxes, Lock, ReceiptText, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import type { PosSession, Product } from '@/lib/types';
import { getProductStock, getSessionMetrics, isLowStock } from './pos-metrics';

type PosQuickStatsProps = {
  session: PosSession | null;
  products: Product[];
};

export function PosQuickStats({ session, products }: PosQuickStatsProps) {
  const metrics = getSessionMetrics(session);
  const lowStockCount = products.filter(isLowStock).length;
  const outOfStockCount = products.filter((product) => getProductStock(product) <= 0).length;

  const items = [
    {
      label: 'Caja',
      value: session ? 'Abierta' : 'Cerrada',
      detail: session ? 'Lista para dispensar' : 'Abre caja para empezar',
      icon: session ? Unlock : Lock,
      tone: session ? 'text-[#15140F] bg-amber-50' : 'text-gray-600 bg-gray-100',
    },
    {
      label: 'Efectivo esperado',
      value: session ? formatCurrency(metrics.expectedCash) : '-',
      detail: metrics.hasPaymentDetails ? 'Según registros de aportación CASH' : 'Estimación de sesión',
      icon: Banknote,
      tone: 'text-[#15140F] bg-amber-50',
    },
    {
      label: 'Dispensaciones sesión',
      value: formatCurrency(metrics.totalSold),
      detail: `${metrics.salesCount} operaciones`,
      icon: ReceiptText,
      tone: 'text-blue-700 bg-blue-50',
    },
    {
      label: 'Stock bajo',
      value: lowStockCount,
      detail: outOfStockCount ? `${outOfStockCount} sin stock` : 'Sin agotados',
      icon: Boxes,
      tone: lowStockCount || outOfStockCount ? 'text-amber-700 bg-amber-50' : 'text-[#15140F] bg-amber-50',
    },
  ];

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.label} className="p-3 shadow-soft">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-text-primary">{item.value}</p>
                <p className="text-[11px] text-text-secondary">{item.detail}</p>
              </div>
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.tone}`}>
                <Icon size={16} />
              </div>
            </div>
            {item.label === 'Caja' ? (
              <Badge className="mt-2" size="sm" variant={session ? 'success' : 'secondary'}>
                {session ? 'Caja abierta' : 'Caja cerrada'}
              </Badge>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
