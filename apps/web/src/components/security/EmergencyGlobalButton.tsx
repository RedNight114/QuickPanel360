'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Siren } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  useActivateEmergency,
  useEmergencyStatus,
} from '@/hooks/useSecurity';
import { clearStoredAuth } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

type EmergencyGlobalButtonProps = {
  compact?: boolean;
};

export function EmergencyGlobalButton({ compact = false }: EmergencyGlobalButtonProps) {
  const router = useRouter();
  const { tenant, hasPermission, hasRole } = useAuth();
  const [activateOpen, setActivateOpen] = useState(false);
  const [reason, setReason] = useState('');

  const canActivate = hasRole('OWNER') || hasPermission('emergency.activate');
  const canReadStatus =
    hasRole('OWNER') ||
    hasPermission('emergency.view') ||
    hasPermission('emergency.activate');

  const statusQuery = useEmergencyStatus({ enabled: canReadStatus });
  const activateEmergency = useActivateEmergency();

  const isEmergencyActive = useMemo(() => {
    return (
      statusQuery.data?.accessStatus === 'EMERGENCY_LOCKED' ||
      Boolean(statusQuery.data?.activeEmergencyLock) ||
      tenant?.accessStatus === 'EMERGENCY_LOCKED'
    );
  }, [statusQuery.data, tenant?.accessStatus]);

  if (!canActivate && !isEmergencyActive) {
    return null;
  }

  async function submitActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await activateEmergency.mutateAsync({ reason: reason.trim() || undefined });
      setReason('');
      setActivateOpen(false);
      toast.success('Modo emergencia activado');
      clearStoredAuth();
      router.replace('/emergency-locked');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo activar emergencia'));
    }
  }

  if (isEmergencyActive) {
    return (
      <>
        <div
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
          title="Modo emergencia activo: solo plataforma puede restaurar el acceso"
        >
          <ShieldAlert size={16} />
          <span className={compact ? 'hidden xl:inline' : 'hidden sm:inline'}>Emergencia activa</span>
        </div>
      </>
    );
  }

  return (
    <>
      <Button
        variant="danger"
        size={compact ? 'icon-lg' : 'md'}
        onClick={() => setActivateOpen(true)}
        title="Activar modo emergencia"
      >
        <Siren size={16} />
        {!compact ? <span className="hidden sm:inline">Emergencia</span> : null}
      </Button>

      <Modal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        title="Activar modo emergencia"
        description="Se bloqueara el acceso de la empresa a la aplicacion y se revocaran enlaces activos."
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={() => setActivateOpen(false)} disabled={activateEmergency.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="global-emergency-form" variant="danger" disabled={activateEmergency.isPending}>
              {activateEmergency.isPending ? 'Activando...' : 'Activar ahora'}
            </Button>
          </>
        }
      >
        <form id="global-emergency-form" className="space-y-4" onSubmit={submitActivate}>
          <p className="text-sm text-text-muted">
            Solo el administrador de la plataforma podra restaurar el acceso. Tu sesion se cerrara al activar la emergencia.
          </p>
          <label className="block">
            <span className="text-sm font-medium text-text-primary">Motivo</span>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Motivo opcional"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        </form>
      </Modal>
    </>
  );
}
