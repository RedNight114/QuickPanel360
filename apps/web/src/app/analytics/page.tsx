'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  HandCoins,
  Loader2,
  Scale,
  TrendingDown,
  TrendingUp,
  UserCog,
  Printer,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MeasuredChart } from '@/components/common/measured-chart';
import { SectionErrorBoundary } from '@/components/errors/section-error-boundary';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyticsCollaborators, useAnalyticsSummary, useProductPerformance, useMemberSpending, useInventoryTrends } from '@/hooks/useAnalytics';
import { formatCredits, formatCurrency, formatDate } from '@/lib/format';
import type { AnalyticsCollaborator, AnalyticsSummary } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';

type PresetKey = 'today' | 'yesterday' | 'last7' | 'month' | 'custom';

const PIE_COLORS = ['#10b981', '#0ea5e9', '#f59e0b'];

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(preset: PresetKey) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (preset === 'today') {
    return { dateFrom: toDateInput(today), dateTo: toDateInput(now) };
  }

  if (preset === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { dateFrom: toDateInput(yesterday), dateTo: toDateInput(yesterday) };
  }

  if (preset === 'last7') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { dateFrom: toDateInput(start), dateTo: toDateInput(now) };
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: toDateInput(startOfMonth), dateTo: toDateInput(now) };
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-9 w-28" />
            <Skeleton className="mt-3 h-4 w-40" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5"><Skeleton className="h-72 w-full" /></Card>
        <Card className="p-5"><Skeleton className="h-72 w-full" /></Card>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function hasMeaningfulData(data?: AnalyticsSummary) {
  if (!data) return false;

  return (
    data.totalDispensations > 0 ||
    data.totalCredits > 0 ||
    data.topProducts.length > 0 ||
    data.activityByDay.some((item) => item.dispensations > 0 || item.credits > 0) ||
    data.birthdayMembersThisMonth.length > 0
  );
}

function formatTooltipValue(value: unknown, name: unknown) {
  const numericValue = Number(value ?? 0);
  return String(name) === 'credits' || String(name) === 'totalCredits'
    ? formatCurrency(numericValue)
    : numericValue;
}

