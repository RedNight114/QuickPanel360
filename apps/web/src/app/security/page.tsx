'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ClipboardCopy,
  ExternalLink,
  KeyRound,
  Link2,
  LockKeyhole,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AuditEventCard } from '@/components/audit/AuditEventCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { EmergencyGlobalButton } from '@/components/security/EmergencyGlobalButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/loading-state';
import { useSecurityAuditLogs } from '@/hooks/useAudit';
import {
  useCurrentAccessLink,
  useEmergencyStatus,
  useRegenerateAccessLink,
} from '@/hooks/useSecurity';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

const SECURITY_ACTIONS = new Set([
  'access_link.regenerated',
  'access_link.used',
  'emergency.activated',
  'emergency.deactivated',
]);

function getAccessStatusLabel(accessStatus?: string | null) {
  if (accessStatus === 'EMERGENCY_LOCKED') return 'Emergencia activa';
  if (accessStatus === 'ENABLED') return 'Acceso activo';
  if (accessStatus === 'MAINTENANCE') return 'Mantenimiento';
  if (accessStatus === 'DISABLED') return 'Acceso deshabilitado';
  return 'No disponible';
}

function getAccessTone(accessStatus?: string | null): 'green' | 'red' | 'amber' {
  if (accessStatus === 'EMERGENCY_LOCKED') return 'red';
  if (accessStatus === 'ENABLED') return 'green';
  return 'amber';
}

