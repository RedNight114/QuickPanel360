import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import type { Employee } from '@/lib/types';
import { editableStatuses, manageableRoles, type EditableStatus, type ManageableRole } from './employee-utils';

export type EmployeeFormMode = 'create' | 'edit';

export type EmployeeFormValue = {
  name: string;
  email: string;
  password: string;
  phone: string;
  avatarUrl: string;
  role: ManageableRole;
  status: EditableStatus;
};

export const emptyEmployeeForm: EmployeeFormValue = {
  name: '',
  email: '',
  password: '',
  phone: '',
  avatarUrl: '',
  role: 'EMPLOYEE',
  status: 'ACTIVE',
};

export function employeeToForm(employee: Employee): EmployeeFormValue {
  return {
    name: employee.name,
    email: employee.email,
    password: '',
    phone: employee.phone ?? '',
    avatarUrl: employee.avatarUrl ?? '',
    role: employee.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
    status: employee.status,
  };
}

type EmployeeFormModalProps = {
  open: boolean;
  mode: EmployeeFormMode;
  initialValue: EmployeeFormValue;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (form: EmployeeFormValue) => void | Promise<void>;
};

export function EmployeeFormModal({
  open,
  mode,
  initialValue,
  saving,
  error,
  onClose,
  onSubmit,
}: EmployeeFormModalProps) {
  const [form, setForm] = useState<EmployeeFormValue>(initialValue);
  const isEdit = mode === 'edit';

  useEffect(() => {
    setForm(initialValue);
  }, [initialValue, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar colaborador' : 'Nuevo colaborador'}
      description={
        isEdit
          ? 'Actualiza los datos operativos del colaborador sin modificar sus credenciales.'
          : 'El colaborador podrá acceder al club según el rol asignado.'
      }
      size="lg"
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-form" disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear colaborador'}
          </Button>
        </>
      }
    >
      <form id="employee-form" className="space-y-4" onSubmit={submit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Field
          label="Nombre"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
          disabled={isEdit}
        />
        {!isEdit ? (
          <Field
            label="Password"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        ) : null}
        <Field
          label="Teléfono"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
        {isEdit ? (
          <Field
            label="Avatar URL"
            value={form.avatarUrl}
            onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })}
          />
        ) : null}
        {!isEdit ? (
          <label className="block">
            <span className="text-sm font-medium text-text-primary">Rol</span>
            <select
              className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as ManageableRole })}
            >
              {manageableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {isEdit ? (
          <label className="block">
            <span className="text-sm font-medium text-text-primary">Estado</span>
            <select
              className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as EditableStatus })}
            >
              {editableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            {isEdit
              ? 'El email, password y rol se gestionan por flujos separados para reducir cambios accidentales.'
              : 'Usa una contraseña temporal segura. El colaborador podrá cambiarla más adelante si se implementa recuperación.'}
          </p>
        </div>
      </form>
    </Modal>
  );
}

