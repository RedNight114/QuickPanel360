import { Search } from 'lucide-react';
import type { EmployeeRoleFilter, EmployeeSort, EmployeeStatusFilter } from './employee-utils';

type EmployeeFiltersProps = {
  query: string;
  role: EmployeeRoleFilter;
  status: EmployeeStatusFilter;
  sort: EmployeeSort;
  onQueryChange: (value: string) => void;
  onRoleChange: (value: EmployeeRoleFilter) => void;
  onStatusChange: (value: EmployeeStatusFilter) => void;
  onSortChange: (value: EmployeeSort) => void;
};

export function EmployeeFilters({
  query,
  role,
  status,
  sort,
  onQueryChange,
  onRoleChange,
  onStatusChange,
  onSortChange,
}: EmployeeFiltersProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-border-light bg-white p-3 shadow-soft lg:grid-cols-[minmax(220px,1fr)_170px_180px_170px]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        <input
          className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          placeholder="Buscar por nombre, email o teléfono"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <select
        className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        value={role}
        onChange={(event) => onRoleChange(event.target.value as EmployeeRoleFilter)}
      >
        <option value="all">Todos los roles</option>
        <option value="OWNER">Owner</option>
        <option value="MANAGER">Manager</option>
        <option value="EMPLOYEE">Colaborador</option>
      </select>
      <select
        className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        value={status}
        onChange={(event) => onStatusChange(event.target.value as EmployeeStatusFilter)}
      >
        <option value="all">Todos los estados</option>
        <option value="ACTIVE">Activos</option>
        <option value="INACTIVE">Inactivos</option>
        <option value="BLOCKED">Bloqueados</option>
      </select>
      <select
        className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        value={sort}
        onChange={(event) => onSortChange(event.target.value as EmployeeSort)}
      >
        <option value="recent">Recientes</option>
        <option value="name">Nombre</option>
        <option value="role">Rol</option>
        <option value="lastLogin">Último acceso</option>
      </select>
    </div>
  );
}

