"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, HandCoins, Pencil, Search, ShieldAlert, UserRound } from "lucide-react";
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
  usePlatformCollections,
  usePlatformStaffOptions,
  useUpdateTenantCollection,
} from "@/hooks/usePlatform";
import { getErrorMessage } from "@/lib/errors";
import { formatCredits, formatDate } from "@/lib/format";
import type {
  PlatformCollectionStatus,
  PlatformCollectionSummary,
  PlatformStaffOption,
  UpdateTenantCollectionInput,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const statusLabels: Record<PlatformCollectionStatus, string> = {
  OPEN: "Abierto",
  CONTACTED: "Contactado",
  PROMISE: "Promesa",
  DISPUTED: "Disputa",
  CLOSED: "Cerrado",
};

const statusOptions: Array<PlatformCollectionStatus | "all"> = [
  "all",
  "OPEN",
  "CONTACTED",
  "PROMISE",
  "DISPUTED",
  "CLOSED",
];

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function cleanDate(value: string) {
  return value.trim() ? value : null;
}

function badgeVariant(value: PlatformCollectionStatus) {
  if (value === "OPEN") return "warning" as const;
  if (value === "CONTACTED") return "secondary" as const;
  if (value === "PROMISE") return "success" as const;
  if (value === "DISPUTED") return "danger" as const;
  return "default" as const;
}

export default function PlatformCollectionsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole("SUPERADMIN");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PlatformCollectionStatus | "all">("all");
  const [assignedToId, setAssignedToId] = useState<string>("all");
  const [selected, setSelected] = useState<PlatformCollectionSummary | null>(null);
  const [form, setForm] = useState<UpdateTenantCollectionInput>({
    assignedToId: null,
    status: "OPEN",
    notes: "",
    lastContactAt: null,
    nextActionAt: null,
    promiseDate: null,
    closedAt: null,
  });

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  const collectionsQuery = usePlatformCollections(
    {
      q: query,
      status,
      assignedToId: assignedToId === "all" ? undefined : assignedToId,
      take: 100,
    },
    { enabled: allowed },
  );
  const staffQuery = usePlatformStaffOptions({ enabled: allowed });
  const updateCollection = useUpdateTenantCollection();

  const collections = useMemo(
    () => collectionsQuery.data ?? [],
    [collectionsQuery.data],
  );
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const stats = useMemo(
    () => ({
      total: collections.length,
      open: collections.filter((item) => item.status === "OPEN").length,
      promise: collections.filter((item) => item.status === "PROMISE").length,
      disputed: collections.filter((item) => item.status === "DISPUTED").length,
      overdueAmount: collections.reduce(
        (sum, item) => sum + Number(item.billing.overdueAmount ?? 0),
        0,
      ),
    }),
    [collections],
  );

  if (!allowed) return null;

  function openEdit(item: PlatformCollectionSummary) {
    setSelected(item);
    setForm({
      assignedToId: item.assignedTo?.id ?? null,
      status: item.status,
      notes: item.notes ?? "",
      lastContactAt: toDateInput(item.lastContactAt),
      nextActionAt: toDateInput(item.nextActionAt),
      promiseDate: toDateInput(item.promiseDate),
      closedAt: toDateInput(item.closedAt),
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      await updateCollection.mutateAsync({
        tenantId: selected.tenantId,
        body: {
          assignedToId: form.assignedToId || null,
          status: form.status,
          notes: form.notes ?? "",
          lastContactAt: cleanDate(String(form.lastContactAt ?? "")),
          nextActionAt: cleanDate(String(form.nextActionAt ?? "")),
          promiseDate: cleanDate(String(form.promiseDate ?? "")),
          closedAt: cleanDate(String(form.closedAt ?? "")),
        },
      });
      toast.success("Caso de recobro actualizado.");
      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Recobro"
          description="Seguimiento manual de cobros, promesas y próximos pasos."
          action={
            <Button asChild>
              <Link href="/platform/billing">Ver facturación</Link>
            </Button>
          }
        />

        <div className="grid gap-3 md:grid-cols-5">
          <StatCard title="Casos" value={stats.total} icon={<HandCoins size={18} />} tone="blue" />
          <StatCard title="Abiertos" value={stats.open} icon={<ShieldAlert size={18} />} tone="amber" />
          <StatCard title="Promesa" value={stats.promise} icon={<CalendarClock size={18} />} tone="green" />
          <StatCard title="Disputa" value={stats.disputed} icon={<UserRound size={18} />} tone="red" />
          <StatCard title="Pendiente total" value={formatCredits(stats.overdueAmount)} icon={<HandCoins size={18} />} tone="neutral" />
        </div>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
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
              value={status}
              onChange={(event) => setStatus(event.target.value as PlatformCollectionStatus | "all")}
              className="h-10 rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary"
            >
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Todos los estados" : statusLabels[item]}
                </option>
              ))}
            </select>
            <select
              value={assignedToId}
              onChange={(event) => setAssignedToId(event.target.value)}
              className="h-10 rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary"
            >
              <option value="all">Todos los responsables</option>
              {staff.map((member: PlatformStaffOption) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {collectionsQuery.isLoading ? (
            <ListSkeleton rows={6} />
          ) : collections.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Sin casos para estos filtros" />
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {collections.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.8fr))_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/platform/tenants/${item.tenant.id}`}
                        className="truncate font-semibold text-text-primary hover:text-brand-primary"
                      >
                        {item.tenant.name}
                      </Link>
                      <Badge variant={badgeVariant(item.status)}>
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {item.assignedTo
                        ? `Responsable: ${item.assignedTo.name}`
                        : "Sin responsable asignado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Pendiente</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatCredits(item.billing.overdueAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Último contacto</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatDate(item.lastContactAt) || "Sin registrar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Próxima acción</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatDate(item.nextActionAt) || "Sin fecha"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Promesa</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatDate(item.promiseDate) || "Sin fecha"}
                    </p>
                  </div>
                  <div className="flex gap-2 lg:justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Pencil size={14} />
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Recobro · ${selected.tenant.name}` : "Editar caso"}
      >
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-secondary">Estado</span>
              <select
                className="h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary"
                value={form.status ?? "OPEN"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as PlatformCollectionStatus,
                  }))
                }
              >
                {statusOptions
                  .filter((item) => item !== "all")
                  .map((item) => (
                    <option key={item} value={item}>
                      {statusLabels[item]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-text-secondary">Responsable</span>
              <select
                className="h-10 w-full rounded-xl border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary"
                value={String(form.assignedToId ?? "")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    assignedToId: event.target.value || null,
                  }))
                }
              >
                <option value="">Sin asignar</option>
                {staff.map((member: PlatformStaffOption) => (
                  <option key={member.id} value={member.id}>
                    {member.name} · {member.email}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Último contacto"
              type="date"
              value={String(form.lastContactAt ?? "")}
              onChange={(event) =>
                setForm((current) => ({ ...current, lastContactAt: event.target.value }))
              }
            />
            <Field
              label="Próxima acción"
              type="date"
              value={String(form.nextActionAt ?? "")}
              onChange={(event) =>
                setForm((current) => ({ ...current, nextActionAt: event.target.value }))
              }
            />
            <Field
              label="Fecha promesa"
              type="date"
              value={String(form.promiseDate ?? "")}
              onChange={(event) =>
                setForm((current) => ({ ...current, promiseDate: event.target.value }))
              }
            />
            <Field
              label="Cierre"
              type="date"
              value={String(form.closedAt ?? "")}
              onChange={(event) =>
                setForm((current) => ({ ...current, closedAt: event.target.value }))
              }
            />
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-text-secondary">Notas</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
              value={String(form.notes ?? "")}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCollection.isPending}>
              {updateCollection.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </ProtectedLayout>
  );
}

