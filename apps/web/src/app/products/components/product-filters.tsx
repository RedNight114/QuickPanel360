'use client';

import { Search } from 'lucide-react';

export type ProductFilter = 'all' | 'active' | 'archived' | 'out' | 'low';
export type ProductSort = 'recent' | 'name' | 'price' | 'stock';

export function ProductFilters({
  query,
  filter,
  sort,
  onQueryChange,
  onFilterChange,
  onSortChange,
}: {
  query: string;
  filter: ProductFilter;
  sort: ProductSort;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: ProductFilter) => void;
  onSortChange: (value: ProductSort) => void;
}) {
  const filters: Array<{ value: ProductFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'archived', label: 'Archivados' },
    { value: 'out', label: 'Sin disponibilidad' },
    { value: 'low', label: 'Inventario bajo' },
  ];

  return (
    <div className="rounded-xl border border-border-light bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-text-muted" size={16} />
          <input
            className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder="Buscar producto por nombre o SKU"
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
          onChange={(event) => onSortChange(event.target.value as ProductSort)}
        >
          <option value="recent">Orden: Recientes</option>
          <option value="name">Orden: Nombre</option>
          <option value="price">Orden: Valor</option>
          <option value="stock">Orden: Inventario disponible</option>
        </select>
      </div>
    </div>
  );
}
