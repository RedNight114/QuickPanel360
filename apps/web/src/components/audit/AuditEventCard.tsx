'use client';

import { useState } from 'react';
import {
  Activity,
  Archive,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  Package,
  Scale,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatAuditLog, type AuditTone } from '@/lib/audit-formatter';
import type { AuditLog } from '@/lib/types';

const iconBg: Record<AuditTone, string> = {
  success: 'bg-yellow-50 text-yellow-700',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-600',
  neutral: 'bg-slate-100 text-slate-500',
};

const badgeVariants: Record<AuditTone, 'success' | 'warning' | 'danger' | 'primary' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'primary',
  neutral: 'secondary',
};

const icons = {
  activity: Activity,
  cash: CircleDollarSign,
  emergency: CircleAlert,
  member: Users,
  product: Package,
  sale: Scale,
  security: ShieldCheck,
  stock: Package,
  user: UserCog,
  archive: Archive,
  settings: Settings,
  shield: ShieldCheck,
};

export function AuditEventCard({ log }: { log: AuditLog }) {
  const formatted = formatAuditLog(log);
  const Icon = icons[formatted.icon as keyof typeof icons] ?? Activity;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border-light bg-white transition hover:shadow-card">
      <div className="flex items-start gap-3 p-4">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconBg[formatted.tone]}`}>
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{formatted.title}</h3>
            <Badge variant={badgeVariants[formatted.tone]} size="sm">{formatted.category}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">{formatted.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
            <span>{formatted.dateLabel}</span>
            <span>·</span>
            <span>{formatted.actor}</span>
          </div>
        </div>

        {formatted.details.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-bg-soft hover:text-text-primary"
            aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'}
          >
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>

      {expanded && formatted.details.length > 0 ? (
        <div className="border-t border-border-light px-4 py-3">
          <div className="grid gap-1.5 text-xs sm:grid-cols-2">
            {formatted.details.map((detail, i) => {
              const [label, ...rest] = detail.split(': ');
              const value = rest.join(': ');
              if (!value) {
                return <p key={i} className="text-text-secondary sm:col-span-2">{detail}</p>;
              }
              return (
                <div key={i} className="flex items-baseline gap-1">
                  <span className="text-text-muted">{label}:</span>
                  <span className="font-medium text-text-primary">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