function formatGrams(value: number) {
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} g`;
}

function ComparisonBadge({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined || previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = change >= 0;
  return (
    <span className={`ml-2 inline-flex items-center text-xs font-medium ${isPositive ? 'text-amber-600' : 'text-red-600'}`}>
      {isPositive ? '+' : ''}{change.toFixed(1)}%
    </span>
  );
}

function getCollaboratorRoleLabel(role: AnalyticsCollaborator['role']) {
  if (role === 'OWNER') return 'Propietario';
  if (role === 'MANAGER') return 'Manager';
  if (role === 'EMPLOYEE') return 'Colaborador';
  return role;
}

function buildOperationalAlerts(
  collaborator: AnalyticsCollaborator,
  averages: {
    dispensations: number;
    positiveDifference: number;
    pendingContributions: number;
  },
) {
  const alerts: string[] = [];

  if (
    averages.dispensations > 0 &&
    collaborator.totalDispensations > Math.max(averages.dispensations * 1.6, 3)
  ) {
    alerts.push('Actividad fuera de la media');
  }

  if (
    averages.positiveDifference > 0 &&
    collaborator.positiveDifferenceGrams >
      Math.max(averages.positiveDifference * 1.5, 5)
  ) {
    alerts.push('Diferencia positiva elevada');
  }

  if (collaborator.toleranceExceededCount > 0) {
    alerts.push('Tolerancias excedidas');
  }

  if (
    averages.pendingContributions > 0 &&
    collaborator.pendingContributionsGenerated >
      Math.max(averages.pendingContributions * 1.35, 10)
  ) {
    alerts.push('Pendientes de aportación superiores a la media');
  }

  return alerts;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { hasPermission, hasRole, isHydrated } = useAuth();
  const canViewAnalytics = hasPermission('reports.view_limited') || hasPermission('reports.view');
  const canViewOperationalPerformance =
    hasRole('OWNER') ||
    hasRole('MANAGER') ||
    hasPermission('analytics.collaborators.view');
  const [preset, setPreset] = useState<PresetKey>('month');
  const [customFrom, setCustomFrom] = useState(getPresetRange('month').dateFrom);
  const [customTo, setCustomTo] = useState(getPresetRange('month').dateTo);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (hasRole('SUPERADMIN')) {
      router.replace('/platform');
      return;
    }

    if (!canViewAnalytics) {
      router.replace('/dashboard');
    }
  }, [canViewAnalytics, hasRole, isHydrated, router]);

  const filters = useMemo(() => {
    if (preset === 'custom') {
      return { dateFrom: customFrom, dateTo: customTo };
    }

    return getPresetRange(preset);
  }, [customFrom, customTo, preset]);

  const [compareEnabled, setCompareEnabled] = useState(false);

  const allowed = canViewAnalytics && !hasRole('SUPERADMIN');
  const query = useAnalyticsSummary(filters, { enabled: allowed });

  const prevFilters = useMemo(() => {
    if (!compareEnabled || !filters.dateFrom || !filters.dateTo) return {};
    const from = new Date(filters.dateFrom);
    const to = new Date(filters.dateTo);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - days * 86400000);
    return { dateFrom: prevFrom.toISOString().slice(0, 10), dateTo: prevTo.toISOString().slice(0, 10) };
  }, [compareEnabled, filters]);
  const prevQuery = useAnalyticsSummary(prevFilters, { enabled: compareEnabled && allowed });
  const prev = compareEnabled ? prevQuery.data : undefined;
  const productPerf = useProductPerformance(filters, { enabled: allowed });
  const memberSpend = useMemberSpending(filters, { enabled: allowed });
  const inventoryTrends = useInventoryTrends({ enabled: allowed });
  const collaboratorQuery = useAnalyticsCollaborators(filters, {
    enabled:
      canViewAnalytics &&
      canViewOperationalPerformance &&
      !hasRole('SUPERADMIN'),
  });
  const data = query.data;
  const collaboratorData = useMemo(
    () => collaboratorQuery.data?.collaborators ?? [],
    [collaboratorQuery.data?.collaborators],
  );
  const empty = !query.isLoading && !query.isError && !hasMeaningfulData(data);
  const collaboratorAverages = useMemo(() => {
    if (!collaboratorData.length) {
      return {
        dispensations: 0,
        positiveDifference: 0,
        pendingContributions: 0,
      };
    }

    return {
      dispensations:
        collaboratorData.reduce((sum, item) => sum + item.totalDispensations, 0) /
        collaboratorData.length,
      positiveDifference:
        collaboratorData.reduce(
          (sum, item) => sum + item.positiveDifferenceGrams,
          0,
        ) / collaboratorData.length,
      pendingContributions:
        collaboratorData.reduce(
          (sum, item) => sum + item.pendingContributionsGenerated,
          0,
        ) / collaboratorData.length,
    };
  }, [collaboratorData]);
  const collaboratorRows = useMemo(
    () =>
      collaboratorData.map((item) => ({
        ...item,
        alerts: buildOperationalAlerts(item, collaboratorAverages),
      })),
    [collaboratorAverages, collaboratorData],
  );
  const collaboratorAlertCount = collaboratorRows.filter(
    (item) => item.alerts.length > 0,
  ).length;

  if (!isHydrated || !canViewAnalytics || hasRole('SUPERADMIN')) {
    return null;
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Analítica"
          description="Consulta la evolución del club, la actividad diaria, inventario, socios y aportaciones."
          action={
            query.data ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { printAnalyticsSummaryReport } = await import('@/lib/report-pdf');
                  printAnalyticsSummaryReport(query.data);
                }}
              >
                <Printer size={15} />
                Imprimir informe
              </Button>
            ) : null
          }
        />

        <Card className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['today', 'Hoy'],
                ['yesterday', 'Ayer'],
                ['last7', 'Últimos 7 días'],
                ['month', 'Este mes'],
                ['custom', 'Rango personalizado'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={preset === value ? 'default' : 'outline'}
                  onClick={() => setPreset(value as PresetKey)}
                  className="justify-start"
                >
                  <CalendarDays size={16} />
                  {label}
                </Button>
              ))}
            </div>
            {preset === 'custom' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-text-muted">Desde</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border-light bg-white px-3 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-text-muted">Hasta</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="h-10 w-full rounded-lg border border-border-light bg-white px-3 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </label>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} className="h-4 w-4 accent-brand-primary rounded" />
              Comparar con periodo anterior
              {compareEnabled && prevQuery.isLoading ? <Loader2 size={14} className="animate-spin text-text-muted" /> : null}
            </label>
          </div>
        </Card>

        {query.isLoading ? <AnalyticsSkeleton /> : null}

        {query.isError ? (
          <ErrorState
            title="No se pudo cargar la analítica."
            message="Cambia el rango de fechas para ver más actividad."
            onRetry={() => query.refetch()}
          />
        ) : null}
        {empty ? (
          <EmptyState
            title="No hay datos para este periodo."
            text="Cambia el rango de fechas para ver más actividad."
          />
        ) : null}

        {data && !query.isLoading && !query.isError && !empty ? (
          <SectionErrorBoundary title="No se pudo renderizar la analítica">
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Dispensaciones" value={<>{data.totalDispensations}<ComparisonBadge current={data.totalDispensations} previous={prev?.totalDispensations} /></>} icon={<BarChart3 size={18} />} tone="blue" />
              <StatCard title="Creditos registrados" value={<>{formatCurrency(data.totalCredits)}<ComparisonBadge current={data.totalCredits} previous={prev?.totalCredits} /></>} icon={<TrendingUp size={18} />} tone="green" />
              <StatCard title="Media por dispensacion" value={<>{formatCurrency(data.averageDispensation)}<ComparisonBadge current={data.averageDispensation} previous={prev?.averageDispensation} /></>} icon={<TrendingUp size={18} />} tone="blue" />
              <StatCard title="Socios activos" value={<>{data.activeMembers}<ComparisonBadge current={data.activeMembers} previous={prev?.activeMembers} /></>} description={`${data.newMembers} altas en el periodo`} icon={<Users size={18} />} tone="green" />
              <StatCard title="Pendientes de aportacion" value={<>{formatCurrency(data.pendingContributions)}<ComparisonBadge current={data.pendingContributions} previous={prev?.pendingContributions} /></>} icon={<HandCoins size={18} />} tone="amber" />
              <StatCard title="Inventario bajo" value={data.lowInventoryCount} description={`${data.outOfAvailabilityCount} sin disponibilidad`} icon={<Boxes size={18} />} tone="amber" />
              <StatCard title="Merma por bascula" value={formatCurrency(data.scaleWastePositive + data.scaleWasteNegative)} description={`+${data.scaleWastePositive.toFixed(2)} / -${data.scaleWasteNegative.toFixed(2)}`} icon={<TrendingDown size={18} />} tone="red" />
              <StatCard title="Diferencia de caja" value={formatCurrency(data.cashDifference)} description={`Esperado: ${formatCurrency(data.cashExpected)}`} icon={<Wallet size={18} />} tone={data.cashDifference === 0 ? 'neutral' : data.cashDifference > 0 ? 'green' : 'red'} />
            </div>

            <Section title="Resumen general" description={`Periodo analizado: ${formatDate(data.range.dateFrom)} - ${formatDate(data.range.dateTo)}`}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Aportaciones a terceros" value={formatCurrency(data.thirdPartyContributions)} tone="neutral" />
                <StatCard title="Diferencia positiva" value={data.scaleWastePositive.toFixed(2)} tone="green" />
                <StatCard title="Diferencia negativa" value={data.scaleWasteNegative.toFixed(2)} tone="red" />
                <StatCard title="Cumpleaños este mes" value={data.birthdayMembersThisMonth.length} tone="neutral" />
              </div>
            </Section>

            {canViewOperationalPerformance ? (
              <Section
                title="Rendimiento operativo"
                description="Comparativa de actividad, diferencias y señales operativas por colaborador."
              >
                {collaboratorQuery.isLoading ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-28 w-full" />
                      ))}
                    </div>
                    <Skeleton className="h-72 w-full" />
                  </div>
                ) : collaboratorQuery.isError ? (
                  <div className="rounded-xl border border-dashed border-border-light bg-white p-6 text-center">
                    <p className="font-medium text-text-primary">
                      No se pudo cargar el rendimiento operativo.
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Reintenta la carga para revisar la comparativa de colaboradores.
                    </p>
                    <Button className="mt-4" onClick={() => collaboratorQuery.refetch()}>
                      Reintentar
                    </Button>
                  </div>
                ) : collaboratorRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border-light bg-white p-6 text-center">
                    <p className="font-medium text-text-primary">
                      No hay datos para este periodo.
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Cambia el rango de fechas para ver más actividad.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <StatCard
                        title="Colaboradores comparados"
                        value={collaboratorRows.length}
                        icon={<UserCog size={18} />}
                        tone="blue"
                      />
                      <StatCard
                        title="Créditos registrados"
                        value={formatCurrency(
                          collaboratorRows.reduce(
                            (sum, item) => sum + item.creditsRegistered,
                            0,
                          ),
                        )}
                        icon={<TrendingUp size={18} />}
                        tone="green"
                      />
                      <StatCard
                        title="Merma por báscula"
                        value={formatGrams(
                          collaboratorRows.reduce(
                            (sum, item) => sum + item.positiveDifferenceGrams,
                            0,
                          ),
                        )}
                        description={`${collaboratorRows.reduce((sum, item) => sum + item.toleranceExceededCount, 0)} tolerancias excedidas`}
                        icon={<Scale size={18} />}
                        tone="amber"
                      />
                      <StatCard
                        title="Alertas operativas"
                        value={collaboratorAlertCount}
                        description="Señales neutras para revisar"
                        icon={<AlertTriangle size={18} />}
                        tone={collaboratorAlertCount > 0 ? 'amber' : 'neutral'}
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                      <div className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                        <div className="mb-3">
                          <h3 className="font-semibold text-text-primary">
                            Créditos por colaborador
                          </h3>
                          <p className="text-sm text-text-muted">
                            Comparativa de actividad registrada en el periodo.
                          </p>
                        </div>
                        <MeasuredChart className="h-72" minHeight={240}>
                          {({ width, height }) => (
                            <BarChart width={width} height={height} data={collaboratorRows}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                              <YAxis tickLine={false} axisLine={false} fontSize={12} />
                              <Tooltip formatter={formatTooltipValue} />
                              <Bar dataKey="creditsRegistered" fill="#10b981" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          )}
                        </MeasuredChart>
                      </div>

                      <div className="rounded-xl border border-border-light bg-white p-4">
                        <div className="mb-3">
                          <h3 className="font-semibold text-text-primary">
                            Alertas operativas
                          </h3>
                          <p className="text-sm text-text-muted">
                            Indicadores de revisión por colaborador.
                          </p>
                        </div>
                        <div className="space-y-3">
                          {collaboratorRows.some((item) => item.alerts.length > 0) ? (
                            collaboratorRows
                              .filter((item) => item.alerts.length > 0)
                              .map((item) => (
                                <div
                                  key={item.userId}
                                  className="rounded-xl border border-border-light bg-bg-soft p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-text-primary">
                                      {item.name}
                                    </p>
                                    <span className="text-xs font-medium text-text-muted">
                                      {getCollaboratorRoleLabel(item.role)}
                                    </span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {item.alerts.map((alert) => (
                                      <span
                                        key={`${item.userId}-${alert}`}
                                        className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                                      >
                                        {alert}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="rounded-xl border border-border-light bg-white p-4 shadow-card text-sm text-text-muted">
                              No se detectaron alertas operativas en este periodo.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="hidden overflow-x-auto rounded-xl border border-border-light lg:block">
                      <table className="min-w-[1200px] divide-y divide-border-light text-sm">
                        <thead className="bg-bg-soft">
                          <tr className="text-left text-text-muted">
                            <th className="px-4 py-3 font-medium">Colaborador</th>
                            <th className="px-4 py-3 font-medium">Rol</th>
                            <th className="px-4 py-3 font-medium">Dispensaciones</th>
                            <th className="px-4 py-3 font-medium">Créditos</th>
                            <th className="px-4 py-3 font-medium">Media</th>
                            <th className="px-4 py-3 font-medium">Solicitado</th>
                            <th className="px-4 py-3 font-medium">Peso real</th>
                            <th className="px-4 py-3 font-medium">Dif. +</th>
                            <th className="px-4 py-3 font-medium">Dif. -</th>
                            <th className="px-4 py-3 font-medium">Tolerancias</th>
                            <th className="px-4 py-3 font-medium">Bonificaciones</th>
                            <th className="px-4 py-3 font-medium">Pendientes</th>
                            <th className="px-4 py-3 font-medium">Cancelaciones</th>
                            <th className="px-4 py-3 font-medium">Caja</th>
                            <th className="px-4 py-3 font-medium">Última actividad</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light bg-white">
                          {collaboratorRows.map((item) => (
                            <tr key={item.userId} className="align-top">
                              <td className="px-4 py-3">
                                <div className="font-medium text-text-primary">{item.name}</div>
                                {item.alerts.length ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.alerts.map((alert) => (
                                      <span
                                        key={`${item.userId}-${alert}`}
                                        className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                                      >
                                        {alert}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-text-secondary">{getCollaboratorRoleLabel(item.role)}</td>
                              <td className="px-4 py-3 text-text-primary">{item.totalDispensations}</td>
                              <td className="px-4 py-3 text-text-primary">{formatCurrency(item.creditsRegistered)}</td>
                              <td className="px-4 py-3 text-text-primary">{formatCurrency(item.averageDispensation)}</td>
                              <td className="px-4 py-3 text-text-primary">{formatGrams(item.requestedGrams)}</td>
                              <td className="px-4 py-3 text-text-primary">{formatGrams(item.actualDispensedGrams)}</td>
                              <td className="px-4 py-3 text-[#15140F]">{formatGrams(item.positiveDifferenceGrams)}</td>
                              <td className="px-4 py-3 text-red-700">{formatGrams(item.negativeDifferenceGrams)}</td>
                              <td className="px-4 py-3 text-text-primary">{item.toleranceExceededCount}</td>
                              <td className="px-4 py-3 text-text-primary">{formatCurrency(item.bonusesApplied)}</td>
                              <td className="px-4 py-3 text-text-primary">{formatCurrency(item.pendingContributionsGenerated)}</td>
                              <td className="px-4 py-3 text-text-primary">{item.cancellations}</td>
                              <td className={`px-4 py-3 ${item.cashDifference < 0 ? 'text-red-700' : 'text-[#15140F]'}`}>{formatCurrency(item.cashDifference)}</td>
                              <td className="px-4 py-3 text-text-secondary">
                                {item.lastActivity ? formatDate(item.lastActivity) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-3 lg:hidden">
                      {collaboratorRows.map((item) => (
                        <div
                          key={item.userId}
                          className="rounded-xl border border-border-light bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-text-primary">{item.name}</h3>
                              <p className="text-sm text-text-muted">
                                {getCollaboratorRoleLabel(item.role)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-text-muted">Créditos</p>
                              <p className="font-semibold text-text-primary">
                                {formatCurrency(item.creditsRegistered)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                              <p className="text-xs text-text-muted">Dispensaciones</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {item.totalDispensations}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                              <p className="text-xs text-text-muted">Media</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {formatCurrency(item.averageDispensation)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                              <p className="text-xs text-text-muted">Solicitado</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {formatGrams(item.requestedGrams)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                              <p className="text-xs text-text-muted">Peso real</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {formatGrams(item.actualDispensedGrams)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                              <p className="text-xs text-text-muted">Dif. + / Dif. -</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {formatGrams(item.positiveDifferenceGrams)} / {formatGrams(item.negativeDifferenceGrams)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                              <p className="text-xs text-text-muted">Pendientes</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {formatCurrency(item.pendingContributionsGenerated)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.alerts.length ? item.alerts.map((alert) => (
                              <span
                                key={`${item.userId}-${alert}`}
                                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                              >
                                {alert}
                              </span>
                            )) : (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-[#15140F]">
                                Sin alertas operativas
                              </span>
                            )}
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                            <p>Bonificaciones: {formatCurrency(item.bonusesApplied)}</p>
                            <p>Tolerancias excedidas: {item.toleranceExceededCount}</p>
                            <p>Cancelaciones: {item.cancellations}</p>
                            <p>Caja: {formatCurrency(item.cashDifference)}</p>
                            <p className="sm:col-span-2">
                              Última actividad: {item.lastActivity ? formatDate(item.lastActivity) : '-'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              <Section title="Actividad por día" description="Dispensaciones y créditos registrados en el periodo.">
                <div className="h-80">
                  <MeasuredChart className="h-80" minHeight={240}>
                    {({ width, height }) => <LineChart width={width} height={height} data={data.activityByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} labelFormatter={(label) => `Día ${label}`} />
                      <Line type="monotone" dataKey="credits" stroke="#10b981" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="dispensations" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </LineChart>}
                  </MeasuredChart>
                </div>
              </Section>

              <Section title="Productos más dispensados" description="Productos con más actividad en el periodo.">
                <div className="h-80">
                  <MeasuredChart className="h-80" minHeight={240}>
                    {({ width, height }) => <BarChart width={width} height={height} data={data.topProducts}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Bar dataKey="totalCredits" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>}
                  </MeasuredChart>
                </div>
              </Section>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Section title="Socios" description="Distribución actual por clase y próximos cumpleaños del mes.">
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <div className="h-64">
                    <MeasuredChart className="h-64" minHeight={220}>
                      {({ width, height }) => <PieChart width={width} height={height}>
                        <Pie data={data.membersByClass} dataKey="count" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {data.membersByClass.map((entry, index) => (
                            <Cell key={entry.memberClass} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>}
                    </MeasuredChart>
                  </div>
                  <div className="space-y-3">
                    {data.membersByClass.map((item) => (
                      <div key={item.memberClass} className="rounded-xl border border-border-light bg-bg-soft p-3">
                        <p className="font-medium text-text-primary">{item.label}</p>
                        <p className="mt-1 text-sm text-text-muted">{item.count} socios</p>
                      </div>
                    ))}
                    <div className="rounded-xl border border-border-light bg-white p-3">
                      <p className="font-medium text-text-primary">Cumpleaños este mes</p>
                      <div className="mt-3 space-y-2">
                        {data.birthdayMembersThisMonth.length ? data.birthdayMembersThisMonth.slice(0, 5).map((member) => (
                          <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-text-primary">{member.name}</span>
                            <span className="text-text-muted">{formatDate(member.birthDate)}</span>
                          </div>
                        )) : <p className="text-sm text-text-muted">Sin cumpleaños en este mes.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Mermas" description="Comparativa entre diferencia positiva y diferencia negativa detectada por báscula.">
                <div className="h-80">
                  <MeasuredChart className="h-80" minHeight={240}>
                    {({ width, height }) => <BarChart
                      width={width}
                      height={height}
                      data={[
                        { label: 'Diferencia positiva', total: data.scaleWastePositive },
                        { label: 'Diferencia negativa', total: data.scaleWasteNegative },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip formatter={formatTooltipValue} />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Bar>
                    </BarChart>}
                  </MeasuredChart>
                </div>
              </Section>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Section title="Inventario" description="Estado actual del inventario disponible.">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                    <p className="text-sm text-text-muted">Inventario bajo</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{data.lowInventoryCount}</p>
                  </div>
                  <div className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                    <p className="text-sm text-text-muted">Sin disponibilidad</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{data.outOfAvailabilityCount}</p>
                  </div>
                </div>
              </Section>

              <Section title="Caja" description="Última referencia conocida de caja del tenant.">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                    <p className="text-sm text-text-muted">Efectivo esperado</p>
                    <p className="mt-2 text-2xl font-semibold text-text-primary">{formatCurrency(data.cashExpected)}</p>
                  </div>
                  <div className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                    <p className="text-sm text-text-muted">Diferencia de caja</p>
                    <p className={`mt-2 text-2xl font-semibold ${data.cashDifference < 0 ? 'text-red-700' : 'text-[#15140F]'}`}>
                      {formatCurrency(data.cashDifference)}
                    </p>
                  </div>
                </div>
              </Section>

              <Section title="Productos más dispensados" description="Detalle resumido por producto.">
                <div className="space-y-3">
                  {data.topProducts.length ? data.topProducts.slice(0, 5).map((product) => (
                    <div key={product.productId} className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-bg-soft p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text-primary">{product.name}</p>
                        <p className="text-sm text-text-muted">{product.quantity.toFixed(2)} {product.unitType ?? ''}</p>
                      </div>
                      <p className="shrink-0 font-semibold text-text-primary">{formatCurrency(product.totalCredits)}</p>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-border-light bg-white p-4 text-sm text-text-muted">
                      No hay datos para este periodo.
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </>
          </SectionErrorBoundary>
        ) : null}

        {allowed && !query.isLoading && !query.isError && !empty ? (
          <>
            <SectionErrorBoundary title="No se pudo renderizar el rendimiento por producto">
              <Section title="Rendimiento por producto" description="Actividad y créditos registrados por producto en el periodo.">
                {productPerf.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : productPerf.isError ? (
                  <div className="rounded-xl border border-dashed border-border-light bg-white p-6 text-center">
                    <p className="text-sm text-text-muted">No se pudo cargar el rendimiento por producto.</p>
                    <Button className="mt-3" size="sm" onClick={() => productPerf.refetch()}>Reintentar</Button>
                  </div>
                ) : !productPerf.data?.length ? (
                  <p className="text-sm text-text-muted">No hay datos de productos para este periodo.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border-light">
                    <table className="min-w-full divide-y divide-border-light text-sm">
                      <thead className="bg-bg-soft">
                        <tr className="text-left text-text-muted">
                          <th className="px-4 py-3 font-medium">Producto</th>
                          <th className="px-4 py-3 font-medium">Cantidad</th>
                          <th className="px-4 py-3 font-medium">Ingresos</th>
                          <th className="px-4 py-3 font-medium">Dispensaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light bg-white">
                        {productPerf.data.map((product) => (
                          <tr key={product.id}>
                            <td className="px-4 py-3 font-medium text-text-primary">{product.name}</td>
                            <td className="px-4 py-3 text-text-secondary">{product.quantity}</td>
                            <td className="px-4 py-3 text-text-primary">{formatCredits(product.revenue)}</td>
                            <td className="px-4 py-3 text-text-secondary">{product.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </SectionErrorBoundary>

            <SectionErrorBoundary title="No se pudo renderizar el gasto por socio">
              <Section title="Gasto por socio" description="Socios con mayor actividad de gasto en el periodo.">
                {memberSpend.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : memberSpend.isError ? (
                  <div className="rounded-xl border border-dashed border-border-light bg-white p-6 text-center">
                    <p className="text-sm text-text-muted">No se pudo cargar el gasto por socio.</p>
                    <Button className="mt-3" size="sm" onClick={() => memberSpend.refetch()}>Reintentar</Button>
                  </div>
                ) : !memberSpend.data?.length ? (
                  <p className="text-sm text-text-muted">No hay datos de socios para este periodo.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border-light">
                    <table className="min-w-full divide-y divide-border-light text-sm">
                      <thead className="bg-bg-soft">
                        <tr className="text-left text-text-muted">
                          <th className="px-4 py-3 font-medium">Socio</th>
                          <th className="px-4 py-3 font-medium">N.º Socio</th>
                          <th className="px-4 py-3 font-medium">Gasto total</th>
                          <th className="px-4 py-3 font-medium">Dispensaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light bg-white">
                        {memberSpend.data.map((member) => (
                          <tr key={member.id}>
                            <td className="px-4 py-3 font-medium text-text-primary">{member.name}</td>
                            <td className="px-4 py-3 text-text-secondary">{member.memberNumber ?? '-'}</td>
                            <td className="px-4 py-3 text-text-primary">{formatCredits(member.totalSpent)}</td>
                            <td className="px-4 py-3 text-text-secondary">{member.salesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </SectionErrorBoundary>

            <SectionErrorBoundary title="No se pudo renderizar el estado de inventario">
              <Section title="Estado de inventario" description="Vista general del stock actual y alertas de inventario.">
                {inventoryTrends.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : inventoryTrends.isError ? (
                  <div className="rounded-xl border border-dashed border-border-light bg-white p-6 text-center">
                    <p className="text-sm text-text-muted">No se pudo cargar el estado de inventario.</p>
                    <Button className="mt-3" size="sm" onClick={() => inventoryTrends.refetch()}>Reintentar</Button>
                  </div>
                ) : !inventoryTrends.data ? (
                  <p className="text-sm text-text-muted">No hay datos de inventario disponibles.</p>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <StatCard title="Total productos" value={inventoryTrends.data.summary.totalProducts} icon={<Boxes size={18} />} tone="blue" />
                      <StatCard title="Sin stock" value={inventoryTrends.data.summary.outOfStock} icon={<AlertTriangle size={18} />} tone="red" />
                      <StatCard title="Stock bajo" value={inventoryTrends.data.summary.lowStock} icon={<TrendingDown size={18} />} tone="amber" />
                      <StatCard title="Mermas 30d" value={formatCredits(inventoryTrends.data.summary.totalWaste30d)} icon={<Scale size={18} />} tone="neutral" />
                    </div>

                    {inventoryTrends.data.products.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-border-light">
                        <table className="min-w-full divide-y divide-border-light text-sm">
                          <thead className="bg-bg-soft">
                            <tr className="text-left text-text-muted">
                              <th className="px-4 py-3 font-medium">Producto</th>
                              <th className="px-4 py-3 font-medium">Stock actual</th>
                              <th className="px-4 py-3 font-medium">Stock mínimo</th>
                              <th className="px-4 py-3 font-medium">Mermas 30d</th>
                              <th className="px-4 py-3 font-medium">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-light bg-white">
                            {inventoryTrends.data.products.map((product) => (
                              <tr key={product.id}>
                                <td className="px-4 py-3 font-medium text-text-primary">{product.name}</td>
                                <td className="px-4 py-3 text-text-secondary">{product.currentStock}</td>
                                <td className="px-4 py-3 text-text-secondary">{product.minimumStock}</td>
                                <td className="px-4 py-3 text-text-secondary">{formatCredits(product.waste30d)}</td>
                                <td className="px-4 py-3">
                                  <Badge variant={product.stockStatus === 'OK' ? 'success' : product.stockStatus === 'LOW' ? 'warning' : 'danger'}>
                                    {product.stockStatus === 'OK' ? 'OK' : product.stockStatus === 'LOW' ? 'Stock bajo' : 'Sin stock'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">No hay productos en el inventario.</p>
                    )}
                  </div>
                )}
              </Section>
            </SectionErrorBoundary>
          </>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