export default function SecurityPage() {
  const { hasPermission, hasRole } = useAuth();
  const [generatedLinkUrl, setGeneratedLinkUrl] = useState<string | null>(null);

  const isOwner = hasRole('OWNER');
  const canReadSecurity =
    isOwner ||
    hasPermission('emergency.view') ||
    hasPermission('emergency.activate') ||
    hasPermission('audit.read');
  const canReadAudit = isOwner || hasPermission('audit.read');
  const canRegenerate = isOwner || hasPermission('access.regenerate');

  const statusQuery = useEmergencyStatus({ enabled: canReadSecurity });
  const currentLinkQuery = useCurrentAccessLink({ enabled: canRegenerate });
  const auditQuery = useSecurityAuditLogs({ enabled: canReadAudit, take: 20 });
  const regenerateAccessLink = useRegenerateAccessLink();

  const accessStatus = statusQuery.data?.accessStatus;
  const activeEmergency = statusQuery.data?.activeEmergencyLock;
  const emergencyActive =
    accessStatus === 'EMERGENCY_LOCKED' || Boolean(activeEmergency);

  const securityEvents = useMemo(
    () =>
      (auditQuery.data ?? [])
        .filter((log) => SECURITY_ACTIONS.has(log.action))
        .slice(0, 8),
    [auditQuery.data],
  );

  async function handleRegenerateLink() {
    try {
      const response = await regenerateAccessLink.mutateAsync();
      setGeneratedLinkUrl(response.url);
      toast.success('Enlace de acceso regenerado.');
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'No se pudo regenerar el enlace de acceso.'),
      );
    }
  }

  async function handleCopyLink() {
    if (!generatedLinkUrl) return;
    await navigator.clipboard.writeText(generatedLinkUrl);
    toast.success('Enlace copiado al portapapeles.');
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Seguridad del club"
          description="Gestiona accesos, enlace seguro de entrada y modo emergencia."
          action={<EmergencyGlobalButton />}
        />

        {!canReadSecurity ? (
          <Card className="border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3 text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold">Acceso restringido</h2>
                <p className="mt-1 text-sm">
                  Esta sección requiere permisos de seguridad o auditoría.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Estado del acceso"
            value={statusQuery.isLoading ? '...' : getAccessStatusLabel(accessStatus)}
            description={
              emergencyActive
                ? 'El club está bloqueado'
                : 'Acceso operativo para el equipo'
            }
            icon={emergencyActive ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
            tone={getAccessTone(accessStatus)}
          />
          <StatCard
            title="Enlace seguro"
            value={currentLinkQuery.data ? 'Activo' : 'Sin enlace'}
            description={
              currentLinkQuery.data
                ? `Creado ${formatDate(currentLinkQuery.data.createdAt)}`
                : 'Pendiente de generación'
            }
            icon={<Link2 size={18} />}
            tone={currentLinkQuery.data ? 'green' : 'amber'}
          />
          <StatCard
            title="Modo emergencia"
            value={emergencyActive ? 'Activo' : 'Inactivo'}
            description={
              emergencyActive
                ? 'Solo plataforma puede restaurar'
                : 'Preparado para activar'
            }
            icon={<Shield size={18} />}
            tone={emergencyActive ? 'red' : 'neutral'}
          />
          <StatCard
            title="Eventos recientes"
            value={securityEvents.length}
            description="Actividad de seguridad reciente"
            icon={<Activity size={18} />}
            tone="blue"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="space-y-5">
            <Card>
              <div className="flex items-start gap-4">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                    emergencyActive
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {emergencyActive ? (
                    <ShieldAlert size={24} />
                  ) : (
                    <ShieldCheck size={24} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {statusQuery.isLoading
                        ? 'Consultando estado...'
                        : getAccessStatusLabel(accessStatus)}
                    </h2>
                    <Badge variant={emergencyActive ? 'danger' : 'success'}>
                      {emergencyActive ? 'Bloqueado' : 'Operativo'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    {emergencyActive
                      ? 'La empresa está bloqueada. Solo el administrador de plataforma puede restaurar el acceso.'
                      : 'El club opera con acceso protegido y todos los eventos quedan auditados.'}
                  </p>
                </div>
              </div>

              {activeEmergency ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="grid gap-3 text-sm text-red-800 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-red-600">
                        Activado
                      </p>
                      <p className="mt-0.5 font-medium">
                        {formatDate(activeEmergency.activatedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-600">Motivo</p>
                      <p className="mt-0.5 font-medium">
                        {activeEmergency.reason || 'Sin motivo informado'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-lighter text-brand-primary">
                    <Link2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      Enlace de acceso seguro
                    </h2>
                    <p className="mt-0.5 text-sm text-text-muted">
                      Los colaboradores necesitan este enlace para iniciar sesión.
                      Al regenerarlo, los anteriores dejan de funcionar.
                    </p>
                  </div>
                </div>
                {canRegenerate ? (
                  <Button
                    variant="outline"
                    onClick={handleRegenerateLink}
                    disabled={regenerateAccessLink.isPending}
                    className="shrink-0"
                  >
                    <RotateCcw size={14} />
                    {regenerateAccessLink.isPending
                      ? 'Regenerando...'
                      : 'Regenerar'}
                  </Button>
                ) : null}
              </div>

              {currentLinkQuery.data ? (
                <div className="mt-4 grid gap-3 rounded-xl border border-border-light bg-bg-soft p-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-text-muted">Estado</p>
                    <p className="mt-0.5 font-medium text-text-primary">
                      {currentLinkQuery.data.status === 'ACTIVE'
                        ? 'Activo'
                        : currentLinkQuery.data.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Creado</p>
                    <p className="mt-0.5 font-medium text-text-primary">
                      {formatDate(currentLinkQuery.data.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Último uso</p>
                    <p className="mt-0.5 font-medium text-text-primary">
                      {currentLinkQuery.data.lastUsedAt
                        ? formatDate(currentLinkQuery.data.lastUsedAt)
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-border-light bg-bg-soft p-4 text-center">
                  <p className="text-sm text-text-muted">
                    {canRegenerate
                      ? 'No hay enlace activo. Genera uno para compartir una URL segura.'
                      : 'No tienes permiso para gestionar enlaces.'}
                  </p>
                </div>
              )}

              {generatedLinkUrl ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-[#15140F]">
                    Nuevo enlace generado
                  </p>
                  <p className="mt-2 break-all rounded-lg border border-amber-200 bg-white p-2 font-mono text-sm text-amber-700">
                    {generatedLinkUrl}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyLink}>
                      <ClipboardCopy size={14} />
                      Copiar enlace
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-amber-700">
                    Guárdalo ahora: esta URL no volverá a mostrarse al salir de
                    esta pantalla.
                  </p>
                </div>
              ) : null}
            </Card>

            <Card className={emergencyActive ? 'border-red-200 bg-red-50/50' : ''}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                      emergencyActive
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      {emergencyActive ? 'Emergencia activa' : 'Modo emergencia'}
                    </h2>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {emergencyActive
                        ? 'Los accesos del club están bloqueados hasta intervención de plataforma.'
                        : 'Bloquea todos los accesos del club de forma inmediata si detectas una incidencia grave.'}
                    </p>
                  </div>
                </div>
                <EmergencyGlobalButton />
              </div>
            </Card>
          </section>

          <aside className="space-y-5">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-lighter text-brand-primary">
                  <LockKeyhole size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Controles activos
                  </h2>
                  <p className="text-xs text-text-muted">
                    Protecciones base de la plataforma
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                {[
                  { label: 'Enlace de acceso protegido', icon: KeyRound },
                  { label: 'Auditoría de acciones', icon: Activity },
                  { label: 'Permisos por rol', icon: UserCheck },
                  { label: 'Aislamiento por empresa', icon: ShieldCheck },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-border-light bg-bg-soft px-3 py-2.5"
                  >
                    <span className="inline-flex items-center gap-2 text-sm text-text-primary">
                      <item.icon size={14} className="text-text-muted" />
                      {item.label}
                    </span>
                    <Badge variant="success" size="sm">
                      Activo
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    Actividad reciente
                  </h2>
                  <p className="text-xs text-text-muted">
                    Eventos recientes de seguridad
                  </p>
                </div>
                {canReadAudit ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/audit">
                      <ExternalLink size={13} />
                      Ver todo
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                {auditQuery.isLoading ? <ListSkeleton rows={3} /> : null}
                {!auditQuery.isLoading && auditQuery.error ? (
                  <ErrorState
                    message="No se pudo cargar la actividad de seguridad."
                    onRetry={() => auditQuery.refetch()}
                  />
                ) : null}
                {!auditQuery.isLoading && !auditQuery.error && securityEvents.length === 0 ? (
                  <EmptyState
                    title="Sin eventos recientes"
                    text="Los eventos de seguridad aparecerán aquí cuando haya actividad."
                  />
                ) : null}
                {!auditQuery.isLoading && !auditQuery.error
                  ? securityEvents.map((log) => (
                      <AuditEventCard key={log.id} log={log} />
                    ))
                  : null}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </ProtectedLayout>
  );
}
