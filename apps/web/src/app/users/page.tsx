'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { Employee } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { EmployeeCard } from './components/employee-card';
import { EmployeeDetailDrawer } from './components/employee-detail-drawer';
import { EmployeeFilters } from './components/employee-filters';
import {
  EmployeeFormModal,
  employeeToForm,
  emptyEmployeeForm,
  type EmployeeFormValue,
} from './components/employee-form-modal';
import { EmployeeKpiGrid } from './components/employee-kpi-grid';
import { EmployeeRoleModal } from './components/employee-role-modal';
import {
  sortEmployees,
  type EmployeeRoleFilter,
  type EmployeeSort,
  type EmployeeStatusFilter,
  type ManageableRole,
} from './components/employee-utils';
function toOptional(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}



export default function UsersPage() {
  const { hasPermission, hasRole, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>('all');
  const [sort, setSort] = useState<EmployeeSort>('recent');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formInitialValue, setFormInitialValue] = useState<EmployeeFormValue>(emptyEmployeeForm);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [roleEmployee, setRoleEmployee] = useState<Employee | null>(null);
  const [disableEmployee, setDisableEmployee] = useState<Employee | null>(null);

  const isOwner = hasRole('OWNER');
  const canRead = isOwner || hasPermission('users.read');
  const canCreate = isOwner || hasPermission('users.create');
  const canUpdate = isOwner || hasPermission('users.update');
  const canDisable = isOwner || hasPermission('users.disable');
  const canUpdateRole = isOwner || hasPermission('users.permissions.update');

  const loadEmployees = useCallback(async () => {
    if (!canRead) {
      setEmployees([]);
      setError('No tienes permiso para ver esta sección.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setEmployees(await apiFetch<Employee[]>('/users'));
    } catch (err) {
      setEmployees([]);
      setError(getErrorMessage(err, 'No se pudieron cargar los colaboradores.'));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const visibleEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = employees.filter((employee) => {
      if (roleFilter !== 'all' && employee.role !== roleFilter) return false;
      if (statusFilter !== 'all' && employee.status !== statusFilter) return false;

      if (!normalized) return true;

      return [employee.name, employee.email, employee.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });

    return sortEmployees(filtered, sort);
  }, [employees, query, roleFilter, sort, statusFilter]);

  function openCreateModal() {
    setFormMode('create');
    setEditingEmployee(null);
    setFormInitialValue(emptyEmployeeForm);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditModal(employee: Employee) {
    setFormMode('edit');
    setEditingEmployee(employee);
    setFormInitialValue(employeeToForm(employee));
    setFormError(null);
    setFormOpen(true);
  }

  function openRoleModal(employee: Employee) {
    setRoleEmployee(employee);
    setRoleError(null);
  }

  async function submitEmployee(form: EmployeeFormValue) {
    setSaving(true);
    setFormError(null);

    try {
      if (formMode === 'edit' && editingEmployee) {
        await apiFetch<Employee>(`/users/${editingEmployee.tenantUserId}`, {
          method: 'PATCH',
          body: {
            name: form.name.trim(),
            phone: toOptional(form.phone),
            avatarUrl: toOptional(form.avatarUrl),
            status: form.status,
          },
        });
        toast.success('Colaborador actualizado');
      } else {
        await apiFetch<Employee>('/users/employees', {
          method: 'POST',
          body: {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            phone: toOptional(form.phone),
            role: form.role,
          },
        });
        toast.success('Colaborador creado correctamente');
      }

      setFormOpen(false);
      setEditingEmployee(null);
      await loadEmployees();
    } catch (err) {
      setFormError(getErrorMessage(err, 'No se pudo guardar el colaborador.'));
    } finally {
      setSaving(false);
    }
  }

  async function submitRole(role: ManageableRole) {
    if (!roleEmployee) return;

    if (roleEmployee.userId === user?.id) {
      setRoleError('No puedes cambiar tu propio rol.');
      return;
    }

    setSaving(true);
    setRoleError(null);

    try {
      await apiFetch<Employee>(`/users/${roleEmployee.tenantUserId}/role`, {
        method: 'PATCH',
        body: { role },
      });
      toast.success('Rol actualizado correctamente');
      setRoleEmployee(null);
      await loadEmployees();
    } catch (err) {
      setRoleError(getErrorMessage(err, 'No se pudo cambiar el rol.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisableEmployee() {
    if (!disableEmployee) return;

    if (disableEmployee.userId === user?.id) {
      toast.error('No puedes desactivar tu propia cuenta.');
      setDisableEmployee(null);
      return;
    }

    setSaving(true);

    try {
      await apiFetch<Employee>(`/users/${disableEmployee.tenantUserId}/disable`, {
        method: 'PATCH',
      });
      toast.success('Colaborador desactivado');
      setDisableEmployee(null);
      if (detailEmployee?.tenantUserId === disableEmployee.tenantUserId) {
        setDetailEmployee(null);
      }
      await loadEmployees();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo desactivar el colaborador.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-primary">Equipo</p>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">Colaboradores</h1>
            <p className="mt-1 text-sm text-text-muted">
              Gestión de colaboradores, roles y accesos del club.
            </p>
          </div>
          {canCreate ? (
            <Button size="md" onClick={openCreateModal}>
              <Plus size={16} />
              Nuevo colaborador
            </Button>
          ) : null}
        </header>

        {!canRead ? (
          <Card className="border border-amber-200 bg-amber-50 p-5 text-amber-800">
            <div className="flex gap-3">
              <ShieldAlert size={20} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold">No tienes acceso a Gestión de colaboradores</h2>
                <p className="mt-1 text-sm">
                  Esta sección requiere el permiso users.read. Si necesitas acceso, solicita un cambio de rol al owner.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <EmployeeKpiGrid employees={employees} />
            <EmployeeFilters
              query={query}
              role={roleFilter}
              status={statusFilter}
              sort={sort}
              onQueryChange={setQuery}
              onRoleChange={setRoleFilter}
              onStatusChange={setStatusFilter}
              onSortChange={setSort}
            />

            {error ? (
              <ErrorState
                message={error}
                onRetry={loadEmployees}
              />
            ) : null}

            <section className="space-y-3">
              {loading ? <ListSkeleton rows={4} /> : null}
              {!loading && !error && visibleEmployees.length === 0 ? (
                <EmptyState
                  title="No hay colaboradores para mostrar"
                  text="Prueba con otro filtro o crea el primer colaborador."
                />
              ) : null}
              {visibleEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.tenantUserId}
                  employee={employee}
                  isCurrentUser={employee.userId === user?.id}
                  canUpdate={canUpdate}
                  canDisable={canDisable}
                  canUpdateRole={canUpdateRole}
                  onView={setDetailEmployee}
                  onEdit={openEditModal}
                  onChangeRole={openRoleModal}
                  onDisable={setDisableEmployee}
                />
              ))}
            </section>
          </>
        )}
      </div>

      <EmployeeFormModal
        open={formOpen}
        mode={formMode}
        initialValue={formInitialValue}
        saving={saving}
        error={formError}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={submitEmployee}
      />

      <EmployeeRoleModal
        employee={roleEmployee}
        saving={saving}
        error={roleError}
        onClose={() => setRoleEmployee(null)}
        onSubmit={submitRole}
      />

      <EmployeeDetailDrawer
        employee={detailEmployee}
        isCurrentUser={detailEmployee?.userId === user?.id}
        canUpdate={canUpdate}
        canDisable={canDisable}
        canUpdateRole={canUpdateRole}
        onClose={() => setDetailEmployee(null)}
        onEdit={(employee) => {
          setDetailEmployee(null);
          openEditModal(employee);
        }}
        onChangeRole={(employee) => {
          setDetailEmployee(null);
          openRoleModal(employee);
        }}
        onDisable={setDisableEmployee}
      />

      <Modal
        open={Boolean(disableEmployee)}
        onClose={() => setDisableEmployee(null)}
        title="Desactivar colaborador"
        description="Este colaborador perderá el acceso al club. Sus acciones anteriores seguirán registradas."
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setDisableEmployee(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDisableEmployee} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Desactivando...' : 'Desactivar'}
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          El acceso se bloqueará, pero el historial del colaborador se conservará.
        </div>
      </Modal>
    </ProtectedLayout>
  );
}


