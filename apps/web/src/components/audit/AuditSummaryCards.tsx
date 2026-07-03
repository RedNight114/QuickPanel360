'use client';

import { AlertTriangle, Boxes, ReceiptText, ShieldCheck } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { isCriticalAuditLog } from '@/lib/audit-formatter';
import type { AuditLog } from '@/lib/types';

export function AuditSummaryCards({ logs }: { logs: AuditLog[] }) {
  const sales = logs.filter((log) =>
    ['sale.created', 'sale.updated', 'sale.cancelled', 'sale.cash_created', 'sale.credit_created'].includes(log.action),
  ).length;
  const stock = logs.filter((log) => log.action.startsWith('stock.')).length;
  const critical = logs.filter(isCriticalAuditLog).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Eventos cargados"
        value={logs.length}
        description="Actividad reciente"
        icon={<ShieldCheck size={20} />}
        tone="green"
      />
      <StatCard
        title="Dispensaciones auditadas"
        value={sales}
        description="Operaciones de Punto de dispensación"
        icon={<ReceiptText size={20} />}
        tone="blue"
      />
      <StatCard
        title="Cambios de inventario"
        value={stock}
        description="Entradas, ajustes y dispensaciones"
        icon={<Boxes size={20} />}
        tone="amber"
      />
      <StatCard
        title="Acciones críticas"
        value={critical}
        description="Requieren atención"
        icon={<AlertTriangle size={20} />}
        tone={critical ? 'red' : 'neutral'}
      />
    </div>
  );
}
