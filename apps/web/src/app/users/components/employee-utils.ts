import type { Employee } from '@/lib/types';

export type EmployeeRoleFilter = 'all' | 'OWNER' | 'MANAGER' | 'EMPLOYEE';
export type EmployeeStatusFilter = 'all' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type EmployeeSort = 'recent' | 'name' | 'role' | 'lastLogin';

export const manageableRoles = ['MANAGER', 'EMPLOYEE'] as const;
export const editableStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;

export type ManageableRole = (typeof manageableRoles)[number];
export type EditableStatus = (typeof editableStatuses)[number];

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return initials || 'EM';
}

export function formatEmployeeDate(value?: string | null) {
  if (!value) return 'No disponible';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatEmployeeDateTime(value?: string | null) {
  if (!value) return 'No disponible';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function roleLabel(role: Employee['role']) {
  const labels: Record<Employee['role'], string> = {
    SUPERADMIN: 'Superadmin',
    OWNER: 'Owner',
    MANAGER: 'Manager',
    EMPLOYEE: 'Colaborador',
  };

  return labels[role] ?? role;
}

export function statusLabel(status: Employee['status']) {
  const labels: Record<Employee['status'], string> = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    BLOCKED: 'Bloqueado',
  };

  return labels[status] ?? status;
}

export function sortEmployees(employees: Employee[], sort: EmployeeSort) {
  return [...employees].sort((a, b) => {
    if (sort === 'name') {
      return a.name.localeCompare(b.name);
    }

    if (sort === 'role') {
      return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
    }

    if (sort === 'lastLogin') {
      return (
        new Date(b.lastLoginAt ?? 0).getTime() -
        new Date(a.lastLoginAt ?? 0).getTime()
      );
    }

    return (
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
    );
  });
}

