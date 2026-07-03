"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  Search,
  Users,
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
  useConvertLeadToTenant,
  usePlatformLeads,
  usePlatformPlans,
  useUpdateLeadPayment,
  useUpdateLeadStatus,
} from "@/hooks/usePlatform";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

const statusLabels: Record<string, string> = {
  NEW: "Nueva",
  IN_REVIEW: "En revisión",
  WAITING_PAYMENT: "Esperando aportación",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  ACCESS_SENT: "Acceso enviado",
  ARCHIVED: "Archivada",
};

const statusVariants: Record<
  string,
  "secondary" | "warning" | "success" | "danger" | "primary"
> = {
  NEW: "primary",
  IN_REVIEW: "warning",
  WAITING_PAYMENT: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  ACCESS_SENT: "success",
  ARCHIVED: "secondary",
};

const paymentLabels: Record<string, string> = {
  NOT_REQUIRED: "No requerido",
  PENDING: "Pendiente",
  PAID: "Confirmado",
  FAILED: "Fallido",
  REFUNDED: "Devuelto",
};

type Lead = NonNullable<ReturnType<typeof usePlatformLeads>["data"]>[number];

export default function LeadsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [convertPlanId, setConvertPlanId] = useState("");

  const leadsQuery = usePlatformLeads(
    { status: statusFilter, q: query },
    { enabled: allowed },
  );
  const plansQuery = usePlatformPlans({ enabled: allowed });
  const updateStatus = useUpdateLeadStatus();
  const updatePayment = useUpdateLeadPayment();
  const convertLead = useConvertLeadToTenant();
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  if (!allowed) return null;

  const kpis = {
    total: leads.length,
    newCount: leads.filter((lead) => lead.status === "NEW").length,
    approved: leads.filter(
      (lead) => lead.status === "APPROVED" || lead.status === "ACCESS_SENT",
    ).length,
    pending: leads.filter((lead) => lead.paymentStatus === "PENDING").length,
  };

  async function changeStatus(lead: Lead, status: string) {
    try {
      await updateStatus.mutateAsync({
        id: lead.id,
        status,
        internalNotes: notes || undefined,
      });
      toast.success(`Estado actualizado a ${statusLabels[status]}.`);
      setDetail(null);
      setNotes("");
    } catch {
      toast.error("No se pudo actualizar el estado.");
    }
  }

  async function changePayment(lead: Lead, paymentStatus: string) {
    try {
      await updatePayment.mutateAsync({ id: lead.id, paymentStatus });
      toast.success("Estado de aportación actualizado.");
    } catch {
      toast.error("No se pudo actualizar.");
    }
  }

  function canConvertLead(lead: Lead) {
    return (
      !lead.convertedTenant &&
      ["IN_REVIEW", "WAITING_PAYMENT", "APPROVED", "ACCESS_SENT"].includes(
        lead.status,
      )
    );
  }

  function openConvert(lead: Lead) {
    setDetail(lead);
    setOwnerName(lead.name);
    setOwnerEmail(lead.email);
    setOwnerPassword("");
    setConvertPlanId(lead.requestedPlan?.id ?? "");
    setConvertOpen(true);
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;

    try {
      const tenant = await convertLead.mutateAsync({
        id: detail.id,
        body: {
          ownerName,
          ownerEmail,
          ownerPassword,
          planId: convertPlanId || undefined,
        },
      });
      toast.success("Lead convertido en empresa.");
      setConvertOpen(false);
      setDetail(null);
      router.push(`/platform/tenants/${tenant.id}?setup=1`);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo convertir la solicitud."));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Solicitudes comerciales"
          description="Solicitudes de acceso recibidas desde la landing pública."
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total solicitudes"
            value={kpis.total}
            icon={<Mail size={18} />}
            tone="blue"
          />
          <StatCard
            title="Nuevas"
            value={kpis.newCount}
            icon={<Clock size={18} />}
            tone="amber"
          />
          <StatCard
            title="Aprobadas"
            value={kpis.approved}
            icon={<CheckCircle2 size={18} />}
            tone="green"
          />
          <StatCard
            title="Aportación pendiente"
            value={kpis.pending}
            icon={<Users size={18} />}
            tone="red"
          />
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-2.5 text-text-muted"
              />
              <input
                className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
                placeholder="Buscar por nombre, email o empresa..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-border-light px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {leadsQuery.isLoading ? <ListSkeleton rows={4} /> : null}
        {!leadsQuery.isLoading && leads.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              title="Sin solicitudes"
              text="Las solicitudes de la landing aparecerán aquí."
            />
          </Card>
        ) : null}

        <div className="space-y-2">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer p-4 transition hover:shadow-card"
              onClick={() => {
                setDetail(lead);
                setNotes(lead.internalNotes ?? "");
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {lead.name}
                    </span>
                    <Badge
                      variant={statusVariants[lead.status] ?? "secondary"}
                      size="sm"
                    >
                      {statusLabels[lead.status] ?? lead.status}
                    </Badge>
                    {lead.paymentStatus !== "NOT_REQUIRED" ? (
                      <Badge
                        variant={
                          lead.paymentStatus === "PAID" ? "success" : "warning"
                        }
                        size="sm"
                      >
                        {paymentLabels[lead.paymentStatus]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
                    <Building2 size={11} className="mr-1 inline" />
                    {lead.companyName} · {lead.email} · {lead.country} ·{" "}
                    {formatDate(lead.createdAt)}
                  </p>
                  {lead.requestedPlan ? (
                    <p className="mt-0.5 text-xs text-text-muted">
                      Plan: {lead.requestedPlan.name}
                    </p>
                  ) : null}
                  {lead.convertedTenant ? (
                    <p className="mt-0.5 text-xs text-yellow-700">
                      Convertido: {lead.convertedTenant.name}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  {lead.status === "NEW" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeStatus(lead, "IN_REVIEW");
                      }}
                    >
                      Revisar
                    </Button>
                  ) : null}
                  {lead.status === "IN_REVIEW" ? (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeStatus(lead, "APPROVED");
                      }}
                    >
                      Aprobar
                    </Button>
                  ) : null}
                  {canConvertLead(lead) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConvert(lead);
                      }}
                    >
                      Convertir
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Modal
          open={Boolean(detail)}
          onClose={() => setDetail(null)}
          title={detail?.companyName ?? "Solicitud"}
          description={detail ? `${detail.name} · ${detail.email}` : undefined}
          size="lg"
          actions={
            detail ? (
              <>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Cerrar
                </Button>
                {detail.status === "NEW" ? (
                  <Button
                    onClick={() => changeStatus(detail, "IN_REVIEW")}
                    disabled={updateStatus.isPending}
                  >
                    Marcar en revisión
                  </Button>
                ) : null}
                {detail.status === "IN_REVIEW" ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => changeStatus(detail, "REJECTED")}
                      disabled={updateStatus.isPending}
                    >
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => changeStatus(detail, "WAITING_PAYMENT")}
                      disabled={updateStatus.isPending}
                    >
                      Solicitar aportación
                    </Button>
                    <Button
                      onClick={() => changeStatus(detail, "APPROVED")}
                      disabled={updateStatus.isPending}
                    >
                      Aprobar
                    </Button>
                  </>
                ) : null}
                {detail.status === "APPROVED" ? (
                  <Button
                    onClick={() => changeStatus(detail, "ACCESS_SENT")}
                    disabled={updateStatus.isPending}
                  >
                    Marcar acceso enviado
                  </Button>
                ) : null}
                {!["ARCHIVED", "REJECTED"].includes(detail.status) ? (
                  <Button
                    variant="outline"
                    onClick={() => changeStatus(detail, "ARCHIVED")}
                    disabled={updateStatus.isPending}
                  >
                    Archivar
                  </Button>
                ) : null}
              </>
            ) : null
          }
        >
          {detail ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-text-muted">Nombre:</span>{" "}
                  <strong>{detail.name}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Email:</span>{" "}
                  <strong>{detail.email}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Teléfono:</span>{" "}
                  <strong>{detail.phone || "—"}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Empresa:</span>{" "}
                  <strong>{detail.companyName}</strong>
                </div>
                <div>
                  <span className="text-text-muted">País:</span>{" "}
                  <strong>{detail.country}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Idioma:</span>{" "}
                  <strong>{detail.preferredLanguage}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Plan:</span>{" "}
                  <strong>{detail.requestedPlan?.name ?? "No indicado"}</strong>
                </div>
                <div>
                  <span className="text-text-muted">Colaboradores:</span>{" "}
                  <strong>{detail.estimatedUsers ?? "—"}</strong>
                </div>
              </div>

              {detail.message ? (
                <div className="rounded-lg border border-border-light bg-bg-soft p-3 text-sm">
                  <p className="mb-1 text-xs text-text-muted">Mensaje:</p>
                  {detail.message}
                </div>
              ) : null}

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-text-muted">Estado:</span>{" "}
                  <Badge variant={statusVariants[detail.status]} size="sm">
                    {statusLabels[detail.status]}
                  </Badge>
                </div>
                <div>
                  <span className="text-text-muted">Aportación:</span>{" "}
                  <Badge
                    variant={
                      detail.paymentStatus === "PAID" ? "success" : "secondary"
                    }
                    size="sm"
                  >
                    {paymentLabels[detail.paymentStatus]}
                  </Badge>
                </div>
                <div>
                  <span className="text-text-muted">Asignado:</span>{" "}
                  {detail.assignedTo?.name ?? "Sin asignar"}
                </div>
              </div>

              {detail.convertedTenant ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  Esta solicitud ya fue convertida en la empresa{" "}
                  <strong>{detail.convertedTenant.name}</strong>.
                </div>
              ) : null}

              {["WAITING_PAYMENT", "APPROVED"].includes(detail.status) ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changePayment(detail, "PENDING")}
                    disabled={updatePayment.isPending}
                  >
                    Aportación pendiente
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => changePayment(detail, "PAID")}
                    disabled={updatePayment.isPending}
                  >
                    Aportación confirmada
                  </Button>
                </div>
              ) : null}

              {canConvertLead(detail) ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openConvert(detail)}>
                    Convertir en empresa
                  </Button>
                </div>
              ) : null}

              <Field
                label="Notas internas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas visibles solo para el equipo..."
              />
            </div>
          ) : null}
        </Modal>

        <Modal
          open={convertOpen}
          onClose={() => setConvertOpen(false)}
          title="Convertir lead en empresa"
          description={
            detail ? `${detail.companyName} · ${detail.email}` : undefined
          }
          size="lg"
          actions={
            <>
              <Button variant="outline" onClick={() => setConvertOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="convert-lead-form"
                disabled={
                  convertLead.isPending ||
                  !ownerName ||
                  !ownerEmail ||
                  ownerPassword.length < 8
                }
              >
                {convertLead.isPending ? "Convirtiendo..." : "Crear empresa"}
              </Button>
            </>
          }
        >
          <form
            id="convert-lead-form"
            className="space-y-4"
            onSubmit={submitConvert}
          >
            <Field
              label="Nombre del owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
            <Field
              label="Email del owner"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
            <Field
              label="Contraseña inicial"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Plan inicial
              </label>
              <select
                className="h-11 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary"
                value={convertPlanId}
                onChange={(e) => setConvertPlanId(e.target.value)}
              >
                <option value="">Sin plan asignado</option>
                {(plansQuery.data ?? [])
                  .filter((plan) => plan.status === "ACTIVE")
                  .map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="rounded-lg border border-border-light bg-bg-soft p-3 text-sm text-text-muted">
              Se creará el tenant, el owner, un contacto principal y las tareas
              iniciales de onboarding.
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedLayout>
  );
}
