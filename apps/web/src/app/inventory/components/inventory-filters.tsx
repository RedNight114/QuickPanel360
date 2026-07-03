'use client';

import { Search } from 'lucide-react';

export type InventoryFilter = 'all' | 'available' | 'out' | 'low' | 'waste';
export type InventorySort = 'name' | 'stockAsc' | 'stockDesc' | 'lastMovement';

export function InventoryFilters({
  query,
  filter,
  sort,
  onQueryChange,
  onFilterChange,
  onSortChange,
}: {
  query: string;
  filter: InventoryFilter;
  sort: InventorySort;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: InventoryFilter) => void;
  onSortChange: (value: InventorySort) => void;
}) {
  const filters: Array<{ value: InventoryFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'available', label: 'Con disponibilidad' },
    { value: 'out', label: 'Sin disponibilidad' },
    { value: 'low', label: 'Inventario bajo' },
    { value: 'waste', label: 'Con merma' },
  ];

  return (
    <div className="rounded-xl border border-border-light bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-text-muted" size={16} />
          <input
            className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder="Buscar por producto o SKU"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filter === item.value
                  ? 'border-brand-primary bg-brand-lighter text-brand-primary'
                  : 'border-border-light bg-white text-text-secondary hover:border-brand-primary/40'
              }`}
              onClick={() => onFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as InventorySort)}
        >
          <option value="name">Orden: Nombre</option>
          <option value="stockAsc">Orden: Inventario ascendente</option>
          <option value="stockDesc">Orden: Inventario descendente</option>
          <option value="lastMovement">Orden: Último movimiento</option>
        </select>
      </div>
    </div>
  );
}
