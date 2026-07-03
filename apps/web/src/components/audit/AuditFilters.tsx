'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';

export type AuditCategoryFilter =
  | 'all'
  | 'sales'
  | 'cash'
  | 'stock'
  | 'members'
  | 'products'
  | 'users'
  | 'thirdParties'
  | 'security'
  | 'settings'
  | 'emergency';

export type AuditFilterState = {
  category: AuditCategoryFilter;
  user: string;
  entity: string;
  take: string;
};

export const auditCategoryActions: Record<AuditCategoryFilter, string[]> = {
  all: [],
  sales: [
    'sale.created',
    'sale.updated',
    'sale.cancelled',
    'sale.cash_created',
    'sale.credit_created',
    'receivable.created',
    'receivable.payment_received',
    'payment.created',
    'receivable.cancelled',
    'member.sale_created',
    'discount.applied',
    'stock.sold',
  ],
  cash: ['cash.opened', 'cash.closed', 'cash.movement_created', 'cash.manual_movement_created', 'cash.sale_in'],
  stock: ['stock.added', 'stock.adjusted', 'stock.sold'],
  members: ['member.created', 'member.updated', 'member.status_updated', 'member.sale_created'],
  products: ['product.created', 'product.updated', 'product.archived'],
  users: ['user.created', 'user.updated', 'user.role_updated', 'user.disabled', 'employee.created', 'employee.updated', 'employee.deleted'],
  thirdParties: [
    'third_party.created',
    'third_party.updated',
    'third_party.archived',
    'third_party_payment.created',
    'third_party_payment.cancelled',
  ],
  security: ['access_link.regenerated', 'access_link.used'],
  settings: ['settings.updated'],
  emergency: ['emergency.activated', 'emergency.deactivated', 'emergency.deactivated_by_platform'],
};

const categoryOptions: Array<{ value: AuditCategoryFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'sales', label: 'Dispensaciones' },
  { value: 'cash', label: 'Caja' },
  { value: 'stock', label: 'Inventario' },
  { value: 'members', label: 'Socios' },
  { value: 'products', label: 'Productos' },
  { value: 'users', label: 'Colaboradores' },
  { value: 'thirdParties', label: 'Aportaciones a terceros' },
  { value: 'security', label: 'Seguridad' },
  { value: 'settings', label: 'Configuración' },
  { value: 'emergency', label: 'Emergencia' },
];

type AuditFiltersProps = {
  filters: AuditFilterState;
  loading: boolean;
  onChange: (filters: AuditFilterState) => void;
  onRefresh: () => void;
  onClear: () => void;
};

export function AuditFilters({
  filters,
  loading,
  onChange,
  onRefresh,
  onClear,
}: AuditFiltersProps) {
  return (
    <Card className="h-fit xl:sticky xl:top-6">
      <h3 className="text-lg font-semibold text-text-primary">Filtros</h3>
      <p className="mt-1 text-sm text-text-muted">
        Localiza eventos por tipo, usuario o entidad afectada.
      </p>

      <div className="mt-5 space-y-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-text-primary">Tipo de actividad</span>
          <select
            className="h-11 rounded-xl border border-border-light bg-white px-3 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value as AuditCategoryFilter })
            }
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Usuario"
          value={filters.user}
          onChange={(event) => onChange({ ...filters, user: event.target.value })}
          placeholder="Nombre, email o ID"
        />

        <Field
          label="Entidad"
          value={filters.entity}
          onChange={(event) => onChange({ ...filters, entity: event.target.value })}
          placeholder="Producto, socio, dispensación o ID"
        />

        <Field
          label="Límite"
          type="number"
          min="1"
          max="200"
          value={filters.take}
          onChange={(event) => onChange({ ...filters, take: event.target.value })}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClear}>
            Limpiar
          </Button>
        </div>
      </div>
    </Card>
  );
}
