import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Loader2, Mail, Pencil, Phone, Shield, UserCog, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUserPermissions, useUpdateUserPermission } from '@/hooks/useUserPermissions';
import type { Employee, UserPermission } from '@/lib/types';
import {
  formatEmployeeDate,
  formatEmployeeDateTime,
  getInitials,
  roleLabel,
  statusLabel,
} from './employee-utils';

type EmployeeDetailDrawerProps = {
  employee: Employee | null;
  isCurrentUser: boolean;
  canUpdate: boolean;
  canDisable: boolean;
  canUpdateRole: boolean;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
  onChangeRole: (employee: Employee) => void;
  onDisable: (employee: Employee) => void;
};

export const permissionAreas = [
  ['Socios', 'members.*'],
  ['Punto de dispensación', 'pos.*'],
  ['Caja', 'cash.*'],
  ['Inventario', 'stock.*'],
  ['Productos', 'products.*'],
  ['Auditoría', 'audit.*'],
  ['Seguridad', 'security.*'],
  ['Configuración', 'settings.*'],
  ['Cuentas pendientes', 'credit.*'],
  ['Aportaciones a terceros', 'third_party_payment.*'],
] as const;

export function EmployeeDetailDrawer({
  employee,
  isCurrentUser,
  canUpdate,
  canDisable,
  canUpdateRole,
  onClose,
  onEdit,
  onChangeRole,
  onDisable,
}: EmployeeDetailDrawerProps) {
  const canManageRole = Boolean(
    employee && canUpdateRole && !isCurrentUser && !['OWNER', 'SUPERADMIN'].includes(employee.role),
  );
  const canDeactivate = Boolean(employee && canDisable && !isCurrentUser && employee.status === 'ACTIVE');

  return (
    <Sheet open={Boolean(employee)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-white sm:max-w-xl">
        <SheetHeader className="border-b border-border-light p-6">
          <SheetTitle className="text-xl font-semibold text-text-primary">Detalle de colaborador</SheetTitle>
          <SheetDescription>Perfil, acceso y contexto operativo del colaborador.</SheetDescription>
        </SheetHeader>

        {employee ? (
          <div className="space-y-5 p-6">
            <section className="rounded-xl border border-border-light bg-white p-4 shadow-card">
              <div className="flex items-start gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-lighter text-lg font-semibold text-brand-primary">
                  {employee.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={employee.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(employee.name)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary">{employee.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="primary">{roleLabel(employee.role)}</Badge>
                    <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {statusLabel(employee.status)}
                    </Badge>
                    {isCurrentUser ? <Badge variant="outline">Tu cuenta</Badge> : null}
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-text-muted"><Mail size={14} />Email</dt>
                  <dd className="truncate text-text-primary">{employee.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-text-muted"><Phone size={14} />Teléfono</dt>
                  <dd className="text-text-primary">{employee.phone || 'Sin teléfono'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-text-muted"><CalendarDays size={14} />Fecha de alta</dt>
                  <dd className="text-text-primary">{formatEmployeeDate(employee.createdAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-2 text-text-muted"><Shield size={14} />Último acceso</dt>
                  <dd className="text-text-primary">{formatEmployeeDateTime(employee.lastLoginAt)}</dd>
                </div>
              </dl>
            </section>

            <PermissionsSection employee={employee} canUpdateRole={canUpdateRole} />

            <section className="rounded-xl border border-border-light bg-white p-4">
              <h4 className="font-semibold text-text-primary">Actividad del colaborador</h4>
              <p className="mt-2 text-sm text-text-muted">Actividad disponible desde Auditoría.</p>
            </section>
          </div>
        ) : null}

        {employee ? (
          <SheetFooter className="border-t border-border-light p-6">
            <div className="flex flex-wrap gap-2">
              {canUpdate ? (
                <Button variant="secondary" onClick={() => onEdit(employee)}>
                  <Pencil size={14} />
                  Editar
                </Button>
              ) : null}
              {canManageRole ? (
                <Button variant="outline" onClick={() => onChangeRole(employee)}>
                  <UserCog size={14} />
                  Cambiar rol
                </Button>
              ) : null}
              {canDeactivate ? (
                <Button variant="danger" onClick={() => onDisable(employee)}>
                  <UserX size={14} />
                  Desactivar
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

const moduleLabels: Record<string, string> = {
  members: 'Socios',
  pos: 'Dispensacion',
  cash: 'Caja',
  stock: 'Inventario',
  products: 'Productos',
  audit: 'Auditoria',
  security: 'Seguridad',
  settings: 'Configuracion',
  credit: 'Cuentas pendientes',
  third_party_payment: 'Aportaciones a terceros',
  chat: 'Chat',
  notifications: 'Notificaciones',
  reports: 'Analitica',
  users: 'Colaboradores',
  dashboard: 'Dashboard',
  emergency: 'Emergencias',
  member_incidents: 'Incidencias',
};

function PermissionsSection({ employee, canUpdateRole }: { employee: Employee; canUpdateRole: boolean }) {
  const permsQuery = useUserPermissions(employee.tenantUserId);
  const updatePerm = useUpdateUserPermission();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const grouped = (permsQuery.data ?? []).reduce<Record<string, UserPermission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  const modules = Object.keys(grouped).sort();

  function handleToggle(perm: UserPermission) {
    let nextAllowed: boolean | null;
    if (perm.override === null) {
      nextAllowed = !perm.roleDefault;
    } else {
      nextAllowed = null;
    }
    updatePerm.mutate(
      { tenantUserId: employee.tenantUserId, permissionKey: perm.key, allowed: nextAllowed },
      { onError: () => toast.error('No se pudo actualizar el permiso') },
    );
  }

  return (
    <section className="rounded-xl border border-border-light bg-white p-4">
      <h4 className="font-semibold text-text-primary">Permisos</h4>
      <p className="mt-1 text-sm text-text-muted">
        Rol base: <Badge variant="primary" size="sm">{roleLabel(employee.role)}</Badge>. Haz clic en un permiso para crear un override individual.
      </p>

      {permsQuery.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" /> Cargando permisos...
        </div>
      ) : null}

      {permsQuery.data ? (
        <div className="mt-4 space-y-1">
          {modules.map((mod) => {
            const perms = grouped[mod];
            const open = expandedModule === mod;
            const overrideCount = perms.filter(p => p.override !== null).length;
            return (
              <div key={mod} className="rounded-lg border border-border-light">
                <button
                  type="button"
                  onClick={() => setExpandedModule(open ? null : mod)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-soft"
                >
                  <span className="flex items-center gap-2">
                    {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {moduleLabels[mod] ?? mod}
                    <span className="text-xs text-text-muted">({perms.filter(p => p.effective).length}/{perms.length})</span>
                  </span>
                  {overrideCount > 0 ? <Badge variant="warning" size="sm">{overrideCount} override{overrideCount > 1 ? 's' : ''}</Badge> : null}
                </button>
                {open ? (
                  <div className="border-t border-border-light px-3 py-2 space-y-1">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                          perm.override !== null ? 'bg-amber-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-xs font-mono ${perm.effective ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                            {perm.key}
                          </p>
                          {perm.description ? <p className="text-[11px] text-text-muted truncate">{perm.description}</p> : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {perm.override !== null ? (
                            <Badge variant={perm.override ? 'success' : 'danger'} size="sm">
                              {perm.override ? 'Concedido' : 'Revocado'}
                            </Badge>
                          ) : (
                            <Badge variant={perm.roleDefault ? 'success' : 'outline'} size="sm">
                              {perm.roleDefault ? 'Rol' : 'Sin acceso'}
                            </Badge>
                          )}
                          {canUpdateRole ? (
                            <button
                              type="button"
                              onClick={() => handleToggle(perm)}
                              disabled={updatePerm.isPending}
                              className="rounded px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:bg-bg-soft hover:text-text-primary disabled:opacity-50"
                            >
                              {perm.override !== null ? 'Reset' : perm.roleDefault ? 'Revocar' : 'Conceder'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
