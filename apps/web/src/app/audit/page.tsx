'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditEventCard } from '@/components/audit/AuditEventCard';
import {
  AuditFilters,
  auditCategoryActions,
  type AuditFilterState,
} from '@/components/audit/AuditFilters';
import { AuditSummaryCards } from '@/components/audit/AuditSummaryCards';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ListSkeleton } from '@/components/ui/loading-state';
import { apiFetch } from '@/lib/api';
import { formatAuditLog } from '@/lib/audit-formatter';
import type { AuditLog } from '@/lib/types';

const defaultFilters: AuditFilterState = {
  category: 'all',
  user: '',
  entity: '',
  take: '100',
};

function buildQuery(take: string) {
  const params = new URLSearchParams();
  const limit = take.trim();

  if (limit) {
    params.set('take', limit);
  }

  return params.toString();
}

function includesText(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

function logMatchesText(log: AuditLog, query: string) {
  if (!query.trim()) {
    return true;
  }

  const formatted = formatAuditLog(log);
  const searchable = [
    formatted.actor,
    formatted.title,
    formatted.description,
    formatted.category,
    log.user?.email,
    log.user?.name,
    log.userId,
    log.action,
    log.entityType,
    log.entityId,
    JSON.stringify(log.oldValue ?? ''),
    JSON.stringify(log.newValue ?? ''),
  ]
    .filter(Boolean)
    .join(' ');

  return includesText(searchable, query);
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<AuditFilterState>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (take = filters.take) => {
    setLoading(true);
    setError(null);

    try {
      const query = buildQuery(take);
      setLogs(await apiFetch<AuditLog[]>(`/audit/logs${query ? `?${query}` : ''}`));
    } catch (err) {
      setLogs([]);
      setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría.');
    } finally {
      setLoading(false);
    }
  }, [filters.take]);

  useEffect(() => {
    loadLogs(defaultFilters.take);
  }, [loadLogs]);

  const visibleLogs = useMemo(() => {
    const allowedActions = auditCategoryActions[filters.category];

    return logs.filter((log) => {
      const categoryMatch =
        filters.category === 'all' || allowedActions.includes(log.action);
      const userMatch = logMatchesText(log, filters.user);
      const entityMatch = logMatchesText(log, filters.entity);

      return categoryMatch && userMatch && entityMatch;
    });
  }, [filters.category, filters.entity, filters.user, logs]);

  function clearFilters() {
    setFilters(defaultFilters);
    loadLogs(defaultFilters.take);
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Auditoría"
          description="Registro de toda la actividad del club. Dispensaciones, caja, inventario, socios y seguridad."
        />

        <AuditSummaryCards logs={visibleLogs} />

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <AuditFilters
            filters={filters}
            loading={loading}
            onChange={setFilters}
            onRefresh={() => loadLogs(filters.take)}
            onClear={clearFilters}
          />

          <section className="space-y-4">
            {!loading && error ? (
              <ErrorState message={error} onRetry={() => loadLogs(filters.take)} />
            ) : null}

            {loading ? <ListSkeleton rows={6} /> : null}

            {!loading && visibleLogs.length === 0 ? (
              <EmptyState
                title="No hay eventos para mostrar"
                text="Prueba a limpiar filtros o ampliar el limite de eventos cargados."
              />
            ) : null}

            {!loading
              ? visibleLogs.map((log) => <AuditEventCard key={log.id} log={log} />)
              : null}
          </section>
        </div>
      </div>
    </ProtectedLayout>
  );
}


