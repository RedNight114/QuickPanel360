"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-state";
import { usePlatformOnboardingQueue } from "@/hooks/usePlatform";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

const lifecycleLabels: Record<string, string> = {
  LEAD: "Lead",
  NEW_SIGNUP: "Alta nueva",
  ONBOARDING: "Onboarding",
  ACTIVE_STABLE: "Activa estable",
  ACTIVE_AT_RISK: "Activa con riesgo",
  SUSPENDED: "Suspendida",
  CHURNED: "Churn",
};

const riskLabels: Record<string, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
};

function riskVariant(risk?: string) {
  if (risk === "HIGH") return "danger";
  if (risk === "MEDIUM") return "warning";
  return "success";
}

function taskVariant(status?: string) {
  if (status === "COMPLETED") return "success";
  if (status === "BLOCKED") return "danger";
  if (status === "IN_PROGRESS") return "warning";
  return "secondary";
}

export default function PlatformOnboardingPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const [query, setQuery] = useState("");
  const [taskStatus, setTaskStatus] = useState("all");
  const [lifecycleStage, setLifecycleStage] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");

  const onboardingQuery = usePlatformOnboardingQueue(
    { q: query, taskStatus, lifecycleStage, riskLevel, take: 100 },
    { enabled: allowed },
  );

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  const items = useMemo(
    () => onboardingQuery.data ?? [],
    [onboardingQuery.data],
  );
  const stats = useMemo(
    () => ({
      total: items.length,
      blocked: items.filter((item) => item.metrics.blockedTasks > 0).length,
      activeRisk: items.filter((item) => item.riskLevel === "HIGH").length,
      completed: items.filter((item) => item.metrics.completionRate === 100)
        .length,
    }),
    [items],
  );

  if (!allowed) return null;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cola de onboarding"
          description="Vista global de altas, activaciones y seguimientos pendientes."
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Empresas en cola"
            value={stats.total}
            icon={<ClipboardList size={18} />}
            tone="blue"
          />
          <StatCard
            title="Con bloqueos"
            value={stats.blocked}
            icon={<AlertTriangle size={18} />}
            tone="red"
          />
          <StatCard
            title="Riesgo alto"
            value={stats.activeRisk}
            icon={<AlertTriangle size={18} />}
            tone="amber"
          />
          <StatCard
            title="100% completadas"
            value={stats.completed}
            icon={<CheckCircle2 size={18} />}
            tone="green"
          />
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search
                size={15}
                className="absolute left-3 top-2.5 text-text-muted"
              />
              <input
                className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
                placeholder="Buscar empresa..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-border-light px-3 text-sm"
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value)}
            >
              <option value="all">Todas las tareas</option>
              <option value="PENDING">Pendientes</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="BLOCKED">Bloqueadas</option>
              <option value="COMPLETED">Completadas</option>
            </select>
            <select
              className="h-10 rounded-lg border border-border-light px-3 text-sm"
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value)}
            >
              <option value="all">Todas las fases</option>
              {Object.entries(lifecycleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-border-light px-3 text-sm"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
            >
              <option value="all">Todos los riesgos</option>
              {Object.entries(riskLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {onboardingQuery.isLoading ? <ListSkeleton rows={5} /> : null}
        {!onboardingQuery.isLoading && items.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              title="Sin onboarding pendiente"
              text="Ahora mismo no hay empresas en la cola de alta o seguimiento."
            />
          </Card>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => {
            const nextTask =
              item.onboardingTasks.find((task) => task.status === "BLOCKED") ??
              item.onboardingTasks.find(
                (task) => task.status === "IN_PROGRESS",
              ) ??
              item.onboardingTasks.find((task) => task.status === "PENDING") ??
              item.onboardingTasks[0];

            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-text-primary">
                        {item.name}
                      </h2>
                      <Badge variant="secondary">
                        {lifecycleLabels[item.lifecycleStage] ??
                          item.lifecycleStage}
                      </Badge>
                      <Badge variant={riskVariant(item.riskLevel)}>
                        {riskLabels[item.riskLevel] ?? item.riskLevel}
                      </Badge>
                      <Badge variant="outline">
                        {item.subscription?.plan?.name ?? "Sin plan"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {item.primaryContact?.name ?? "Sin contacto principal"}
                      {item.primaryContact?.email
                        ? ` · ${item.primaryContact.email}`
                        : ""}
                      {item.city ? ` · ${item.city}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Inicio {formatDate(item.onboardingStartedAt)} · Último
                      contacto {formatDate(item.lastContactAt)} · Activación{" "}
                      {formatDate(item.activatedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link href={`/platform/tenants/${item.id}`}>
                        Abrir ficha
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
                  <div className="rounded-xl border border-border-light bg-bg-soft p-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          Progreso
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-text-primary">
                          {item.metrics.completionRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          Tareas
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {item.metrics.completedTasks}/
                          {item.metrics.totalTasks} completadas
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {item.metrics.inProgressTasks} en curso ·{" "}
                          {item.metrics.pendingTasks} pendientes ·{" "}
                          {item.metrics.blockedTasks} bloqueadas
                        </p>
                      </div>
                      {nextTask ? (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                            Siguiente foco
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge
                              variant={taskVariant(nextTask.status)}
                              size="sm"
                            >
                              {nextTask.status}
                            </Badge>
                            <span className="text-sm font-medium text-text-primary">
                              {nextTask.title}
                            </span>
                          </div>
                          {nextTask.owner ? (
                            <p className="mt-1 text-xs text-text-muted">
                              Responsable: {nextTask.owner}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {item.onboardingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-border-light bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={taskVariant(task.status)} size="sm">
                            {task.status}
                          </Badge>
                          <p className="text-sm font-medium text-text-primary">
                            {task.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-text-muted">
                          {task.description || "Sin descripción adicional."}
                        </p>
                        <p className="mt-2 text-xs text-text-muted">
                          {task.owner
                            ? `Responsable: ${task.owner}`
                            : "Sin responsable"}
                          {task.dueAt
                            ? ` · Vence ${formatDate(task.dueAt)}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </ProtectedLayout>
  );
}
