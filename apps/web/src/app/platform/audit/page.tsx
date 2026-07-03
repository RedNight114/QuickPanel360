'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ClipboardList, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/loading-state';
import { usePlatformAudit, usePlatformTenants } from '@/hooks/usePlatform';
import { formatDate } from '@/lib/format';
import type { PlatformAuditLog } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const actionLabels: Record<string, string> = {
  'tenant.created': 'Empresa creada',
  'tenant.updated': 'Empresa actualizada',
  'tenant.suspended': 'Empresa suspendida',
  'tenant.reactivated': 'Empresa reactivada',
  'tenant.archived': 'Empresa archivada',
  'tenant.emergency_activated': 'Emergencia activada en empresa',
  'tenant.emergency_activated_by_tenant': 'Emergencia activada por la empresa',
  'tenant.emergency_deactivated': 'Emergencia resuelta por plataforma',
  'tenant.plan_updated': 'Plan de empresa actualizado',
  'tenant.subscription_updated': 'Suscripción actualizada',
  'tenant.modules_updated': 'Módulos de empresa actualizados',
  'tenant.modules_synced_from_plan': 'Módulos sincronizados desde plan',
  'plan.created': 'Plan creado',
  'plan.updated': 'Plan actualizado',
  'plan.archived': 'Plan archivado',
  'plan.modules_updated': 'Módulos de plan actualizados',
  'module.created': 'Módulo creado',
  'module.updated': 'Módulo actualizado',
  'module.archived': 'Módulo archivado',
  'support.session_opened': 'Sesión de soporte abierta',
  'support.session_closed': 'Sesión de soporte cerrada',
  'support.impersonation_started': 'Acceso de soporte iniciado',
  'billing.invoice_created': 'Comprobante interno creado',
  'billing.invoice_updated': 'Comprobante interno actualizado',
  'billing.payment_recorded': 'Aportación registrada',
};

const actionDescriptions: Record<string, string> = {
  'tenant.created': 'Se dio de alta una nueva empresa SaaS.',
  'tenant.updated': 'Se actualizaron datos principales de la empresa.',
  'tenant.suspended': 'La empresa fue suspendida y no puede operar.',
  'tenant.reactivated': 'La empresa recuperó el acceso operativo.',
  'tenant.archived': 'La empresa quedó archivada conservando sus datos.',
  'tenant.emergency_activated': 'Plataforma activó el modo emergencia en una empresa.',
  'tenant.emergency_activated_by_tenant': 'La empresa activó el modo emergencia y quedó bloqueada.',
  'tenant.emergency_deactivated': 'Plataforma resolvió el modo emergencia y restauró el acceso.',
  'tenant.plan_updated': 'Se actualizó el plan comercial asignado a una empresa.',
  'tenant.subscription_updated': 'Se actualizaron estado o fechas comerciales de una suscripción.',
  'tenant.modules_updated': 'Se actualizaron los módulos habilitados de una empresa.',
  'tenant.modules_synced_from_plan': 'Los módulos de la empresa se ajustaron al plan asignado.',
  'plan.created': 'Se creó un nuevo plan comercial.',
  'plan.updated': 'Se actualizaron datos de un plan comercial.',
  'plan.archived': 'El plan dejó de estar disponible para nuevas asignaciones.',
  'plan.modules_updated': 'Se actualizaron los módulos incluidos en un plan.',
  'module.created': 'Se creó un nuevo módulo de plataforma.',
  'module.updated': 'Se actualizaron datos de un módulo de plataforma.',
  'module.archived': 'El módulo dejó de estar disponible para nuevas configuraciones.',
  'support.session_opened': 'Se abrió una sesión interna de soporte con motivo obligatorio.',
  'support.session_closed': 'Se cerró una sesión interna de soporte.',
  'support.impersonation_started': 'Se inició acceso de soporte auditado sobre una empresa.',
  'billing.invoice_created': 'Se creó un comprobante interno de plataforma.',
  'billing.invoice_updated': 'Se actualizó un comprobante interno de plataforma.',
  'billing.payment_recorded': 'Se registró una aportación interna de plataforma.',
};

