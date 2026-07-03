import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const accentBar = {
  green: 'bg-gradient-to-b from-yellow-400 to-yellow-600',
  blue: 'bg-gradient-to-b from-blue-500 to-blue-700',
  amber: 'bg-gradient-to-b from-amber-400 to-amber-600',
  red: 'bg-gradient-to-b from-red-500 to-red-700',
  neutral: 'bg-gradient-to-b from-slate-300 to-slate-400',
};

const iconBg = {
  green: 'bg-yellow-50 text-yellow-700',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  neutral: 'bg-slate-50 text-slate-500',
};

export function StatCard({
  title,
  value,
  description,
  icon,
  tone = 'neutral',
}: {
  title: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  tone?: keyof typeof accentBar;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border-light bg-white shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-border-strong/30">
      <div className={cn('absolute left-0 top-0 h-full w-1 rounded-l-xl', accentBar[tone])} />
      <div className="flex items-start justify-between gap-3 p-4 pl-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{title}</p>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-text-primary">{value}</div>
          {description ? <p className="mt-1 text-[11px] text-text-muted">{description}</p> : null}
        </div>
        {icon ? <div className={cn('shrink-0 rounded-xl p-2.5', iconBg[tone])} aria-hidden="true">{icon}</div> : null}
      </div>
    </div>
  );
}
