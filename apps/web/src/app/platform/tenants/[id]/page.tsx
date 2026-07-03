"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  Headphones,
  History,
  Mail,
  Phone,
  Printer,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { ListSkeleton } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import {
  useAssignTenantPlan,
  useCreatePlatformInvoice,
  useCreatePlatformPayment,
  useCreateTenantContact,
  useCreateTenantOnboardingTask,
  useDeleteTenant,
  useDeleteTenantContact,
  useDeleteTenantOnboardingTask,
  useExportTenantData,
  usePlatformAudit,
  usePlatformInvoices,
  usePlatformPayments,
  usePlatformPlans,
  usePlatformTenant,
  useUpdatePlatformInvoice,
  useUpdateTenantContact,
  useUpdateTenantOnboardingTask,
  useUpdateTenantWorkspace,
} from "@/hooks/usePlatform";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { formatCredits, formatDate } from "@/lib/format";
import type { TenantLifecycleStage, TenantRiskLevel } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/auth-provider";

type TabKey = "summary" | "workspace" | "users" | "activity" | "billing";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "summary", label: "Resumen" },
  { key: "workspace", label: "Expediente SaaS" },
  { key: "users", label: "Colaboradores" },
  { key: "activity", label: "Actividad" },
  { key: "billing", label: "Facturación" },
];

function statusVariant(status?: string) {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "danger";
  if (status === "ARCHIVED") return "warning";
  return "secondary";
}

