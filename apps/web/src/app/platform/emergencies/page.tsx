'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Eye, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { usePlatformEmergencies, useResolveTenantEmergency } from '@/hooks/usePlatform';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type { PlatformEmergencyLock } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function PlatformEmergenciesPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = useAuth();
  const allowed = hasRole('SUPERADMIN');
  const canManage = hasPermission('platform.emergency.manage');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PlatformEmergencyLock | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const emergenciesQuery = usePlatformEmergencies({ q: query }, { enabled: allowed });
  const resolveEmergency = useResolveTenantEmergency();

  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  const staleCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return (emergenciesQuery.data ?? []).filter((item) => new Date(item.activatedAt).getTime() < dayAgo).length;
  }, [emergenciesQuery.data]);
  const emergencies = emergenciesQuery.data ?? [];

  if (!allowed) return null;

  async function submitResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    if (resolutionReason.trim().length < 3) {
      toast.error('Indica un motivo de resolución');
      return;
    }

    try {
      await resolveEmergency.mutateAsync({
        tenantId: selected.tenantId,
        reason: resolutionReason.trim(),
      });
      toast.success('Emergencia resuelta');
      setSelected(null);
      setResolutionReason('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo resolver la emergencia'));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Emergencias"
          description="Empresas bloqueadas por modo emergencia y pendientes de resolución por plataforma."
        />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Emergencias activas" value={emergencies.length} icon={<ShieldAlert size={18} />} tone="red" />
          <StatCard title="Más de 24 h" value={staleCount} icon={<ShieldAlert size={18} />} tone="amber" />
          <StatCard title="Resolución" value="SUPERADMIN" icon={<ShieldCheck size={18} />} tone="green" />
        </div>

        <Card className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Buscar por empresa, email o ciudad"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button asChild variant="outline">
            <Link href="/platform/tenants?accessStatus=EMERGENCY_LOCKED">Ver empresas</Link>
          </Button>
        </Card>

        <section className="space-y-3">
          {emergenciesQuery.isLoading ? <ListSkeleton rows={3} /> : null}
          {!emergenciesQuery.isLoading && emergencies.length === 0 ? (
            <EmptyState title="No hay emergencias activas" text="Las empresas en modo emergencia aparecerán aquí." />
          ) : null}
          {emergencies.map((lock) => (
            <Card key={lock.id} className="border-red-100 p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-text-primary">{lock.tenant.name}</h2>
                      <Badge variant="danger">Emergencia activa</Badge>
                      <Badge variant="outline">{lock.tenant.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {lock.tenant.email || 'Sin email'} · {lock.tenant.city || 'Sin ciudad'} · Activada {formatDate(lock.activatedAt)}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Por {lock.activatedBy?.name ?? 'Usuario no disponible'} · Motivo: {lock.reason || 'Sin motivo informado'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/platform/tenants/${lock.tenantId}`}><Eye size={14} />Detalle</Link>
                  </Button>
                  {canManage ? (
                    <Button variant="default" size="sm" onClick={() => setSelected(lock)}>
                      <ShieldCheck size={14} />Resolver emergencia
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </section>

        <Modal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title="Resolver modo emergencia"
          description="Se restaurará el acceso de la empresa a la aplicación."
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setSelected(null)} disabled={resolveEmergency.isPending}>Cancelar</Button>
              <Button type="submit" form="resolve-emergency-form" disabled={resolveEmergency.isPending}>
                {resolveEmergency.isPending ? 'Resolviendo...' : 'Resolver emergencia'}
              </Button>
            </>
          }
        >
          <form id="resolve-emergency-form" className="space-y-4" onSubmit={submitResolve}>
            <p className="text-sm font-medium text-text-primary">{selected?.tenant.name}</p>
            <label className="block">
              <span className="text-sm font-medium text-text-primary">Motivo de resolución</span>
              <textarea
                className="mt-1.5 min-h-24 w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={resolutionReason}
                onChange={(event) => setResolutionReason(event.target.value)}
                placeholder="Ej. Verificación completada por soporte"
                required
              />
            </label>
          </form>
        </Modal>
      </div>
    </ProtectedLayout>
  );
}
