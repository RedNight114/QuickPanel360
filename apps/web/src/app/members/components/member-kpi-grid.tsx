'use client';

import { CalendarClock, CreditCard, ReceiptText, WalletCards } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import type { MemberSummary } from '@/lib/types';

export function MemberKpiGrid({ summary }: { summary?: MemberSummary | null }) {
  const items = [
    {
      label: 'Total aportado',
      value: formatCurrency(summary?.totalSpent ?? 0),
      icon: WalletCards,
    },
    {
      label: 'Dispensaciones',
      value: String(summary?.salesCount ?? 0),
      icon: ReceiptText,
    },
    {
      label: 'Media por dispensación',
      value: formatCurrency(summary?.averageTicket ?? 0),
      icon: CreditCard,
    },
    {
      label: 'Última dispensación',
      value: summary?.lastSaleAt ? formatDate(summary.lastSaleAt) : 'Sin dispensaciones',
      icon: CalendarClock,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-lg border border-border-light bg-bg-soft p-3"
          >
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Icon size={14} />
              {item.label}
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-text-primary">
              {item.value}
            </p>
          </div>
        );
      })}
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 sm:col-span-2">
        <p className="text-xs text-amber-800">Pendiente de aportación</p>
        <p className="mt-1 text-base font-bold text-amber-900">
          {formatCurrency(summary?.pendingAmount ?? 0)}
        </p>
      </div>
    </div>
  );
}