function accessVariant(status?: string) {
  if (status === "ENABLED") return "success";
  if (status === "EMERGENCY_LOCKED") return "danger";
  return "secondary";
}

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

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const [tab, setTab] = useState<TabKey>("summary");

  const searchParams = useSearchParams();
  const isSetup = searchParams.get("setup") === "1";

  const tenantQuery = usePlatformTenant(params.id, { enabled: allowed });
  const auditQuery = usePlatformAudit(
    { tenantId: params.id, take: 12 },
    { enabled: allowed },
  );
  const invoicesQuery = usePlatformInvoices(
    { tenantId: params.id },
    { enabled: allowed },
  );
  const paymentsQuery = usePlatformPayments(
    { tenantId: params.id },
    { enabled: allowed },
  );
  const plansQuery = usePlatformPlans({ enabled: allowed && isSetup });
  const assignPlan = useAssignTenantPlan();
  const exportQuery = useExportTenantData(params.id);
  const deleteTenant = useDeleteTenant();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  const tenant = tenantQuery.data;
  const metrics = tenant?.metrics;
  const invoices = invoicesQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];
  const audit = auditQuery.data ?? [];

  const summaryStats = useMemo(
    () => [
      {
        title: "Colaboradores",
        value: metrics?.usersCount ?? 0,
        icon: <Users size={18} />,
        tone: "blue" as const,
      },
      {
        title: "Socios",
        value: metrics?.membersCount ?? 0,
        icon: <Users size={18} />,
        tone: "green" as const,
      },
      {
        title: "Dispensaciones",
        value: metrics?.salesCount ?? 0,
        icon: <Wallet size={18} />,
        tone: "amber" as const,
      },
      {
        title: "Última actividad",
        value: formatDate(metrics?.lastActivityAt),
        icon: <History size={18} />,
        tone: "neutral" as const,
      },
    ],
    [metrics],
  );

  if (!allowed) return null;

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title={tenant?.name ?? "Empresa"}
          description="Ficha global de la empresa SaaS."
          action={
            <Button asChild variant="outline">
              <Link href="/platform/tenants">
                <ArrowLeft size={16} />
                Volver
              </Link>
            </Button>
          }
        />

        {tenantQuery.isLoading ? <ListSkeleton rows={6} /> : null}

        {tenant ? (
          <>
            <Card className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-lighter text-brand-primary">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                      <Badge variant={accessVariant(tenant.accessStatus)}>
                        {tenant.accessStatus}
                      </Badge>
                      <Badge variant="outline">
                        {tenant.subscription?.plan?.name ?? "Sin plan"}
                      </Badge>
                      <Badge variant="secondary">
                        {lifecycleLabels[tenant.lifecycleStage] ??
                          tenant.lifecycleStage}
                      </Badge>
                      <Badge variant={riskVariant(tenant.riskLevel)}>
                        {riskLabels[tenant.riskLevel] ?? tenant.riskLevel}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-text-muted">
                      {tenant.legalName || "Sin razón social"} ·{" "}
                      {tenant.taxId || "Sin identificación fiscal"}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {tenant.email || "Sin email"} ·{" "}
                      {tenant.phone || "Sin teléfono"} ·{" "}
                      {tenant.city || "Sin ciudad"} ·{" "}
                      {tenant.country || "Sin país"}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Alta {formatDate(tenant.createdAt)} · Última actividad{" "}
                      {formatDate(metrics?.lastActivityAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/platform/support?tenantId=${tenant.id}`}>
                      <Headphones size={15} />
                      Soporte
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/platform/audit?tenantId=${tenant.id}`}>
                      Ver auditoría
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={exportQuery.isFetching}
                    onClick={async () => {
                      const result = await exportQuery.refetch();
                      if (result.data) {
                        const blob = new Blob(
                          [JSON.stringify(result.data, null, 2)],
                          { type: "application/json" },
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `export-${tenant.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Datos exportados correctamente.");
                      }
                    }}
                  >
                    <Download size={15} />
                    {exportQuery.isFetching
                      ? "Exportando..."
                      : "Exportar datos"}
                  </Button>
                  {tenant.status !== "ACTIVE" ? (
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 size={15} />
                      Eliminar
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>

            {/* Onboarding banner */}
            {isSetup ? (
              <Card className="border-brand-primary/30 bg-brand-lighter/20 p-5">
                <h2 className="text-base font-semibold text-text-primary">
                  Configuración inicial
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Empresa creada correctamente. Asigna un plan para definir los
                  límites y módulos disponibles.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {plansQuery.data
                    ?.filter((p) => p.status === "ACTIVE")
                    .map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={async () => {
                          try {
                            await assignPlan.mutateAsync({
                              tenantId: params.id,
                              planId: plan.id,
                            });
                            toast.success(
                              `Plan "${plan.name}" asignado correctamente.`,
                            );
                            router.replace(`/platform/tenants/${params.id}`);
                          } catch {
                            toast.error("No se pudo asignar el plan.");
                          }
                        }}
                        disabled={assignPlan.isPending}
                        className={`rounded-xl border p-4 text-left transition hover:border-brand-primary/50 hover:shadow-card ${
                          tenant.subscription?.plan?.id === plan.id
                            ? "border-brand-primary bg-brand-lighter/40"
                            : "border-border-light bg-white"
                        }`}
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          {plan.name}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {formatCredits(plan.priceMonthly)}/mes
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {plan.maxUsers
                            ? `${plan.maxUsers} colaboradores`
                            : "Sin límite de colaboradores"}
                          {" · "}
                          {plan.maxProducts
                            ? `${plan.maxProducts} productos`
                            : "Sin límite de productos"}
                        </p>
                      </button>
                    ))}
                </div>
                {tenant.subscription?.plan ? (
                  <p className="mt-3 text-sm text-yellow-700">
                    Plan actual:{" "}
                    <strong>{tenant.subscription.plan.name}</strong>
                  </p>
                ) : null}
              </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryStats.map((item) => (
                <StatCard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  icon={item.icon}
                  tone={item.tone}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                <Button
                  key={item.key}
                  variant={tab === item.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {tab === "summary" ? (
              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <Card className="p-5">
                  <h2 className="text-lg font-semibold text-text-primary">
                    Resumen operativo
                  </h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border-light bg-white p-4 shadow-card text-sm text-text-muted">
                      <p>
                        <span className="text-text-primary font-medium">
                          Módulos activos:
                        </span>{" "}
                        {tenant.modules?.filter(
                          (item) => item.status !== "DISABLED",
                        ).length ?? 0}
                      </p>
                      <p className="mt-2">
                        <span className="text-text-primary font-medium">
                          Sesiones de caja abiertas:
                        </span>{" "}
                        {metrics?.openCashSessions ?? 0}
                      </p>
                      <p className="mt-2">
                        <span className="text-text-primary font-medium">
                          Pendiente de aportación:
                        </span>{" "}
                        {formatCredits(
                          Number(metrics?.receivablesOutstanding ?? 0),
                        )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-light bg-white p-4 shadow-card text-sm text-text-muted">
                      <p>
                        <span className="text-text-primary font-medium">
                          Plan:
                        </span>{" "}
                        {tenant.subscription?.plan?.name ?? "Sin plan"}
                      </p>
                      <p className="mt-2">
                        <span className="text-text-primary font-medium">
                          Estado de suscripción:
                        </span>{" "}
                        {tenant.subscription?.status ?? "No configurado"}
                      </p>
                      <p className="mt-2">
                        <span className="text-text-primary font-medium">
                          Próxima renovación:
                        </span>{" "}
                        {formatDate(tenant.subscription?.nextRenewalAt)}
                      </p>
                      <p className="mt-2">
                        <span className="text-text-primary font-medium">
                          Fin trial:
                        </span>{" "}
                        {formatDate(tenant.subscription?.trialEndsAt)}
                      </p>
                      <p className="mt-2">
                        <span className="text-text-primary font-medium">
                          Fin de acceso:
                        </span>{" "}
                        {formatDate(tenant.subscription?.endsAt)}
                      </p>
                      {tenant.subscription?.notes ? (
                        <p className="mt-2">
                          <span className="text-text-primary font-medium">
                            Notas:
                          </span>{" "}
                          {tenant.subscription.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 text-amber-600" size={18} />
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        Seguridad
                      </h2>
                      <p className="mt-2 text-sm text-text-muted">
                        Estado de acceso: {tenant.accessStatus}. Emergencias
                        activas:{" "}
                        {tenant.emergencyLocks?.filter(
                          (item) => item.status === "ACTIVE",
                        ).length ?? 0}
                        .
                      </p>
                      <p className="mt-2 text-sm text-text-muted">
                        Las acciones administrativas avanzadas se gestionan
                        desde Soporte y Auditoría.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : null}

            {tab === "workspace" ? <WorkspaceTab tenant={tenant} /> : null}

            {tab === "users" ? (
              <Card className="p-5">
                <h2 className="text-lg font-semibold text-text-primary">
                  Colaboradores
                </h2>
                <div className="mt-4 space-y-3">
                  {tenant.users.map((tenantUser) => (
                    <div
                      key={tenantUser.id}
                      className="rounded-xl border border-border-light bg-white p-4 shadow-card"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-text-primary">
                          {tenantUser.user.name}
                        </p>
                        <Badge variant="outline">{tenantUser.role}</Badge>
                        <Badge
                          variant={
                            tenantUser.status === "ACTIVE"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {tenantUser.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-text-muted">
                        {tenantUser.user.email}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        Alta {formatDate(tenantUser.createdAt)} · Último acceso{" "}
                        {formatDate(tenantUser.user.lastLoginAt)}
                      </p>
                    </div>
                  ))}
                  {!tenant.users.length ? (
                    <EmptyState title="Sin colaboradores registrados" />
                  ) : null}
                </div>
              </Card>
            ) : null}

            {tab === "activity" ? (
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      Actividad reciente
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Registro visible desde la auditoría de plataforma.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/platform/audit?tenantId=${tenant.id}`}>
                      Ver auditoría completa
                    </Link>
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {audit.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-border-light bg-white p-4 shadow-card"
                    >
                      <p className="font-medium text-text-primary">
                        {log.action}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {log.actorUser?.name ?? "Sistema"} ·{" "}
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  ))}
                  {!audit.length && !auditQuery.isLoading ? (
                    <EmptyState
                      title="Sin actividad reciente"
                      text="No hay movimientos auditados para esta empresa."
                    />
                  ) : null}
                </div>
              </Card>
            ) : null}

            {tab === "billing" ? (
              <BillingTab
                tenantId={params.id}
                invoices={invoices}
                payments={payments}
                invoicesLoading={invoicesQuery.isLoading}
                paymentsLoading={paymentsQuery.isLoading}
              />
            ) : null}
          </>
        ) : null}

        {!tenantQuery.isLoading && !tenant ? (
          <EmptyState
            title="Empresa no encontrada"
            text="No se pudo cargar la ficha de esta empresa."
          />
        ) : null}

        <Modal
          open={deleteConfirm}
          onClose={() => setDeleteConfirm(false)}
          title="Eliminar empresa definitivamente"
          description="Esta acción es irreversible. Se borrarán todos los datos del club: socios, productos, dispensaciones, caja, inventario y configuración."
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteTenant.isPending}
                onClick={async () => {
                  try {
                    await deleteTenant.mutateAsync(params.id);
                    toast.success("Empresa eliminada definitivamente.");
                    router.replace("/platform/tenants");
                  } catch (err) {
                    toast.error(
                      getErrorMessage(err, "No se pudo eliminar la empresa."),
                    );
                  }
                }}
              >
                {deleteTenant.isPending
                  ? "Eliminando..."
                  : "Eliminar definitivamente"}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">
                Antes de eliminar, exporta los datos si los necesitas.
              </p>
              <p className="mt-1">
                Solo se pueden eliminar empresas archivadas o suspendidas.
              </p>
            </div>
            <p className="text-sm text-text-muted">
              Empresa:{" "}
              <strong className="text-text-primary">{tenant?.name}</strong>
            </p>
          </div>
        </Modal>
      </div>
    </ProtectedLayout>
  );
}

