"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Pencil,
  Search,
  ShieldAlert,
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
  usePlatformSubscriptions,
  useRenewTenantSubscription,
  useUpdateTenantSubscription,
} from "@/hooks/usePlatform";
import { getErrorMessage } from "@/lib/errors";
import { formatCredits, formatDate } from "@/lib/format";
import type {
  PlatformSubscriptionSummary,
  TenantSubscriptionStatus,
  UpdateTenantSubscriptionInput,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const statusLabels: Record<TenantSubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Activa",
  PAST_DUE: "Impagada",
  SUSPENDED: "Suspendida",
  CANCELLED: "Cancelada",
};

const statusOptions: TenantSubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "CANCELLED",
];

type QuickFilterKey =
  | "all"
  | "renewal_7d"
  | "trial_7d"
  | "without_plan"
  | "attention";

function statusVariant(status: TenantSubscriptionStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "TRIAL") return "secondary" as const;
  if (status === "PAST_DUE") return "warning" as const;
  if (status === "SUSPENDED" || status === "CANCELLED") {
    return "danger" as const;
  }
  return "secondary" as const;
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function cleanDate(value: string) {
  return value.trim() ? value : null;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isWithinDays(value?: string | null, days = 7) {
  if (!value) return false;
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(value));
  const diff = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

export default function PlatformSubscriptionsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TenantSubscriptionStatus | "all">("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [selected, setSelected] = useState<PlatformSubscriptionSummary | null>(
    null,
  );
  const [renewTarget, setRenewTarget] =
    useState<PlatformSubscriptionSummary | null>(null);
  const [form, setForm] = useState<UpdateTenantSubscriptionInput>({
    status: "ACTIVE",
    startsAt: null,
    nextRenewalAt: null,
    trialEndsAt: null,
    endsAt: null,
    notes: "",
  });
  const [renewForm, setRenewForm] = useState({
    amount: "",
    months: "1",
    dueAt: "",
    markAsPaid: true,
    paidAt: toDateInput(new Date().toISOString()),
    method: "transfer",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  const subscriptionsQuery = usePlatformSubscriptions(
    { q: query, status, take: 100 },
    { enabled: allowed },
  );
  const updateSubscription = useUpdateTenantSubscription();
  const renewSubscription = useRenewTenantSubscription();
  const subscriptions = useMemo(
    () => subscriptionsQuery.data ?? [],
    [subscriptionsQuery.data],
  );

  const alertMetrics = useMemo(() => {
    const renewalSoon = subscriptions.filter((item) =>
      isWithinDays(item.nextRenewalAt, 7),
    ).length;
    const trialEnding = subscriptions.filter(
      (item) => item.status === "TRIAL" && isWithinDays(item.trialEndsAt, 7),
    ).length;
    const withoutPlan = subscriptions.filter((item) => !item.plan?.id).length;
    const attention = subscriptions.filter((item) => {
      const hasRenewalSoon = isWithinDays(item.nextRenewalAt, 7);
      const hasTrialEnding =
        item.status === "TRIAL" && isWithinDays(item.trialEndsAt, 7);
      return (
        item.status === "PAST_DUE" ||
        item.status === "SUSPENDED" ||
        item.billing.overdueInvoicesCount > 0 ||
        !item.plan?.id ||
        hasRenewalSoon ||
        hasTrialEnding
      );
    }).length;

    return { renewalSoon, trialEnding, withoutPlan, attention };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    if (quickFilter === "all") return subscriptions;

    return subscriptions.filter((item) => {
      const hasRenewalSoon = isWithinDays(item.nextRenewalAt, 7);
      const hasTrialEnding =
        item.status === "TRIAL" && isWithinDays(item.trialEndsAt, 7);

      switch (quickFilter) {
        case "renewal_7d":
          return hasRenewalSoon;
        case "trial_7d":
          return hasTrialEnding;
        case "without_plan":
          return !item.plan?.id;
        case "attention":
          return (
            item.status === "PAST_DUE" ||
            item.status === "SUSPENDED" ||
            item.billing.overdueInvoicesCount > 0 ||
            !item.plan?.id ||
            hasRenewalSoon ||
            hasTrialEnding
          );
        default:
          return true;
      }
    });
  }, [quickFilter, subscriptions]);

  const metrics = useMemo(() => {
    const countBy = (value: TenantSubscriptionStatus) =>
      subscriptions.filter((item) => item.status === value).length;

    return {
      total: subscriptions.length,
      trial: countBy("TRIAL"),
      active: countBy("ACTIVE"),
      pastDue: countBy("PAST_DUE"),
      suspended: countBy("SUSPENDED"),
      renewalSoon: subscriptions.filter((item) =>
        isWithinDays(item.nextRenewalAt, 7),
      ).length,
      overdueAmount: subscriptions.reduce(
        (sum, item) => sum + Number(item.billing.overdueAmount ?? 0),
        0,
      ),
    };
  }, [subscriptions]);

  if (!allowed) return null;

  function openEditor(subscription: PlatformSubscriptionSummary) {
    setSelected(subscription);
    setForm({
      status: subscription.status,
      startsAt: toDateInput(subscription.startsAt),
      nextRenewalAt: toDateInput(subscription.nextRenewalAt),
      trialEndsAt: toDateInput(subscription.trialEndsAt),
      endsAt: toDateInput(subscription.endsAt),
      suspendedAt: toDateInput(subscription.suspendedAt),
      cancelledAt: toDateInput(subscription.cancelledAt),
      notes: subscription.notes ?? "",
    });
  }

  function openRenewModal(subscription: PlatformSubscriptionSummary) {
    setRenewTarget(subscription);
    const defaultAmount = subscription.plan?.priceMonthly
      ? String(Number(subscription.plan.priceMonthly))
      : "";
    setRenewForm({
      amount: defaultAmount,
      months: "1",
      dueAt: toDateInput(subscription.nextRenewalAt),
      markAsPaid: true,
      paidAt: toDateInput(new Date().toISOString()),
      method: "transfer",
      reference: "",
      notes: "",
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    try {
      await updateSubscription.mutateAsync({
        tenantId: selected.tenantId,
        body: {
          status: form.status,
          startsAt: cleanDate(form.startsAt ?? ""),
          nextRenewalAt: cleanDate(form.nextRenewalAt ?? ""),
          trialEndsAt: cleanDate(form.trialEndsAt ?? ""),
          endsAt: cleanDate(form.endsAt ?? ""),
          suspendedAt: cleanDate(form.suspendedAt ?? ""),
          cancelledAt: cleanDate(form.cancelledAt ?? ""),
          notes: form.notes?.trim() || null,
        },
      });
      toast.success("Suscripcion actualizada");
      setSelected(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No se pudo actualizar la suscripcion"),
      );
    }
  }

  async function submitRenewal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renewTarget) return;

    try {
      const result = await renewSubscription.mutateAsync({
        tenantId: renewTarget.tenantId,
        body: {
          amount: Number(renewForm.amount),
          months: Number(renewForm.months),
          dueAt: cleanDate(renewForm.dueAt),
          markAsPaid: renewForm.markAsPaid,
          paidAt: renewForm.markAsPaid
            ? (cleanDate(renewForm.paidAt) ?? undefined)
            : undefined,
          method: renewForm.markAsPaid ? renewForm.method : undefined,
          reference: renewForm.reference.trim() || undefined,
          notes: renewForm.notes.trim() || undefined,
        },
      });
      toast.success(
        renewForm.markAsPaid
          ? `Renovacion registrada. Proxima fecha: ${formatDate(result.nextRenewalAt)}`
          : `Renovacion emitida. Factura ${result.invoice.number} pendiente de cobro.`,
      );
      setRenewTarget(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, "No se pudo registrar la renovacion manual"),
      );
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Suscripciones"
          description="Control manual del ciclo comercial SaaS: trial, renovacion, impago, suspension y cancelacion."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard
            title="Total"
            value={metrics.total}
            icon={<CreditCard size={18} />}
            tone="blue"
          />
          <StatCard
            title="Trial"
            value={metrics.trial}
            icon={<CalendarClock size={18} />}
            tone="neutral"
          />
          <StatCard
            title="Activas"
            value={metrics.active}
            icon={<CreditCard size={18} />}
            tone="green"
          />
          <StatCard
            title="Impagadas"
            value={metrics.pastDue}
            icon={<AlertTriangle size={18} />}
            tone="amber"
          />
          <StatCard
            title="Suspendidas"
            value={metrics.suspended}
            icon={<ShieldAlert size={18} />}
            tone="red"
          />
          <StatCard
            title="Renuevan en 7 dias"
            value={metrics.renewalSoon}
            icon={<CalendarClock size={18} />}
            tone="amber"
          />
        </div>
        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border-light bg-white px-3">
              <Search size={16} className="text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por empresa, email o ciudad"
                className="h-full flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as TenantSubscriptionStatus | "all",
                )
              }
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="all">Todos los estados</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setQuickFilter("all");
              }}
            >
              Limpiar
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={quickFilter === "all" ? "default" : "outline"}
              onClick={() => setQuickFilter("all")}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={quickFilter === "attention" ? "default" : "outline"}
              onClick={() => setQuickFilter("attention")}
            >
              Requieren atencion
            </Button>
            <Button
              size="sm"
              variant={quickFilter === "renewal_7d" ? "default" : "outline"}
              onClick={() => setQuickFilter("renewal_7d")}
            >
              Renuevan en 7 dias
            </Button>
            <Button
              size="sm"
              variant={quickFilter === "trial_7d" ? "default" : "outline"}
              onClick={() => setQuickFilter("trial_7d")}
            >
              Trial por vencer
            </Button>
            <Button
              size="sm"
              variant={quickFilter === "without_plan" ? "default" : "outline"}
              onClick={() => setQuickFilter("without_plan")}
            >
              Sin plan asignado
            </Button>
          </div>
        </Card>

        {(alertMetrics.attention > 0 ||
          alertMetrics.renewalSoon > 0 ||
          alertMetrics.trialEnding > 0 ||
          alertMetrics.withoutPlan > 0) && (
          <Card className="border-amber-200 bg-amber-50/60 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Radar comercial
                </p>
                <p className="text-sm text-text-secondary">
                  Hay cuentas que conviene revisar hoy para evitar bloqueos o
                  renovar a tiempo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {alertMetrics.attention > 0 ? (
                  <Badge variant="warning">
                    {alertMetrics.attention} con atencion prioritaria
                  </Badge>
                ) : null}
                {alertMetrics.renewalSoon > 0 ? (
                  <Badge variant="warning">
                    {alertMetrics.renewalSoon} renuevan en 7 dias
                  </Badge>
                ) : null}
                {alertMetrics.trialEnding > 0 ? (
                  <Badge variant="secondary">
                    {alertMetrics.trialEnding} trials por vencer
                  </Badge>
                ) : null}
                {alertMetrics.withoutPlan > 0 ? (
                  <Badge variant="danger">
                    {alertMetrics.withoutPlan} sin plan
                  </Badge>
                ) : null}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {filteredSubscriptions.length} suscripciones visibles
                </p>
                <p className="text-xs text-text-muted">
                  La vista combina el filtro de estado con accesos rapidos
                  orientados a seguimiento comercial.
                </p>
              </div>
              <p className="text-sm font-medium text-text-primary">
                Pendiente total: {formatCredits(metrics.overdueAmount)}
              </p>
            </div>

            {subscriptionsQuery.isLoading ? <ListSkeleton rows={4} /> : null}

            {filteredSubscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-xl border border-border-light bg-white p-4 shadow-card"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/platform/tenants/${subscription.tenantId}`}
                        className="text-base font-semibold text-text-primary hover:text-brand-primary"
                      >
                        {subscription.tenant.name}
                      </Link>
                      <Badge variant={statusVariant(subscription.status)}>
                        {statusLabels[subscription.status]}
                      </Badge>
                      <Badge variant="outline">
                        {subscription.plan?.name ?? "Sin plan"}
                      </Badge>
                      {isWithinDays(subscription.nextRenewalAt, 7) ? (
                        <Badge variant="warning">Renueva pronto</Badge>
                      ) : null}
                      {subscription.status === "TRIAL" &&
                      isWithinDays(subscription.trialEndsAt, 7) ? (
                        <Badge variant="secondary">Trial por vencer</Badge>
                      ) : null}
                      {subscription.billing.overdueInvoicesCount > 0 ? (
                        <Badge variant="danger">Con vencidos</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-text-muted">
                      {subscription.tenant.email || "Sin email"} ·{" "}
                      {subscription.tenant.city || "Sin ciudad"} ·{" "}
                      {subscription.tenant.country || "Sin pais"}
                    </p>
                    <div className="grid gap-2 text-sm text-text-muted md:grid-cols-2 xl:grid-cols-4">
                      <p>
                        <span className="font-medium text-text-primary">
                          Inicio:
                        </span>{" "}
                        {formatDate(subscription.startsAt)}
                      </p>
                      <p>
                        <span className="font-medium text-text-primary">
                          Proxima renovacion:
                        </span>{" "}
                        {formatDate(subscription.nextRenewalAt)}
                      </p>
                      <p>
                        <span className="font-medium text-text-primary">
                          Fin trial:
                        </span>{" "}
                        {formatDate(subscription.trialEndsAt)}
                      </p>
                      <p>
                        <span className="font-medium text-text-primary">
                          Fin acceso:
                        </span>{" "}
                        {formatDate(subscription.endsAt)}
                      </p>
                    </div>
                    {subscription.notes ? (
                      <p className="rounded-lg bg-bg-soft px-3 py-2 text-sm text-text-muted">
                        {subscription.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 lg:min-w-[280px]">
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                      <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                        <p className="text-xs text-text-muted">
                          Facturas abiertas
                        </p>
                        <p className="mt-1 text-lg font-semibold text-text-primary">
                          {subscription.billing.openInvoicesCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                        <p className="text-xs text-text-muted">Vencidas</p>
                        <p className="mt-1 text-lg font-semibold text-text-primary">
                          {subscription.billing.overdueInvoicesCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                        <p className="text-xs text-text-muted">Pendiente</p>
                        <p className="mt-1 text-lg font-semibold text-text-primary">
                          {formatCredits(subscription.billing.overdueAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-text-muted">
                      <p>
                        <span className="font-medium text-text-primary">
                          Ultimo cobro:
                        </span>{" "}
                        {formatDate(subscription.billing.lastPaymentAt)}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium text-text-primary">
                          Ultimo vencimiento:
                        </span>{" "}
                        {formatDate(subscription.billing.lastInvoiceDueAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => openRenewModal(subscription)}
                      >
                        <CreditCard size={15} />
                        Renovar manual
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(subscription)}
                      >
                        <Pencil size={15} />
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!subscriptionsQuery.isLoading &&
            filteredSubscriptions.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description="No hay suscripciones que coincidan con los filtros aplicados."
              />
            ) : null}
          </div>
        </Card>

        <Modal
          open={Boolean(renewTarget)}
          onClose={() => setRenewTarget(null)}
          title="Renovar suscripcion"
          size="md"
          actions={
            <>
              <Button variant="outline" onClick={() => setRenewTarget(null)}>
                Cancelar
              </Button>
              <Button
                form="renew-form"
                type="submit"
                disabled={renewSubscription.isPending}
              >
                {renewSubscription.isPending
                  ? "Renovando..."
                  : "Confirmar renovacion"}
              </Button>
            </>
          }
        >
          {renewTarget ? (
            <form
              id="renew-form"
              className="space-y-4"
              onSubmit={submitRenewal}
            >
              <p className="text-sm text-text-secondary">
                Renovar suscripcion de{" "}
                <span className="font-semibold text-text-primary">
                  {renewTarget.tenant.name}
                </span>
                .
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Importe"
                  type="number"
                  min={0}
                  step="0.01"
                  value={renewForm.amount}
                  onChange={(e) =>
                    setRenewForm({ ...renewForm, amount: e.target.value })
                  }
                  required
                />
                <Field
                  label="Meses"
                  type="number"
                  min={1}
                  max={24}
                  value={renewForm.months}
                  onChange={(e) =>
                    setRenewForm({ ...renewForm, months: e.target.value })
                  }
                />
                <Field
                  label="Fecha vencimiento"
                  type="date"
                  value={renewForm.dueAt}
                  onChange={(e) =>
                    setRenewForm({ ...renewForm, dueAt: e.target.value })
                  }
                />
                <Field
                  label="Referencia"
                  value={renewForm.reference}
                  onChange={(e) =>
                    setRenewForm({ ...renewForm, reference: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={renewForm.markAsPaid}
                  onChange={(e) =>
                    setRenewForm({ ...renewForm, markAsPaid: e.target.checked })
                  }
                  className="h-4 w-4 accent-brand-primary"
                />
                Marcar como pagada
              </label>
              {renewForm.markAsPaid ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Fecha pago"
                    type="date"
                    value={renewForm.paidAt}
                    onChange={(e) =>
                      setRenewForm({ ...renewForm, paidAt: e.target.value })
                    }
                  />
                  <Field
                    label="Metodo"
                    value={renewForm.method}
                    onChange={(e) =>
                      setRenewForm({ ...renewForm, method: e.target.value })
                    }
                  />
                </div>
              ) : null}
              <Field
                label="Notas"
                value={renewForm.notes}
                onChange={(e) =>
                  setRenewForm({ ...renewForm, notes: e.target.value })
                }
              />
            </form>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title="Editar suscripcion"
          size="md"
          actions={
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
              <Button
                form="edit-subscription-form"
                type="submit"
                disabled={updateSubscription.isPending}
              >
                {updateSubscription.isPending
                  ? "Guardando..."
                  : "Guardar cambios"}
              </Button>
            </>
          }
        >
          {selected ? (
            <form
              id="edit-subscription-form"
              className="space-y-4"
              onSubmit={submit}
            >
              <label className="block">
                <span className="text-sm font-medium text-text-primary">
                  Estado
                </span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as TenantSubscriptionStatus,
                    })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Inicio"
                  type="date"
                  value={form.startsAt ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
                <Field
                  label="Proxima renovacion"
                  type="date"
                  value={form.nextRenewalAt ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, nextRenewalAt: e.target.value })
                  }
                />
                <Field
                  label="Fin trial"
                  type="date"
                  value={form.trialEndsAt ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, trialEndsAt: e.target.value })
                  }
                />
                <Field
                  label="Fin acceso"
                  type="date"
                  value={form.endsAt ?? ""}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
              <label className="block">
                <span className="text-sm font-medium text-text-primary">
                  Notas internas
                </span>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </label>
            </form>
          ) : null}
        </Modal>
      </div>
    </ProtectedLayout>
  );
}
