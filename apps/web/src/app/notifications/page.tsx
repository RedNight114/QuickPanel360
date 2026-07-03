'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Filter,
  SearchCheck,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionErrorBoundary } from '@/components/errors/section-error-boundary';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useArchiveNotification,
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
  useResolveNotification,
  useReviewNotification,
} from '@/hooks/useNotifications';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import type {
  InternalNotification,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const typeLabels: Record<NotificationType, string> = {
  INVENTORY_LOW: 'Inventario bajo',
  INVENTORY_OUT: 'Sin disponibilidad',
  SCALE_TOLERANCE_EXCEEDED: 'Tolerancia de báscula superada',
  POSITIVE_WASTE_HIGH: 'Merma positiva elevada',
  NEGATIVE_DIFFERENCE: 'Diferencia negativa',
  CASH_DIFFERENCE: 'Diferencia de caja',
  CASH_OPEN_TOO_LONG: 'Caja abierta demasiado tiempo',
  MEMBER_BIRTHDAY: 'Cumpleaños de socio',
  MEMBER_PENDING_CONTRIBUTION: 'Pendiente de aportación',
  SECURITY_ALERT: 'Seguridad',
  EMERGENCY_ACTIVE: 'Modo emergencia activo',
  SYSTEM: 'Sistema',
  TRIAL_EXPIRING: 'Periodo de prueba',
  INVOICE_OVERDUE: 'Factura pendiente',
  SUSPENSION_WARNING: 'Riesgo de suspensión',
  PLAN_LIMIT_WARNING: 'Límite de plan',
};

const priorityLabels: Record<NotificationPriority, string> = {
  INFO: 'Info',
  WARNING: 'Aviso',
  IMPORTANT: 'Importante',
  CRITICAL: 'Crítica',
};

const statusLabels: Record<NotificationStatus, string> = {
  UNREAD: 'Sin leer',
  READ: 'Leída',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelta',
  ARCHIVED: 'Archivada',
};

function priorityTone(priority: NotificationPriority) {
  if (priority === 'CRITICAL') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'IMPORTANT') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (priority === 'WARNING') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-amber-200 bg-amber-50 text-[#15140F]';
}

function statusTone(status: NotificationStatus) {
  if (status === 'UNREAD') return 'border-brand-primary/20 bg-brand-lighter text-brand-primary';
  if (status === 'RESOLVED') return 'border-amber-200 bg-amber-50 text-[#15140F]';
  if (status === 'ARCHIVED') return 'border-slate-200 bg-slate-50 text-slate-600';
  if (status === 'IN_REVIEW') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-border-light bg-bg-soft text-text-secondary';
}

function getNotificationPath(notification: InternalNotification) {
  const path = notification.metadata?.path;
  return typeof path === 'string' ? path : null;
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-8 w-20" />
          </Card>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-4 h-9 w-56" />
        </Card>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { hasPermission, isHydrated, hasRole } = useAuth();
  const canView = hasPermission('notifications.view');
  const canManage = hasPermission('notifications.manage') || hasRole('OWNER') || hasRole('MANAGER');
  const canResolve = hasPermission('notifications.resolve') || hasRole('OWNER') || hasRole('MANAGER');
  const [type, setType] = useState<NotificationType | 'all'>('all');
  const [priority, setPriority] = useState<NotificationPriority | 'all'>('all');
  const [status, setStatus] = useState<NotificationStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!canView) {
      router.replace('/dashboard');
    }
  }, [canView, isHydrated, router]);

  const summaryQuery = useNotifications({ take: 200 }, { enabled: canView });
  const listQuery = useNotifications(
    {
      type,
      priority,
      status,
      q: query,
      take: 100,
    },
    { enabled: canView },
  );
  const readOne = useReadNotification();
  const readAll = useReadAllNotifications();
  const reviewOne = useReviewNotification();
  const resolveOne = useResolveNotification();
  const archiveOne = useArchiveNotification();

  const summary = useMemo(() => {
    const items = summaryQuery.data ?? [];
    const today = new Date().toISOString().slice(0, 10);

    return {
      unread: items.filter((item) => item.status === 'UNREAD').length,
      important: items.filter((item) => item.priority === 'IMPORTANT').length,
      critical: items.filter((item) => item.priority === 'CRITICAL').length,
      resolvedToday: items.filter(
        (item) => item.status === 'RESOLVED' && item.resolvedAt?.slice(0, 10) === today,
      ).length,
    };
  }, [summaryQuery.data]);

  async function handleRead(id: string) {
    try {
      await readOne.mutateAsync(id);
      toast.success('Aviso marcado como leído.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el aviso.'));
    }
  }

  async function handleReview(id: string) {
    try {
      await reviewOne.mutateAsync(id);
      toast.success('Aviso marcado en revisión.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el aviso.'));
    }
  }

  async function handleResolve(id: string) {
    try {
      await resolveOne.mutateAsync(id);
      toast.success('Aviso resuelto.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo resolver el aviso.'));
    }
  }

  async function handleArchive(id: string) {
    try {
      await archiveOne.mutateAsync(id);
      toast.success('Aviso archivado.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo archivar el aviso.'));
    }
  }

  async function handleReadAll() {
    try {
      await readAll.mutateAsync();
      toast.success('Avisos marcados como leídos.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron actualizar los avisos.'));
    }
  }

  async function handleOpenContext(notification: InternalNotification) {
    const path = getNotificationPath(notification);
    if (!path) {
      return;
    }

    if (notification.status === 'UNREAD') {
      try {
        await readOne.mutateAsync(notification.id);
      } catch {
        // Deja la navegación seguir aunque el cambio de estado falle.
      }
    }

    router.push(path);
  }

  if (!isHydrated || !canView) {
    return null;
  }

  return (
    <ProtectedLayout>
      <SectionErrorBoundary title="No se pudo cargar el Centro de avisos">
      <div className="space-y-6">
        <PageHeader
          title="Centro de avisos"
          description="Consulta incidencias internas, seguimientos operativos y avisos relevantes del club."
          action={
            <Button
              variant="outline"
              onClick={handleReadAll}
              disabled={readAll.isPending || summary.unread === 0}
            >
              <CheckCheck size={16} />
              Marcar todo como leído
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Sin leer" value={summary.unread} icon={<Bell size={18} />} tone="blue" />
          <StatCard title="Importantes" value={summary.important} icon={<TriangleAlert size={18} />} tone="amber" />
          <StatCard title="Críticas" value={summary.critical} icon={<ShieldAlert size={18} />} tone="red" />
          <StatCard title="Resueltas hoy" value={summary.resolvedToday} icon={<CheckCheck size={18} />} tone="green" />
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            <h2 className="font-semibold text-text-primary">Filtros</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Buscar en avisos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={type}
              onChange={(event) => setType(event.target.value as NotificationType | 'all')}
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={priority}
              onChange={(event) => setPriority(event.target.value as NotificationPriority | 'all')}
            >
              <option value="all">Todas las prioridades</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={status}
              onChange={(event) => setStatus(event.target.value as NotificationStatus | 'all')}
            >
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {listQuery.isLoading ? <NotificationsSkeleton /> : null}
        {listQuery.isError ? (
          <ErrorState
            title="No se pudo cargar el Centro de avisos"
            message="Reintenta dentro de unos segundos."
            onRetry={() => listQuery.refetch()}
          />
        ) : null}

        {!listQuery.isLoading && !listQuery.isError ? (
          listQuery.data?.length ? (
            <div className="space-y-4">
              {listQuery.data.map((notification) => {
                const contextPath = getNotificationPath(notification);

                return (
                  <Card key={notification.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-text-primary">{notification.title}</h2>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityTone(notification.priority)}`}
                          >
                            {priorityLabels[notification.priority]}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(notification.status)}`}
                          >
                            {statusLabels[notification.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">{notification.message}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span>{typeLabels[notification.type]}</span>
                          <span>{formatDate(notification.createdAt)}</span>
                          {notification.resolvedAt ? (
                            <span>Resuelta {formatDate(notification.resolvedAt)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {contextPath ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenContext(notification)}
                          >
                            <ExternalLink size={14} />
                            Abrir contexto
                          </Button>
                        ) : null}
                        {notification.status === 'UNREAD' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRead(notification.id)}
                            disabled={readOne.isPending}
                          >
                            Marcar leída
                          </Button>
                        ) : null}
                        {canResolve &&
                        notification.status !== 'IN_REVIEW' &&
                        notification.status !== 'RESOLVED' &&
                        notification.status !== 'ARCHIVED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReview(notification.id)}
                            disabled={reviewOne.isPending}
                          >
                            <SearchCheck size={14} />
                            En revisión
                          </Button>
                        ) : null}
                        {canResolve &&
                        notification.status !== 'RESOLVED' &&
                        notification.status !== 'ARCHIVED' ? (
                          <Button
                            size="sm"
                            onClick={() => handleResolve(notification.id)}
                            disabled={resolveOne.isPending}
                          >
                            Resolver
                          </Button>
                        ) : null}
                        {canManage && notification.status !== 'ARCHIVED' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleArchive(notification.id)}
                            disabled={archiveOne.isPending}
                          >
                            Archivar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6">
              <EmptyState
                title="No hay avisos para mostrar"
                text="Ajusta los filtros o espera nueva actividad del club."
              />
            </Card>
          )
        ) : null}
      </div>
      </SectionErrorBoundary>
    </ProtectedLayout>
  );
}
