"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FileSearch, MessageSquarePlus, Pencil, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { ListSkeleton } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ProtectedLayout } from "@/components/layout/protected-layout";
import {
  useCreateTenantAccountActivity,
  usePlatformAccounts,
  usePlatformStaffOptions,
  useUpdateTenantAccount,
} from "@/hooks/usePlatform";
import { getErrorMessage } from "@/lib/errors";
import { formatCredits, formatDate } from "@/lib/format";
import type {
  CreateTenantAccountActivityInput,
  PlatformAccountHealth,
  PlatformAccountSummary,
  PlatformStaffOption,
  UpdateTenantAccountInput,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const healthLabels: Record<PlatformAccountHealth, string> = {
  STABLE: "Estable",
  FOLLOW_UP: "Seguimiento",
  AT_RISK: "Riesgo",
  BLOCKED: "Bloqueada",
};

const healthOptions: Array<PlatformAccountHealth | "all"> = [
  "all",
  "STABLE",
  "FOLLOW_UP",
  "AT_RISK",
  "BLOCKED",
];

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function cleanDate(value: string) {
  return value.trim() ? value : null;
}

function badgeVariant(value: PlatformAccountHealth) {
  if (value === "STABLE") return "success" as const;
  if (value === "FOLLOW_UP") return "secondary" as const;
  if (value === "AT_RISK") return "warning" as const;
  return "danger" as const;
}

export default function PlatformAccountsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const [query, setQuery] = useState("");
  const [accountHealth, setAccountHealth] = useState<PlatformAccountHealth | "all">("all");
  const [selected, setSelected] = useState<PlatformAccountSummary | null>(null);
  const [activityTarget, setActivityTarget] = useState<PlatformAccountSummary | null>(null);
  const [accountForm, setAccountForm] = useState<UpdateTenantAccountInput>({
    accountHealth: "STABLE",
    accountOwnerId: null,
    nextReviewAt: null,
    lastContactAt: null,
    platformNotes: "",
  });
  const [activityForm, setActivityForm] = useState<CreateTenantAccountActivityInput>({
    type: "NOTE",
    title: "",
    notes: "",
  });

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  const accountsQuery = usePlatformAccounts(
    { q: query, accountHealth, renewalWindowDays: 30, take: 100 },
    { enabled: allowed },
  );
  const staffQuery = usePlatformStaffOptions({ enabled: allowed });
  const updateAccount = useUpdateTenantAccount();
  const createActivity = useCreateTenantAccountActivity();

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const stats = useMemo(() => ({
    total: accounts.length,
    stable: accounts.filter((item) => item.accountHealth === "STABLE").length,
    atRisk: accounts.filter((item) => item.accountHealth === "AT_RISK" || item.accountHealth === "BLOCKED").length,
    reviewSoon: accounts.filter((item) => item.nextReviewAt && new Date(item.nextReviewAt) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length,
    pendingCollection: accounts.filter((item) => item.collectionCase && item.collectionCase.status !== "CLOSED").length,
  }), [accounts]);

  if (!allowed) return null;

  function openEdit(item: PlatformAccountSummary) {
    setSelected(item);
    setAccountForm({
      accountHealth: item.accountHealth,
      accountOwnerId: item.accountOwner?.id ?? null,
      nextReviewAt: toDateInput(item.nextReviewAt),
      lastContactAt: toDateInput(item.lastContactAt),
      platformNotes: item.platformNotes ?? "",
    });
  }

  async function submitAccount(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      await updateAccount.mutateAsync({
        tenantId: selected.id,
        body: {
          accountHealth: accountForm.accountHealth,
          accountOwnerId: accountForm.accountOwnerId || null,
          nextReviewAt: cleanDate(String(accountForm.nextReviewAt ?? "")),
          lastContactAt: cleanDate(String(accountForm.lastContactAt ?? "")),
          platformNotes: accountForm.platformNotes ?? "",
        },
      });
      toast.success("Cartera actualizada.");
      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function submitActivity(e: FormEvent) {
    e.preventDefault();
    if (!activityTarget) return;
    try {
      await createActivity.mutateAsync({
        tenantId: activityTarget.id,
        body: {
          type: activityForm.type,
          title: activityForm.title,
          notes: activityForm.notes,
        },
      });
      toast.success("Actividad registrada.");
      setActivityTarget(null);
      setActivityForm({ type: "NOTE", title: "", notes: "" });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cartera SaaS"
          description="Seguimiento de cuentas, responsables y renovaciones próximas."
          action={<Button asChild><Link href="/platform/tenants">Ver empresas</Link></Button>}
        />

        <div className="grid gap-3 md:grid-cols-5">
          <StatCard title="Total cuentas" value={stats.total} icon={<FileSearch size={18} />} tone="blue" />
          <StatCard title="Estables" value={stats.stable} icon={<FileSearch size={18} />} tone="green" />
          <StatCard title="En riesgo" value={stats.atRisk} icon={<ShieldAlert size={18} />} tone="red" />
          <StatCard title="Revisión 7 días" value={stats.reviewSoon} icon={<CalendarClock size={18} />} tone="amber" />
          <StatCard title="Con recobro" value={stats.pendingCollection} icon={<CalendarClock size={18} />} tone="neutral" />
        </div>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por empresa, email o ciudad"
                className="h-10 w-full rounded-xl border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
              />
            </label>
            <select
              value={accountHealth}
              onChange={(event) => setAccountHealth(event.target.value as PlatformAccountHealth | "all")}
              className="h-10 rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary"
            >
              {healthOptions.map((item) => (
                <option key={item} value={item}>{item === "all" ? "Todas las salud" : healthLabels[item]}</option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {accountsQuery.isLoading ? (
            <ListSkeleton rows={6} />
          ) : accounts.length === 0 ? (
            <div className="p-6"><EmptyState title="Sin cuentas para estos filtros" /></div>
          ) : (
            <div className="divide-y divide-border-light">
              {accounts.map((item) => (
                <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.8fr))_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/platform/tenants/${item.id}`} className="truncate font-semibold text-text-primary hover:text-brand-primary">
                        {item.name}
                      </Link>
                      <Badge variant={badgeVariant(item.accountHealth)}>{healthLabels[item.accountHealth]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {item.accountOwner ? `Responsable: ${item.accountOwner.name}` : "Sin responsable asignado"}
                      {item.collectionCase && item.collectionCase.status !== "CLOSED" ? ` · Recobro ${item.collectionCase.status}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Renovación</p>
                    <p className="text-sm font-medium text-text-primary">{formatDate(item.renewalAt) || "Sin fecha"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Próxima revisión</p>
                    <p className="text-sm font-medium text-text-primary">{formatDate(item.nextReviewAt) || "Sin fecha"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Pendiente</p>
                    <p className="text-sm font-medium text-text-primary">{formatCredits(item.billing.overdueAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Último contacto</p>
                    <p className="text-sm font-medium text-text-primary">{formatDate(item.lastContactAt) || "Sin registrar"}</p>
                  </div>
                  <div className="flex gap-2 lg:justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}><Pencil size={14} />Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => setActivityTarget(item)}><MessageSquarePlus size={14} />Actividad</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Cartera · ${selected.name}` : "Editar cartera"}>
        <form className="space-y-4" onSubmit={submitAccount}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-secondary">Salud de cuenta</span>
              <select className="h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary" value={accountForm.accountHealth ?? "STABLE"} onChange={(event) => setAccountForm((current) => ({ ...current, accountHealth: event.target.value as PlatformAccountHealth }))}>
                {healthOptions.filter((item) => item !== "all").map((item) => (
                  <option key={item} value={item}>{healthLabels[item]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-secondary">Responsable</span>
              <select className="h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary" value={String(accountForm.accountOwnerId ?? "")} onChange={(event) => setAccountForm((current) => ({ ...current, accountOwnerId: event.target.value || null }))}>
                <option value="">Sin asignar</option>
                {staff.map((member: PlatformStaffOption) => (
                  <option key={member.id} value={member.id}>{member.name} · {member.email}</option>
                ))}
              </select>
            </label>
            <Field label="Próxima revisión" type="date" value={String(accountForm.nextReviewAt ?? "")} onChange={(event) => setAccountForm((current) => ({ ...current, nextReviewAt: event.target.value }))} />
            <Field label="Último contacto" type="date" value={String(accountForm.lastContactAt ?? "")} onChange={(event) => setAccountForm((current) => ({ ...current, lastContactAt: event.target.value }))} />
          </div>
          <label className="space-y-1 text-sm block">
            <span className="font-medium text-text-secondary">Notas internas</span>
            <textarea className="min-h-28 w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary" value={String(accountForm.platformNotes ?? "")} onChange={(event) => setAccountForm((current) => ({ ...current, platformNotes: event.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button type="submit" disabled={updateAccount.isPending}>{updateAccount.isPending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(activityTarget)} onClose={() => setActivityTarget(null)} title={activityTarget ? `Actividad · ${activityTarget.name}` : "Nueva actividad"}>
        <form className="space-y-4" onSubmit={submitActivity}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-secondary">Tipo</span>
              <select className="h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary" value={activityForm.type} onChange={(event) => setActivityForm((current) => ({ ...current, type: event.target.value as CreateTenantAccountActivityInput["type"] }))}>
                <option value="NOTE">Nota</option>
                <option value="CONTACT">Contacto</option>
                <option value="COLLECTION">Recobro</option>
                <option value="PAYMENT">Pago</option>
                <option value="PROMISE">Promesa</option>
                <option value="STATUS_CHANGE">Cambio de estado</option>
                <option value="RENEWAL">Renovación</option>
              </select>
            </label>
            <Field label="Título" value={activityForm.title} onChange={(event) => setActivityForm((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <label className="space-y-1 text-sm block">
            <span className="font-medium text-text-secondary">Notas</span>
            <textarea className="min-h-28 w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary" value={activityForm.notes ?? ""} onChange={(event) => setActivityForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setActivityTarget(null)}>Cancelar</Button>
            <Button type="submit" disabled={createActivity.isPending}>{createActivity.isPending ? "Guardando..." : "Registrar"}</Button>
          </div>
        </form>
      </Modal>
    </ProtectedLayout>
  );
}

