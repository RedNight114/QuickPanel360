import { FormEvent, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Employee } from '@/lib/types';
import { manageableRoles, roleLabel, type ManageableRole } from './employee-utils';

type EmployeeRoleModalProps = {
  employee: Employee | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (role: ManageableRole) => void | Promise<void>;
};

export function EmployeeRoleModal({
  employee,
  saving,
  error,
  onClose,
  onSubmit,
}: EmployeeRoleModalProps) {
  const [role, setRole] = useState<ManageableRole>('EMPLOYEE');

  useEffect(() => {
    setRole(employee?.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE');
  }, [employee]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(role);
  }

  return (
    <Modal
      open={Boolean(employee)}
      onClose={onClose}
      title="Cambiar rol"
      description="El cambio de rol modificará los permisos disponibles para este usuario."
      size="sm"
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-role-form" disabled={saving || role === employee?.role}>
            {saving ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
        </>
      }
    >
      <form id="employee-role-form" className="space-y-4" onSubmit={submit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-lg border border-border-light bg-bg-soft p-3">
          <p className="text-sm text-text-muted">Colaborador</p>
          <p className="font-semibold text-text-primary">{employee?.name}</p>
          <p className="mt-1 text-sm text-text-muted">Rol actual: {employee ? roleLabel(employee.role) : '-'}</p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-text-primary">Nuevo rol</span>
          <select
            className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            value={role}
            onChange={(event) => setRole(event.target.value as ManageableRole)}
          >
            {manageableRoles.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <p>Esta acción quedará registrada en auditoría.</p>
        </div>
      </form>
    </Modal>
  );
}

