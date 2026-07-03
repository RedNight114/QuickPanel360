import { branding } from './branding';

export const appName = branding.appName;

export const colors = {
  background: branding.paper,
  card: branding.surface,
  softGreen: branding.surface,
  border: branding.border,
  primary: branding.yellow,
  primaryHover: branding.ink,
  textMain: branding.ink,
  textMuted: branding.textSecondary,
  danger: '#EF4444',
  warning: '#F59E0B',
};

export const roleNames: Record<string, string> = {
  SUPERADMIN: 'Superadmin',
  OWNER: 'Propietario',
  MANAGER: 'Manager',
  EMPLOYEE: 'Colaborador',
};

export const statusBadgeStyles: Record<string, string> = {
  ACTIVE: 'border-yellow-200 bg-amber-50 text-yellow-800',
  INACTIVE: 'border-gray-200 bg-gray-50 text-gray-600',
  SUSPENDED: 'border-amber-200 bg-amber-50 text-amber-700',
  BANNED: 'border-red-200 bg-red-50 text-red-700',
  PENDING: 'border-blue-200 bg-blue-50 text-blue-700',
  ARCHIVED: 'border-gray-200 bg-gray-100 text-gray-600',
  OPEN: 'border-yellow-200 bg-amber-50 text-yellow-800',
  CLOSED: 'border-gray-200 bg-gray-50 text-gray-600',
  EMERGENCY_LOCKED: 'border-red-200 bg-red-50 text-red-700',
  ENABLED: 'border-yellow-200 bg-amber-50 text-yellow-800',
};

export function getStatusBadgeStyle(status: string) {
  return statusBadgeStyles[status] ?? 'border-gray-200 bg-white text-gray-700';
}
