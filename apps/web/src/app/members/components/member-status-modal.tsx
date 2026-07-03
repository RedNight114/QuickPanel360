'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Member } from '@/lib/types';
import { getMemberStatusLabel, MemberStatusBadge } from './member-status-badge';

const statuses = ['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE'] as const;

type MemberStatusModalProps = {
  open: boolean;
  member: Member | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (member: Member, status: string) => Promise<void>;
};

export function MemberStatusModal({
  open,
  member,
  saving,
  onClose,
  onConfirm,
}: MemberStatusModalProps) {
  const [nextStatus, setNextStatus] = useState('ACTIVE');

  if (!member) {
    return null;
  }

  const dangerous = nextStatus === 'SUSPENDED' || nextStatus === 'BANNED';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar estado</DialogTitle>
          <DialogDescription>
            Actualiza el estado de {member.firstName} {member.lastName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border-light bg-bg-soft p-3">
            <span className="text-sm text-text-secondary">Estado actual</span>
            <MemberStatusBadge status={member.status} />
          </div>

          <label className="grid gap-2 text-sm font-medium text-text-primary">
            Nuevo estado
            <select
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {getMemberStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          {dangerous ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Esta acción limita el uso del socio. Confirma que quieres aplicar este
              estado.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={dangerous ? 'danger' : 'default'}
            disabled={saving || nextStatus === member.status}
            onClick={() => onConfirm(member, nextStatus)}
          >
            {saving ? 'Actualizando...' : dangerous ? 'Confirmar cambio' : 'Actualizar estado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
