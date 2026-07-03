'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';

type LiveMetrics = {
  period: string;
  uptime: number;
  memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
  infrastructure: { database: string; redis: string };
  requests: {
    total: number;
    errors: number;
    clientErrors: number;
    errorRate: number;
    reqPerSec: number;
  };
  latency: { avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number };
  topRoutes: Array<{ route: string; count: number; errors: number; avgMs: number; maxMs: number }>;
  slowRoutes: Array<{ route: string; count: number; avgMs: number; maxMs: number }>;
  recentErrors: Array<{ method: string; path: string; status: number; duration: number; timestamp: string }>;
};

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'connected' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm capitalize">{status}</span>
    </span>
  );
}

export default function PlatformMetricsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [minutes, setMinutes] = useState(5);

  const metricsQuery = useQuery({
    queryKey: ['platform', 'metrics', 'live', minutes],
    queryFn: () => getJson<LiveMetrics>(`/platform/metrics/live?minutes=${minutes}`),
    enabled: hasRole('SUPERADMIN'),
    refetchInterval: 15_000,
  });

  if (!hasRole('SUPERADMIN')) {
    router.replace('/dashboard');
    return null;
  }

  const data = metricsQuery.data;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Métricas del sistema"
          description="Rendimiento, latencias, errores e infraestructura en tiempo real."
          action={
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-sm"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              >
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => metricsQuery.refetch()}
                disabled={metricsQuery.isFetching}
              >
                <RefreshCw size={14} className={metricsQuery.isFetching ? 'animate-spin' : ''} />
              </Button>
            </div>
          }
        />

        {metricsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : metricsQuery.isError ? (
          <ErrorState message="No se pudieron cargar las métricas." onRetry={() => metricsQuery.refetch()} />
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Requests / sec"
                value={data.requests.reqPerSec}
                icon={<Zap size={20} />}
                tone="blue"
              />
              <StatCard
                title="Latencia p95"
                value={`${data.latency.p95Ms}ms`}
                description={`p50: ${data.latency.p50Ms}ms · p99: ${data.latency.p99Ms}ms`}
                icon={<Clock size={20} />}
                tone={data.latency.p95Ms > 500 ? 'red' : data.latency.p95Ms > 200 ? 'amber' : 'green'}
              />
              <StatCard
                title="Error rate"
                value={`${data.requests.errorRate}%`}
                description={`${data.requests.errors} errores de ${data.requests.total}`}
                icon={<AlertTriangle size={20} />}
                tone={data.requests.errorRate > 5 ? 'red' : data.requests.errorRate > 1 ? 'amber' : 'green'}
              />
              <StatCard
                title="Uptime"
                value={formatUptime(data.uptime)}
                description={`RSS: ${data.memory.rssMb}MB · Heap: ${data.memory.heapUsedMb}/${data.memory.heapTotalMb}MB`}
                icon={<Server size={20} />}
                tone="neutral"
              />
            </div>

            {/* Infrastructure */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Infraestructura</h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-text-muted" />
                  <span className="text-sm text-text-muted">PostgreSQL:</span>
                  <StatusDot status={data.infrastructure.database} />
                </div>
                <div className="flex items-center gap-3">
                  <HardDrive size={16} className="text-text-muted" />
                  <span className="text-sm text-text-muted">Redis:</span>
                  <StatusDot status={data.infrastructure.redis} />
                </div>
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-text-muted" />
                  <span className="text-sm text-text-muted">Memoria:</span>
                  <span className="text-sm">{data.memory.heapUsedMb}MB / {data.memory.heapTotalMb}MB heap</span>
                </div>
              </div>
            </Card>

            {/* Top routes */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Rutas más activas (últimos {minutes}min)</h3>
              {data.topRoutes.length === 0 ? (
                <p className="text-sm text-text-muted">Sin actividad en este periodo.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light text-left text-xs text-text-muted">
                        <th className="pb-2 pr-4">Ruta</th>
                        <th className="pb-2 pr-4 text-right">Requests</th>
                        <th className="pb-2 pr-4 text-right">Errores</th>
                        <th className="pb-2 pr-4 text-right">Avg</th>
                        <th className="pb-2 text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topRoutes.map((route) => (
                        <tr key={route.route} className="border-b border-border-light/50">
                          <td className="py-1.5 pr-4 font-mono text-xs">{route.route}</td>
                          <td className="py-1.5 pr-4 text-right">{route.count}</td>
                          <td className="py-1.5 pr-4 text-right">
                            {route.errors > 0 ? (
                              <span className="text-red-600">{route.errors}</span>
                            ) : (
                              <span className="text-text-muted">0</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-4 text-right">{route.avgMs}ms</td>
                          <td className="py-1.5 text-right">
                            <span className={route.maxMs > 500 ? 'text-amber-600 font-medium' : ''}>
                              {route.maxMs}ms
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Slow routes */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">Rutas más lentas</h3>
              {data.slowRoutes.length === 0 ? (
                <p className="text-sm text-text-muted">Sin datos.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.slowRoutes.map((route) => (
                    <div
                      key={route.route}
                      className="flex items-center justify-between rounded-lg border border-border-light px-3 py-2"
                    >
                      <span className="font-mono text-xs text-text-primary">{route.route}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-text-muted">{route.count} req</span>
                        <Badge
                          variant={route.avgMs > 500 ? 'danger' : route.avgMs > 200 ? 'warning' : 'success'}
                          size="sm"
                        >
                          avg {route.avgMs}ms
                        </Badge>
                        <span className={`font-medium ${route.maxMs > 1000 ? 'text-red-600' : 'text-text-muted'}`}>
                          max {route.maxMs}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent errors */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Errores recientes
                {data.recentErrors.length > 0 ? (
                  <Badge variant="danger" size="sm" className="ml-2">{data.recentErrors.length}</Badge>
                ) : null}
              </h3>
              {data.recentErrors.length === 0 ? (
                <p className="text-sm text-amber-700">Sin errores 5xx en los últimos {minutes} minutos.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.recentErrors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-red-800">
                        {err.method} {err.path}
                      </span>
                      <div className="flex items-center gap-3">
                        <Badge variant="danger" size="sm">{err.status}</Badge>
                        <span className="text-red-600">{err.duration}ms</span>
                        <span className="text-red-400">{new Date(err.timestamp).toLocaleTimeString('es-ES')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
