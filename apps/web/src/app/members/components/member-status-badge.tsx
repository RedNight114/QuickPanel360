'use client';

import { Badge } from '@/components/ui/badge';

const labels: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  BANNED: 'Vetado',
  INACTIVE: 'Inactivo',
  PENDING: 'Pendiente',
};

const variants: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  BANNED: 'danger',
  INACTIVE: 'secondary',
  PENDING: 'warning',
};

export function getMemberStatusLabel(status?: string | null) {
  return labels[status ?? ''] ?? status ?? 'Sin estado';
}

export function MemberStatusBadge({ status }: { status?: string | null }) {
  return (
    <Badge variant={variants[status ?? ''] ?? 'secondary'} size="sm">
      {getMemberStatusLabel(status)}
    </Badge>
  );
}