function changedFields(log: PlatformAuditLog) {
  const oldValue = (log.oldValue && typeof log.oldValue === 'object' ? log.oldValue : {}) as Record<string, unknown>;
  const newValue = (log.newValue && typeof log.newValue === 'object' ? log.newValue : {}) as Record<string, unknown>;
  const labels: Record<string, string> = {
    name: 'Nombre',
    legalName: 'Nombre legal',
    taxId: 'Identificación fiscal',
    email: 'Email',
    phone: 'Teléfono',
    city: 'Ciudad',
    country: 'País',
    status: 'Estado',
    accessStatus: 'Acceso',
    code: 'Código',
    priceMonthly: 'Valor mensual',
    maxUsers: 'Max colaboradores',
    maxProducts: 'Max productos',
    trialEndsAt: 'Fin trial',
    endsAt: 'Fecha cierre',
    reason: 'Motivo',
    notes: 'Notas',
    amount: 'Importe',
    number: 'Número',
    dueAt: 'Vencimiento',
    paidAt: 'Pagada',
    resolutionReason: 'Motivo resolución',
  };

  return Object.keys(labels)
    .filter((field) => JSON.stringify(oldValue[field] ?? null) !== JSON.stringify(newValue[field] ?? null))
    .map((field) => `${labels[field]}: ${String(oldValue[field] ?? '-')} -> ${String(newValue[field] ?? '-')}`);
}

function PlatformAuditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const allowed = hasRole('SUPERADMIN');
  const [tenantId, setTenantId] = useState(searchParams.get('tenantId') ?? 'all');
  const [action, setAction] = useState('all');
  const [actorUserId, setActorUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      take: 100,
      tenantId,
      action,
      actorUserId,
      dateFrom,
      dateTo,
    }),
    [tenantId, action, actorUserId, dateFrom, dateTo],
  );

  const { data: logs = [], isLoading } = usePlatformAudit(filters, { enabled: allowed });
  const tenantsQuery = usePlatformTenants({ take: 200 }, { enabled: allowed });

  useEffect(() => {
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [allowed, router]);

  if (!allowed) {
    return null;
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader title="Auditoría plataforma" description="Historial global de acciones SaaS." />

        <Card className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_1fr_160px_160px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <select
              className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
            >
              <option value="all">Todas las empresas</option>
              {tenantsQuery.data?.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
          <select
            className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="all">Todas las acciones</option>
            {Object.entries(actionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            placeholder="Actor userId"
            value={actorUserId}
            onChange={(event) => setActorUserId(event.target.value)}
          />
          <label className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <input
            className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </Card>

        {isLoading ? <ListSkeleton rows={5} /> : null}
        {!isLoading && logs.length === 0 ? <EmptyState title="Sin eventos de plataforma" /> : null}

        <section className="space-y-3">
          {logs.map((log) => {
            const changes = changedFields(log);

            return (
              <Card key={log.id} className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ClipboardList size={16} className="text-brand-primary" />
                      <p className="font-semibold text-text-primary">{actionLabels[log.action] ?? log.action}</p>
                      <Badge variant="outline">{log.entityType}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {actionDescriptions[log.action] ?? 'Acción registrada en plataforma.'}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Empresa:{' '}
                      {log.tenant?.id ? (
                        <Link className="font-medium text-brand-primary" href={`/platform/tenants/${log.tenant.id}`}>
                          {log.tenant.name}
                        </Link>
                      ) : (
                        'Plataforma'
                      )}{' '}
                      · Actor: {log.actorUser?.name ?? 'Sistema'} · {formatDate(log.createdAt)}
                    </p>
                    <div className="mt-3 space-y-1 text-sm text-text-secondary">
                      {changes.length ? (
                        changes.slice(0, 5).map((field) => <p key={field}>{field}</p>)
                      ) : (
                        <p>Sin cambios de campos principales.</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setOpenId(openId === log.id ? null : log.id)}>
                    Ver datos técnicos
                  </Button>
                </div>
                {openId === log.id ? (
                  <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">
                    {JSON.stringify(
                      {
                        oldValue: log.oldValue,
                        newValue: log.newValue,
                        ipAddress: log.ipAddress,
                        userAgent: log.userAgent,
                      },
                      null,
                      2,
                    )}
                  </pre>
                ) : null}
              </Card>
            );
          })}
        </section>
      </div>
    </ProtectedLayout>
  );
}

export default function PlatformAuditPage() {
  return (
    <Suspense
      fallback={(
        <ProtectedLayout>
          <ListSkeleton rows={5} />
        </ProtectedLayout>
      )}
    >
      <PlatformAuditContent />
    </Suspense>
  );
}
