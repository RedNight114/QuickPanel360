'use client';

import { Search } from 'lucide-react';

export type MemberStatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE';
export type MemberSort = 'recent' | 'name' | 'memberNumber' | 'spent' | 'lastSale';

type MemberFiltersProps = {
  query: string;
  status: MemberStatusFilter;
  sort: MemberSort;
  canSortFinancial: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: MemberStatusFilter) => void;
  onSortChange: (value: MemberSort) => void;
};

const statusOptions: Array<{ value: MemberStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'SUSPENDED', label: 'Suspendidos' },
  { value: 'BANNED', label: 'Vetados' },
  { value: 'INACTIVE', label: 'Inactivos' },
];

export function MemberFilters({
  query,
  status,
  sort,
  canSortFinancial,
  onQueryChange,
  onStatusChange,
  onSortChange,
}: MemberFiltersProps) {
  const sortOptions: Array<{ value: MemberSort; label: string; financial?: boolean }> = [
    { value: 'recent', label: 'Recientes' },
    { value: 'name', label: 'Nombre' },
    { value: 'memberNumber', label: 'Nº socio' },
    { value: 'spent', label: 'Mayor aportación', financial: true },
    { value: 'lastSale', label: 'Última dispensación', financial: true },
  ];

  return (
    <div className="rounded-xl border border-border-light bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-text-muted" size={16} />
          <input
            className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder="Buscar por nombre, número, teléfono o email"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                status === option.value
                  ? 'border-brand-primary bg-brand-lighter text-brand-primary'
                  : 'border-border-light bg-white text-text-secondary hover:border-brand-primary/40'
              }`}
              onClick={() => onStatusChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <select
          className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as MemberSort)}
        >
          {sortOptions
            .filter((option) => !option.financial || canSortFinancial)
            .map((option) => (
              <option key={option.value} value={option.value}>
                Orden: {option.label}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
