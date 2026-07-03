"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Building2,
  ClipboardList,
  Headphones,
  Layers,
  Plus,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MeasuredChart } from "@/components/common/measured-chart";
import {
  usePlatformAlerts,
  usePlatformMetrics,
  usePlatformSummary,
  useGenerateMonthlyInvoices,
} from "@/hooks/usePlatform";
import { formatCredits, formatDate } from "@/lib/format";
import type { PlatformSummary, TenantStatus } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const statusLabels: Record<TenantStatus, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activa",
  SUSPENDED: "Suspendida",
  DISABLED: "Deshabilitada",
  ARCHIVED: "Archivada",
};

function statusVariant(status: TenantStatus) {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "danger";
  if (status === "ARCHIVED") return "warning";
  return "secondary";
}

function buildAlerts(summary?: PlatformSummary) {
  if (!summary) return [];

  return [
    summary.suspendedTenants > 0
      ? {
          title: "Empresas suspendidas",
          description: `${summary.suspendedTenants} empresa(s) no pueden acceder al sistema.`,
          href: "/platform/tenants",
          tone: "danger",
        }
      : null,
    summary.archivedTenants > 0
      ? {
          title: "Empresas archivadas",
          description: `${summary.archivedTenants} empresa(s) conservadas fuera de operativa.`,
          href: "/platform/tenants",
          tone: "warning",
        }
      : null,
    (summary.emergencyTenants ?? 0) > 0
      ? {
          title: "Emergencias activas",
          description: `${summary.emergencyTenants} empresa(s) con acceso público bloqueado.`,
          href: "/platform/emergencies",
          tone: "danger",
        }
      : null,
    summary.openCashSessions > 0
      ? {
          title: "Cajas abiertas",
          description: `${summary.openCashSessions} caja(s) abiertas en empresas.`,
          href: "/platform/tenants",
          tone: "neutral",
        }
      : null,
    (summary.tenantsWithoutOwner ?? 0) > 0
      ? {
          title: "Sin owner activo",
          description: `${summary.tenantsWithoutOwner} tenant(s) necesitan revisar responsable.`,
          href: "/platform/tenants",
          tone: "warning",
        }
      : null,
    (summary.tenantsWithoutSettings ?? 0) > 0
      ? {
          title: "Sin configuración",
          description: `${summary.tenantsWithoutSettings} tenant(s) sin configuración inicial.`,
          href: "/platform/tenants",
          tone: "warning",
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    href: string;
    tone: string;
  }>;
}

export default function PlatformPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = usePlatformSummary({ enabled: allowed });
  const metricsQuery = usePlatformMetrics(6, { enabled: allowed });
  const metrics = metricsQuery.data;
  const alertsQuery = usePlatformAlerts({ enabled: allowed });
  const smartAlerts = alertsQuery.data ?? [];
  const generateInvoices = useGenerateMonthlyInvoices();

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) return null;

  const alerts = buildAlerts(summary);
  return (
    <ProtectedLayout>
      <div className="space-y-5">
        <PageHeader
          title="Panel SaaS"
          description="Control global de empresas, actividad y estado de la plataforma."
          action={
            <Button asChild>
              <Link href="/platform/tenants?new=1">
                <Plus size={16} />
                Nueva empresa
              </Link>
            </Button>
          }
        />

        {error ? (
          <ErrorState
            message="No se pudo cargar la información de la plataforma."
            onRetry={() => refetch()}
          />
        ) : null}

        <SectionErrorBoundary
          title="No se pudieron cargar los indicadores"
          message="Recarga esta sección para consultar el resumen global."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Empresas totales"
              value={isLoading ? "-" : (summary?.totalTenants ?? 0)}
              icon={<Building2 size={18} />}
              tone="blue"
            />
            <StatCard
              title="Activas"
              value={summary?.activeTenants ?? 0}
              icon={<TrendingUp size={18} />}
              tone="green"
            />
            <StatCard
              title="Suspendidas"
              value={summary?.suspendedTenants ?? 0}
              icon={<ShieldAlert size={18} />}
              tone="red"
            />
            <StatCard
              title="Archivadas"
              value={summary?.archivedTenants ?? 0}
              icon={<Archive size={18} />}
              tone="amber"
            />
            <StatCard
              title="Colaboradores totales"
              value={summary?.totalUsers ?? 0}
              icon={<Users size={18} />}
              tone="neutral"
            />
            <StatCard
              title="Altas este mes"
              value={summary?.tenantsCreatedThisMonth ?? 0}
              icon={<Plus size={18} />}
              tone="amber"
            />
            <StatCard
              title="Cajas abiertas"
              value={summary?.openCashSessions ?? 0}
              icon={<Wallet size={18} />}
              tone="blue"
            />
            <StatCard
              title="Emergencias activas"
              value={summary?.emergencyTenants ?? 0}
              icon={<ShieldAlert size={18} />}
              tone="red"
            />
          </div>
        </SectionErrorBoundary>

        {/* Metrics charts */}
        {metrics ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-text-primary">
                Ingresos mensuales
              </h2>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Facturación e ingresos recibidos (CR)
              </p>
              {metrics.series.some((s) => s.revenue > 0 || s.payments > 0) ? (
                <MeasuredChart className="mt-4 h-64" minHeight={200}>
                  {({ width, height }) => (
                    <BarChart
                      width={width}
                      height={height}
                      data={metrics.series}
                    >
                      <CartesianGrid stroke="#D9D4C7" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        tickFormatter={(v) => `${v} CR`}
                      />
                      <Tooltip
                        formatter={(v) => formatCredits(v)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #D9D4C7",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Facturado"
                        fill="#166534"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="payments"
                        name="Cobrado"
                        fill="#16A34A"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </MeasuredChart>
              ) : (
                <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-border-light">
                  <p className="text-sm text-text-muted">
                    Sin datos de facturación en este periodo
                  </p>
                </div>
              )}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="text-text-muted">
                  MRR:{" "}
                  <strong className="text-text-primary">
                    {formatCredits(metrics.mrr)}
                  </strong>
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-text-primary">
                Crecimiento de empresas
              </h2>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Empresas activas y altas mensuales
              </p>
              <MeasuredChart className="mt-4 h-64" minHeight={200}>
                {({ width, height }) => (
                  <LineChart
                    width={width}
                    height={height}
                    data={metrics.series}
                  >
                    <CartesianGrid stroke="#D9D4C7" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #D9D4C7",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tenants"
                      name="Total empresas"
                      stroke="#166534"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newTenants"
                      name="Altas"
                      stroke="#D97706"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                )}
              </MeasuredChart>
            </Card>
          </div>
        ) : null}

        {/* Tenant usage table */}
        {metrics?.tenantUsage.length ? (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-text-primary">
              Uso por empresa
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Top 10 empresas por actividad
            </p>
            <div className="mt-3 overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2.5">Empresa</th>
                    <th className="px-3 py-2.5 text-right">Colab.</th>
                    <th className="px-3 py-2.5 text-right">Socios</th>
                    <th className="px-3 py-2.5 text-right">Prod.</th>
                    <th className="px-3 py-2.5 text-right">Disp.</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.tenantUsage.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border-light/50 last:border-0 transition-colors hover:bg-bg-soft/60"
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/platform/tenants/${t.id}`}
                          className="text-sm font-medium text-text-primary hover:text-brand-primary transition-colors"
                        >
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">
                        {t.users}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">
                        {t.members}
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary tabular-nums">
                        {t.products}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-text-primary tabular-nums">
                        {t.dispensations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <SectionErrorBoundary
              title="No se pudieron cargar las empresas recientes"
              message="Recarga esta sección para volver a intentarlo."
            >
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-text-primary">
                    Empresas recientes
                  </h2>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/platform/tenants">Ver todas</Link>
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {summary?.recentTenants?.length ? (
                    summary.recentTenants.map((tenant) => (
                      <Link
                        key={tenant.id}
                        href={`/platform/tenants/${tenant.id}`}
                        className="flex items-center gap-3 rounded-lg border border-border-light p-3 transition-all duration-200 hover:border-brand-primary/30 hover:shadow-sm hover:bg-white"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-lighter text-brand-primary text-xs font-bold">
                          {tenant.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {tenant.name}
                            </p>
                            <Badge variant={statusVariant(tenant.status)} size="sm">
                              {statusLabels[tenant.status]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {tenant.subscription?.plan?.name ?? "Sin plan"} · {tenant.city || "Sin ciudad"} · {formatDate(tenant.createdAt)}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState title="Sin empresas recientes" />
                  )}
                </div>
              </Card>
            </SectionErrorBoundary>
          </div>

          <div className="space-y-6">
            <SectionErrorBoundary
              title="No se pudieron cargar las alertas"
              message="Recarga esta sección para revisar las incidencias de plataforma."
            >
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-text-primary">
                    Alertas
                  </h2>
                  {smartAlerts.length > 0 ? (
                    <Badge variant="warning" size="sm">{smartAlerts.length}</Badge>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {smartAlerts.length > 0 ? (
                    smartAlerts.map((alert, i) => {
                      const bg =
                        alert.severity === "critical"
                          ? "border-red-200 bg-red-50"
                          : alert.severity === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : "border-blue-200 bg-blue-50";
                      const text =
                        alert.severity === "critical"
                          ? "text-red-800"
                          : alert.severity === "warning"
                            ? "text-amber-800"
                            : "text-blue-800";
                      return (
                        <div
                          key={`${alert.type}-${alert.tenantId}-${i}`}
                          className={`rounded-xl border p-3 ${bg}`}
                        >
                          <p className={`text-sm font-medium ${text}`}>
                            {alert.title}
                          </p>
                          <p className={`mt-0.5 text-xs ${text} opacity-80`}>
                            {alert.description}
                          </p>
                          {alert.tenantId ? (
                            <Link
                              href={`/platform/tenants/${alert.tenantId}`}
                              className="mt-1.5 inline-block text-xs font-medium text-brand-primary hover:underline"
                            >
                              Ver empresa →
                            </Link>
                          ) : null}
                        </div>
                      );
                    })
                  ) : alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <Link
                        key={alert.title}
                        href={alert.href}
                        className="block rounded-xl border border-border-light p-3 transition hover:bg-bg-soft"
                      >
                        <p className="text-sm font-medium text-text-primary">
                          {alert.title}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {alert.description}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      Todo estable en plataforma.
                    </div>
                  )}
                </div>
              </Card>
            </SectionErrorBoundary>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-text-primary mb-3">
                Acciones rápidas
              </h2>
              <div className="grid gap-1.5">
                {[
                  { href: "/platform/tenants", icon: Building2, label: "Empresas" },
                  { href: "/platform/onboarding", icon: ClipboardList, label: "Onboarding" },
                  { href: "/platform/billing", icon: Wallet, label: "Facturación" },
                  { href: "/platform/plans", icon: Layers, label: "Planes" },
                  { href: "/platform/emergencies", icon: ShieldAlert, label: "Emergencias" },
                  { href: "/platform/support", icon: Headphones, label: "Soporte" },
                ].map(({ href, icon: QIcon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-soft hover:text-text-primary"
                  >
                    <QIcon size={16} className="shrink-0" />
                    {label}
                  </Link>
                ))}
                <div className="my-1.5 border-t border-border-light" />
                <button
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg-soft hover:text-text-primary disabled:opacity-50 w-full text-left"
                  disabled={generateInvoices.isPending}
                  onClick={async () => {
                    try {
                      const result = await generateInvoices.mutateAsync();
                      if (result.generated > 0) {
                        toast.success(
                          `${result.generated} factura${result.generated !== 1 ? "s" : ""} generada${result.generated !== 1 ? "s" : ""}.`,
                        );
                      } else {
                        toast.info(
                          "Todas las facturas del mes ya están generadas.",
                        );
                      }
                    } catch {
                      toast.error("No se pudieron generar las facturas.");
                    }
                  }}
                >
                  <Wallet size={16} className="shrink-0" />
                  {generateInvoices.isPending
                    ? "Generando..."
                    : "Generar facturas del mes"}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

