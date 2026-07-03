import { CalendarDays, Eye, Mail, Pencil, Phone, Shield, UserCog, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Employee } from '@/lib/types';
import {
  formatEmployeeDate,
  formatEmployeeDateTime,
  getInitials,
  roleLabel,
  statusLabel,
} from './employee-utils';

type EmployeeCardProps = {
  employee: Employee;
  isCurrentUser: boolean;
  canUpdate: boolean;
  canDisable: boolean;
  canUpdateRole: boolean;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onChangeRole: (employee: Employee) => void;
  onDisable: (employee: Employee) => void;
};

function roleVariant(role: Employee['role']) {
  if (role === 'OWNER') return 'primary';
  if (role === 'MANAGER') return 'warning';
  return 'secondary';
}

function statusVariant(status: Employee['status']) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'BLOCKED') return 'danger';
  return 'warning';
}

export function EmployeeCard({
  employee,
  isCurrentUser,
  canUpdate,
  canDisable,
  canUpdateRole,
  onView,
  onEdit,
  onChangeRole,
  onDisable,
}: EmployeeCardProps) {
  const canManageRole = canUpdateRole && !isCurrentUser && !['OWNER', 'SUPERADMIN'].includes(employee.role);
  const canDeactivate = canDisable && !isCurrentUser && employee.status === 'ACTIVE';

  return (
    <Card className="border border-border-light bg-white p-4 shadow-sm transition hover:border-brand-primary/30 hover:shadow-medium">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-lighter text-sm font-semibold text-brand-primary">
            {employee.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={employee.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(employee.name)
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-text-primary">{employee.name}</h3>
              {isCurrentUser ? <Badge variant="outline">Tú</Badge> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} />
                {employee.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} />
                {employee.phone || 'Sin teléfono'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={roleVariant(employee.role)} size="md">
                <Shield size={12} />
                {roleLabel(employee.role)}
              </Badge>
              <Badge variant={statusVariant(employee.status)} size="md">
                {statusLabel(employee.status)}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-bg-soft px-2.5 py-1 text-xs text-text-secondary">
                <CalendarDays size={12} />
                Alta {formatEmployeeDate(employee.createdAt)}
              </span>
              <span className="rounded-full border border-border-light bg-bg-soft px-2.5 py-1 text-xs text-text-secondary">
                Último acceso {formatEmployeeDateTime(employee.lastLoginAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button variant="outline" size="sm" onClick={() => onView(employee)}>
            <Eye size={14} />
            Ver detalle
          </Button>
          {canUpdate ? (
            <Button variant="secondary" size="sm" onClick={() => onEdit(employee)}>
              <Pencil size={14} />
              Editar
            </Button>
          ) : null}
          {canManageRole ? (
            <Button variant="outline" size="sm" onClick={() => onChangeRole(employee)}>
              <UserCog size={14} />
              Cambiar rol
            </Button>
          ) : null}
          {canDeactivate ? (
            <Button variant="danger" size="sm" onClick={() => onDisable(employee)}>
              <UserX size={14} />
              Desactivar
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