// ─── Billing Tab ─────────────────────────────────────────────────────────────

const invoiceStatusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  PAID: "Cobrada",
  VOID: "Anulada",
};

const invoiceStatusVariant: Record<
  string,
  "secondary" | "warning" | "success" | "danger"
> = {
  DRAFT: "secondary",
  ISSUED: "warning",
  PAID: "success",
  VOID: "danger",
};

function WorkspaceTab({
  tenant,
}: {
  tenant: NonNullable<ReturnType<typeof usePlatformTenant>["data"]>;
}) {
  const updateWorkspace = useUpdateTenantWorkspace();
  const createContact = useCreateTenantContact();
  const updateContact = useUpdateTenantContact();
  const deleteContact = useDeleteTenantContact();
  const createTask = useCreateTenantOnboardingTask();
  const updateTask = useUpdateTenantOnboardingTask();
  const deleteTask = useDeleteTenantOnboardingTask();

  const [lifecycleStage, setLifecycleStage] = useState(tenant.lifecycleStage);
  const [riskLevel, setRiskLevel] = useState(tenant.riskLevel);
  const [platformNotes, setPlatformNotes] = useState(
    tenant.platformNotes ?? "",
  );
  const [lastContactAt, setLastContactAt] = useState(
    tenant.lastContactAt?.slice(0, 10) ?? "",
  );
  const [onboardingStartedAt, setOnboardingStartedAt] = useState(
    tenant.onboardingStartedAt?.slice(0, 10) ?? "",
  );
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState(
    tenant.onboardingCompletedAt?.slice(0, 10) ?? "",
  );
  const [activatedAt, setActivatedAt] = useState(
    tenant.activatedAt?.slice(0, 10) ?? "",
  );

  const [contactModal, setContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [contactPrimary, setContactPrimary] = useState(false);

  const [taskModal, setTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  async function saveWorkspace() {
    try {
      await updateWorkspace.mutateAsync({
        tenantId: tenant.id,
        body: {
          lifecycleStage,
          riskLevel,
          platformNotes,
          lastContactAt: lastContactAt || null,
          onboardingStartedAt: onboardingStartedAt || null,
          onboardingCompletedAt: onboardingCompletedAt || null,
          activatedAt: activatedAt || null,
        },
      });
      toast.success("Expediente actualizado.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo actualizar el expediente."));
    }
  }

  function openCreateContact() {
    setEditingContactId(null);
    setContactName("");
    setContactRole("");
    setContactEmail("");
    setContactPhone("");
    setContactNotes("");
    setContactPrimary(false);
    setContactModal(true);
  }

  function openEditContact(
    contact: NonNullable<typeof tenant.contacts>[number],
  ) {
    setEditingContactId(contact.id);
    setContactName(contact.name);
    setContactRole(contact.role ?? "");
    setContactEmail(contact.email ?? "");
    setContactPhone(contact.phone ?? "");
    setContactNotes(contact.notes ?? "");
    setContactPrimary(contact.isPrimary);
    setContactModal(true);
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: contactName,
      role: contactRole || undefined,
      email: contactEmail || undefined,
      phone: contactPhone || undefined,
      notes: contactNotes || undefined,
      isPrimary: contactPrimary,
    };

    try {
      if (editingContactId) {
        await updateContact.mutateAsync({
          tenantId: tenant.id,
          contactId: editingContactId,
          body,
        });
        toast.success("Contacto actualizado.");
      } else {
        await createContact.mutateAsync({ tenantId: tenant.id, body });
        toast.success("Contacto creado.");
      }

      setContactModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo guardar el contacto."));
    }
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTask.mutateAsync({
        tenantId: tenant.id,
        body: {
          title: taskTitle,
          description: taskDescription || undefined,
          owner: taskOwner || undefined,
          dueAt: taskDueAt || null,
          sortOrder: tenant.onboardingTasks.length,
        },
      });
      toast.success("Tarea creada.");
      setTaskTitle("");
      setTaskDescription("");
      setTaskOwner("");
      setTaskDueAt("");
      setTaskModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo crear la tarea."));
    }
  }

  const completedTasks = tenant.onboardingTasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Expediente SaaS
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Estado operativo interno, riesgo y notas del club.
              </p>
            </div>
            <Button
              onClick={saveWorkspace}
              disabled={updateWorkspace.isPending}
            >
              {updateWorkspace.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Fase
              </label>
              <select
                value={lifecycleStage}
                onChange={(e) =>
                  setLifecycleStage(e.target.value as TenantLifecycleStage)
                }
                className="h-11 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {Object.entries(lifecycleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Riesgo
              </label>
              <select
                value={riskLevel}
                onChange={(e) =>
                  setRiskLevel(e.target.value as TenantRiskLevel)
                }
                className="h-11 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {Object.entries(riskLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Último contacto"
              type="date"
              value={lastContactAt}
              onChange={(e) => setLastContactAt(e.target.value)}
            />
            <Field
              label="Onboarding iniciado"
              type="date"
              value={onboardingStartedAt}
              onChange={(e) => setOnboardingStartedAt(e.target.value)}
            />
            <Field
              label="Onboarding completado"
              type="date"
              value={onboardingCompletedAt}
              onChange={(e) => setOnboardingCompletedAt(e.target.value)}
            />
            <Field
              label="Activación real"
              type="date"
              value={activatedAt}
              onChange={(e) => setActivatedAt(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Notas internas
            </label>
            <textarea
              value={platformNotes}
              onChange={(e) => setPlatformNotes(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Contexto operativo, decisiones, incidencias, riesgos..."
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-text-primary">
            Pulso de onboarding
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <StatCard
              title="Tareas totales"
              value={tenant.onboardingTasks.length}
              tone="blue"
            />
            <StatCard title="Completadas" value={completedTasks} tone="green" />
            <StatCard
              title="Bloqueadas"
              value={
                tenant.onboardingTasks.filter(
                  (task) => task.status === "BLOCKED",
                ).length
              }
              tone="red"
            />
            <StatCard
              title="En curso"
              value={
                tenant.onboardingTasks.filter(
                  (task) => task.status === "IN_PROGRESS",
                ).length
              }
              tone="amber"
            />
          </div>
          <div className="mt-4 rounded-xl border border-border-light bg-bg-soft p-4 text-sm text-text-muted">
            <p>
              <span className="font-medium text-text-primary">
                Último contacto:
              </span>{" "}
              {formatDate(tenant.lastContactAt)}
            </p>
            <p className="mt-2">
              <span className="font-medium text-text-primary">
                Inicio onboarding:
              </span>{" "}
              {formatDate(tenant.onboardingStartedAt)}
            </p>
            <p className="mt-2">
              <span className="font-medium text-text-primary">Activación:</span>{" "}
              {formatDate(tenant.activatedAt)}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Contactos operativos
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Personas de referencia para soporte, facturación y operaciones.
              </p>
            </div>
            <Button size="sm" onClick={openCreateContact}>
              <Plus size={14} />
              Nuevo contacto
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {tenant.contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-xl border border-border-light bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">
                        {contact.name}
                      </p>
                      {contact.isPrimary ? (
                        <Badge variant="success" size="sm">
                          Principal
                        </Badge>
                      ) : null}
                      {contact.role ? (
                        <Badge variant="outline" size="sm">
                          {contact.role}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-text-muted">
                      {contact.email ? (
                        <p>
                          <Mail size={13} className="mr-1 inline" />
                          {contact.email}
                        </p>
                      ) : null}
                      {contact.phone ? (
                        <p>
                          <Phone size={13} className="mr-1 inline" />
                          {contact.phone}
                        </p>
                      ) : null}
                      {contact.notes ? <p>{contact.notes}</p> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditContact(contact)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deleteContact.mutateAsync({
                            tenantId: tenant.id,
                            contactId: contact.id,
                          });
                          toast.success("Contacto eliminado.");
                        } catch (err) {
                          toast.error(
                            getErrorMessage(
                              err,
                              "No se pudo eliminar el contacto.",
                            ),
                          );
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!tenant.contacts.length ? (
              <EmptyState
                title="Sin contactos"
                text="Añade al menos un contacto operativo para soporte y seguimiento."
              />
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Checklist de onboarding
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Tareas internas para completar el alta y la puesta en marcha.
              </p>
            </div>
            <Button size="sm" onClick={() => setTaskModal(true)}>
              <Plus size={14} />
              Nueva tarea
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {tenant.onboardingTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border-light bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary">
                        {task.title}
                      </p>
                      <Badge
                        variant={
                          task.status === "COMPLETED"
                            ? "success"
                            : task.status === "BLOCKED"
                              ? "danger"
                              : task.status === "IN_PROGRESS"
                                ? "warning"
                                : "secondary"
                        }
                        size="sm"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {task.description || "Sin descripción adicional."}
                    </p>
                    <p className="mt-2 text-xs text-text-muted">
                      Responsable: {task.owner || "Sin asignar"}
                      {task.dueAt ? ` · Vence ${formatDate(task.dueAt)}` : ""}
                      {task.completedAt
                        ? ` · Completada ${formatDate(task.completedAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {task.status !== "COMPLETED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateTask.mutateAsync({
                              tenantId: tenant.id,
                              taskId: task.id,
                              body: { status: "COMPLETED" },
                            });
                            toast.success("Tarea completada.");
                          } catch (err) {
                            toast.error(
                              getErrorMessage(
                                err,
                                "No se pudo actualizar la tarea.",
                              ),
                            );
                          }
                        }}
                      >
                        Completar
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await deleteTask.mutateAsync({
                            tenantId: tenant.id,
                            taskId: task.id,
                          });
                          toast.success("Tarea eliminada.");
                        } catch (err) {
                          toast.error(
                            getErrorMessage(
                              err,
                              "No se pudo eliminar la tarea.",
                            ),
                          );
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!tenant.onboardingTasks.length ? (
              <EmptyState
                title="Sin tareas de onboarding"
                text="Crea las tareas clave del alta inicial del club."
              />
            ) : null}
          </div>
        </Card>
      </div>

      <Modal
        open={contactModal}
        onClose={() => setContactModal(false)}
        title={editingContactId ? "Editar contacto" : "Nuevo contacto"}
        actions={
          <>
            <Button variant="outline" onClick={() => setContactModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="tenant-contact-form"
              disabled={
                createContact.isPending ||
                updateContact.isPending ||
                !contactName
              }
            >
              Guardar
            </Button>
          </>
        }
      >
        <form
          id="tenant-contact-form"
          className="space-y-4"
          onSubmit={submitContact}
        >
          <Field
            label="Nombre"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
          <Field
            label="Rol"
            value={contactRole}
            onChange={(e) => setContactRole(e.target.value)}
            placeholder="Owner, administración, soporte..."
          />
          <Field
            label="Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Field
            label="Teléfono"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Notas
            </label>
            <textarea
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={contactPrimary}
              onChange={(e) => setContactPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-border-light text-brand-primary focus:ring-brand-primary"
            />
            Marcar como contacto principal
          </label>
        </form>
      </Modal>

      <Modal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        title="Nueva tarea de onboarding"
        actions={
          <>
            <Button variant="outline" onClick={() => setTaskModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="tenant-task-form"
              disabled={createTask.isPending || !taskTitle}
            >
              Crear
            </Button>
          </>
        }
      >
        <form id="tenant-task-form" className="space-y-4" onSubmit={submitTask}>
          <Field
            label="Título"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Descripción
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <Field
            label="Responsable"
            value={taskOwner}
            onChange={(e) => setTaskOwner(e.target.value)}
          />
          <Field
            label="Vencimiento"
            type="date"
            value={taskDueAt}
            onChange={(e) => setTaskDueAt(e.target.value)}
          />
        </form>
      </Modal>
    </>
  );
}

function PrintInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePrint() {
    setLoading(true);
    try {
      const data = await apiFetch<Parameters<typeof downloadInvoicePdf>[0]>(
        `/platform/billing/invoices/${invoiceId}`,
      );
      downloadInvoicePdf(data);
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handlePrint}
      disabled={loading}
      title="Imprimir factura"
    >
      <Printer size={14} />
    </Button>
  );
}

function BillingTab({
  tenantId,
  invoices,
  payments,
  invoicesLoading,
  paymentsLoading,
}: {
  tenantId: string;
  invoices: Array<{
    id: string;
    number: string;
    amount: number | string;
    status: string;
    description?: string | null;
    issuedAt?: string;
    dueAt?: string | null;
    paidAt?: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number | string;
    method?: string | null;
    reference?: string | null;
    status: string;
    paidAt: string;
    invoice?: { number: string } | null;
  }>;
  invoicesLoading: boolean;
  paymentsLoading: boolean;
}) {
  const createInvoice = useCreatePlatformInvoice();
  const createPayment = useCreatePlatformPayment();
  const updateInvoice = useUpdatePlatformInvoice();
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [invAmount, setInvAmount] = useState("");
  const [invDescription, setInvDescription] = useState("");
  const [invDueAt, setInvDueAt] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [reactivateSubscription, setReactivateSubscription] = useState(false);
  const [paymentNextRenewalAt, setPaymentNextRenewalAt] = useState("");

  async function submitInvoice(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createInvoice.mutateAsync({
        tenantId,
        body: {
          amount: parseFloat(invAmount) || 0,
          description: invDescription.trim() || undefined,
          dueAt: invDueAt || undefined,
        },
      });
      toast.success("Factura creada.");
      setInvoiceModal(false);
      setInvAmount("");
      setInvDescription("");
      setInvDueAt("");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo crear la factura."));
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createPayment.mutateAsync({
        tenantId,
        body: {
          amount: parseFloat(payAmount) || 0,
          method: payMethod.trim() || undefined,
          reference: payReference.trim() || undefined,
          invoiceId: payInvoiceId || undefined,
          reactivateSubscription,
          nextRenewalAt: reactivateSubscription
            ? paymentNextRenewalAt || undefined
            : undefined,
        },
      });
      toast.success(
        reactivateSubscription
          ? "Aportación registrada y suscripción reactivada."
          : "Aportación registrada.",
      );
      setPaymentModal(false);
      setPayAmount("");
      setPayMethod("");
      setPayReference("");
      setPayInvoiceId("");
      setReactivateSubscription(false);
      setPaymentNextRenewalAt("");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo registrar la aportación."));
    }
  }

  async function markInvoicePaid(id: string) {
    try {
      await updateInvoice.mutateAsync({ id, body: { status: "PAID" } });
      toast.success("Factura marcada como cobrada.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo actualizar la factura."));
    }
  }

  const totalInvoiced = invoices
    .filter((i) => i.status !== "VOID")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const totalPaid = payments
    .filter((p) => p.status !== "REFUNDED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingInvoices = invoices.filter((i) => i.status === "ISSUED");

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <StatCard
          title="Total facturado"
          value={formatCredits(totalInvoiced)}
          tone="blue"
          icon={<FileText size={18} />}
        />
        <StatCard
          title="Total cobrado"
          value={formatCredits(totalPaid)}
          tone="green"
          icon={<Wallet size={18} />}
        />
        <StatCard
          title="Facturas pendientes"
          value={pendingInvoices.length}
          tone={pendingInvoices.length ? "amber" : "neutral"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Facturas
            </h2>
            <Button size="sm" onClick={() => setInvoiceModal(true)}>
              <Plus size={14} /> Nueva factura
            </Button>
          </div>
          {invoicesLoading ? <ListSkeleton rows={2} /> : null}
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-light p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {invoice.number}
                    </p>
                    <Badge
                      variant={
                        invoiceStatusVariant[invoice.status] ?? "secondary"
                      }
                      size="sm"
                    >
                      {invoiceStatusLabels[invoice.status] ?? invoice.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatCredits(invoice.amount)}
                    {invoice.dueAt
                      ? ` · Vence ${formatDate(invoice.dueAt)}`
                      : ""}
                    {invoice.description ? ` · ${invoice.description}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <PrintInvoiceButton invoiceId={invoice.id} />
                  {invoice.status === "ISSUED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markInvoicePaid(invoice.id)}
                      disabled={updateInvoice.isPending}
                    >
                      Cobrada
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!invoices.length && !invoicesLoading ? (
              <EmptyState title="Sin facturas" />
            ) : null}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Aportaciones recibidas
            </h2>
            <Button size="sm" onClick={() => setPaymentModal(true)}>
              <Plus size={14} /> Registrar
            </Button>
          </div>
          {paymentsLoading ? <ListSkeleton rows={2} /> : null}
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl border border-border-light p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    {formatCredits(payment.amount)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDate(payment.paidAt)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {payment.method || "Sin método"}
                  {payment.reference ? ` · Ref: ${payment.reference}` : ""}
                  {payment.invoice?.number
                    ? ` · Factura ${payment.invoice.number}`
                    : ""}
                </p>
              </div>
            ))}
            {!payments.length && !paymentsLoading ? (
              <EmptyState title="Sin aportaciones" />
            ) : null}
          </div>
        </Card>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        open={invoiceModal}
        onClose={() => setInvoiceModal(false)}
        title="Nueva factura"
        description="Crea una factura interna para esta empresa."
        actions={
          <>
            <Button variant="outline" onClick={() => setInvoiceModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-invoice-form"
              disabled={createInvoice.isPending || !invAmount}
            >
              {createInvoice.isPending ? "Creando..." : "Crear factura"}
            </Button>
          </>
        }
      >
        <form
          id="create-invoice-form"
          className="space-y-4"
          onSubmit={submitInvoice}
        >
          <Field
            label="Importe (CR)"
            type="number"
            min="0"
            step="0.01"
            value={invAmount}
            onChange={(e) => setInvAmount(e.target.value)}
            required
            placeholder="0.00"
          />
          <Field
            label="Descripción (opcional)"
            value={invDescription}
            onChange={(e) => setInvDescription(e.target.value)}
            placeholder="Concepto de la factura"
          />
          <Field
            label="Fecha de vencimiento (opcional)"
            type="date"
            value={invDueAt}
            onChange={(e) => setInvDueAt(e.target.value)}
          />
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModal}
        onClose={() => setPaymentModal(false)}
        title="Registrar aportación"
        description="Registra una aportación recibida de esta empresa."
        actions={
          <>
            <Button variant="outline" onClick={() => setPaymentModal(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-payment-form"
              disabled={createPayment.isPending || !payAmount}
            >
              {createPayment.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </>
        }
      >
        <form
          id="create-payment-form"
          className="space-y-4"
          onSubmit={submitPayment}
        >
          <Field
            label="Importe (CR)"
            type="number"
            min="0"
            step="0.01"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
            placeholder="0.00"
          />
          <Field
            label="Método"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            placeholder="Transferencia, efectivo, etc."
          />
          <Field
            label="Referencia (opcional)"
            value={payReference}
            onChange={(e) => setPayReference(e.target.value)}
            placeholder="Nº transferencia, etc."
          />
          {invoices.filter((i) => i.status === "ISSUED").length > 0 ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Vincular a factura (opcional)
              </label>
              <select
                value={payInvoiceId}
                onChange={(e) => setPayInvoiceId(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">Sin vincular</option>
                {invoices
                  .filter((i) => i.status === "ISSUED")
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.number} — {formatCredits(i.amount)}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-xl border border-border-light bg-bg-soft px-3 py-3">
            <input
              type="checkbox"
              checked={reactivateSubscription}
              onChange={(e) => setReactivateSubscription(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border-light text-brand-primary focus:ring-brand-primary"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Reactivar suscripción con este cobro
              </p>
              <p className="text-xs text-text-muted">
                Úsalo cuando el pago manual deje al club nuevamente activo.
              </p>
            </div>
          </label>
          {reactivateSubscription ? (
            <Field
              label="Próxima renovación (opcional)"
              type="date"
              value={paymentNextRenewalAt}
              onChange={(e) => setPaymentNextRenewalAt(e.target.value)}
            />
          ) : null}
        </form>
      </Modal>
    </>
  );
}
