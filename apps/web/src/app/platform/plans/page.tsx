'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, CheckCircle2, Euro, Layers, Pencil, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { ListSkeleton } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import {
  useArchivePlatformPlan,
  useCreatePlatformPlan,
  usePlatformModules,
  usePlatformPlans,
  useUpdatePlanModules,
  useUpdatePlatformPlan,
} from '@/hooks/usePlatform';
import { getErrorMessage } from '@/lib/errors';
import { formatEuros } from '@/lib/format';
import type { CreatePlatformPlanInput, PlatformPlan } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const emptyForm: CreatePlatformPlanInput = {
  code: '',
  name: '',
  description: '',
  priceMonthly: 0,
  currency: 'EUR',
  maxUsers: undefined,
  maxProducts: undefined,
  features: [],
};

function getFeatures(plan: PlatformPlan) {
  return Array.isArray(plan.features) ? plan.features.map(String) : [];
}

function cleanPlanForm(form: CreatePlatformPlanInput) {
  return {
    ...form,
    code: form.code.trim().toLowerCase(),
    name: form.name.trim(),
    description: form.description?.trim() || undefined,
    currency: form.currency || 'EUR',
    maxUsers: form.maxUsers ? Number(form.maxUsers) : undefined,
    maxProducts: form.maxProducts ? Number(form.maxProducts) : undefined,
    features: form.features?.filter(Boolean) ?? [],
  };
}

export default function PlatformPlansPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole('SUPERADMIN');
  const plansQuery = usePlatformPlans({ enabled: allowed });
  const modulesQuery = usePlatformModules({ enabled: allowed });
  const createPlan = useCreatePlatformPlan();
  const updatePlan = useUpdatePlatformPlan();
  const updatePlanModules = useUpdatePlanModules();
  const archivePlan = useArchivePlatformPlan();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformPlan | null>(null);
  const [form, setForm] = useState<CreatePlatformPlanInput>(emptyForm);
  const [featuresText, setFeaturesText] = useState('');
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [confirmArchive, setConfirmArchive] = useState<PlatformPlan | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'ARCHIVED'>('all');

  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const activeModules = useMemo(
    () => modulesQuery.data?.filter((module) => module.status === 'ACTIVE') ?? [],
    [modulesQuery.data],
  );
  const saving = createPlan.isPending || updatePlan.isPending || updatePlanModules.isPending || archivePlan.isPending;
  const kpis = useMemo(() => ({
    total: plans.length,
    active: plans.filter((plan) => plan.status === 'ACTIVE').length,
    archived: plans.filter((plan) => plan.status === 'ARCHIVED').length,
    estimatedMonthlyRevenue: plans
      .filter((plan) => plan.status === 'ACTIVE')
      .reduce((sum, plan) => sum + Number(plan.metrics?.estimatedMonthlyRevenue ?? 0), 0),
    activeTenants: plans.reduce((sum, plan) => sum + Number(plan.metrics?.activeTenantsCount ?? 0), 0),
    modulesCovered: new Set(plans.flatMap((plan) => plan.modules?.map((item) => item.moduleId) ?? [])).size,
  }), [plans]);
  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      const matchesQuery = !normalizedQuery
        || [plan.name, plan.code, plan.description, ...getFeatures(plan)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [plans, query, statusFilter]);

  if (!allowed) return null;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFeaturesText('');
    setModuleIds([]);
    setFormOpen(true);
  }

  function openEdit(plan: PlatformPlan) {
    setEditing(plan);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      priceMonthly: Number(plan.priceMonthly ?? 0),
      currency: plan.currency,
      maxUsers: plan.maxUsers ?? undefined,
      maxProducts: plan.maxProducts ?? undefined,
      features: getFeatures(plan),
    });
    setFeaturesText(getFeatures(plan).join(', '));
    setModuleIds(plan.modules?.map((item) => item.moduleId) ?? []);
    setFormOpen(true);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = cleanPlanForm({
      ...form,
      features: featuresText.split(',').map((feature) => feature.trim()).filter(Boolean),
    });

    if (!body.code || !body.name) {
      toast.error('Código y nombre son obligatorios');
      return;
    }

    try {
      if (editing) {
        await updatePlan.mutateAsync({ id: editing.id, body });
        await updatePlanModules.mutateAsync({ planId: editing.id, moduleIds });
        toast.success('Plan actualizado');
      } else {
        const created = await createPlan.mutateAsync(body);
        if (moduleIds.length) {
          await updatePlanModules.mutateAsync({ planId: created.id, moduleIds });
        }
        toast.success('Plan creado');
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el plan'));
    }
  }

  async function runArchive() {
    if (!confirmArchive) return;
    try {
      await archivePlan.mutateAsync(confirmArchive.id);
      toast.success('Plan archivado');
      setConfirmArchive(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo archivar el plan'));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Planes"
          description="Diseña la oferta comercial y los módulos disponibles por plan."
          action={<Button onClick={openCreate}><Plus size={16} />Nuevo plan</Button>}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Planes totales" value={kpis.total} icon={<Layers size={18} />} tone="blue" />
          <StatCard title="Activos" value={kpis.active} icon={<CheckCircle2 size={18} />} tone="green" />
          <StatCard title="Archivados" value={kpis.archived} icon={<Archive size={18} />} tone="amber" />
          <StatCard title="MRR estimado" value={formatEuros(kpis.estimatedMonthlyRevenue)} icon={<Euro size={18} />} tone="green" />
          <StatCard title="Socios con plan" value={kpis.activeTenants} icon={<Users size={18} />} tone="blue" />
          <StatCard title="Módulos cubiertos" value={`${kpis.modulesCovered}/${activeModules.length}`} icon={<Users size={18} />} tone="blue" />
        </div>

        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border-light bg-white px-3">
              <Search size={16} className="text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, código o feature"
                className="h-full flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="all">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="ARCHIVED">Archivados</option>
            </select>
            <Button variant="outline" onClick={() => { setQuery(''); setStatusFilter('all'); }}>
              Limpiar
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Cobertura comercial</h2>
              <p className="mt-1 text-sm text-text-muted">Los planes activos definen qué módulos se sincronizan al asignarlos a una empresa.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {activeModules.slice(0, 8).map((module) => {
                const includedCount = plans.filter((plan) => plan.status === 'ACTIVE' && plan.modules?.some((item) => item.moduleId === module.id)).length;
                return (
                  <div key={module.id} className="rounded-xl border border-border-light bg-bg-soft p-3">
                    <p className="font-medium text-text-primary">{module.name}</p>
                    <p className="mt-1 text-sm text-text-muted">{includedCount} planes activos</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <section className="grid gap-4 xl:grid-cols-3">
          {plansQuery.isLoading ? <ListSkeleton rows={3} /> : null}
          {filteredPlans.map((plan) => {
            const features = getFeatures(plan);
            const modulesCount = plan.modules?.length ?? 0;
            const isArchived = plan.status === 'ARCHIVED';
            const activeTenants = plan.metrics?.activeTenantsCount ?? 0;
            const estimatedMonthlyRevenue = plan.metrics?.estimatedMonthlyRevenue ?? 0;

            return (
            <Card key={plan.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-text-primary">{plan.name}</h2>
                    <Badge variant={plan.status === 'ACTIVE' ? 'success' : 'warning'}>{plan.status === 'ACTIVE' ? 'Activo' : 'Archivado'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{plan.code}</p>
                </div>
                <p className="text-xl font-semibold text-text-primary">{formatEuros(plan.priceMonthly)}<span className="text-xs font-normal text-text-muted">/mes</span></p>
              </div>
              <p className="mt-4 min-h-10 text-sm text-text-muted">{plan.description || 'Sin descripción comercial'}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                  <p className="text-xs text-text-muted">Socios activos</p>
                  <p className="mt-1 font-semibold text-text-primary">{activeTenants}</p>
                </div>
                <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                  <p className="text-xs text-text-muted">MRR estimado</p>
                  <p className="mt-1 font-semibold text-text-primary">{formatEuros(estimatedMonthlyRevenue)}</p>
                </div>
                <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                  <p className="text-xs text-text-muted">Módulos</p>
                  <p className="mt-1 font-semibold text-text-primary">{modulesCount}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                  <p className="text-xs text-text-muted">Usuarios</p>
                  <p className="mt-1 font-semibold text-text-primary">{plan.maxUsers ?? 'Sin límite'}</p>
                </div>
                <div className="rounded-xl border border-border-light bg-bg-soft p-3">
                  <p className="text-xs text-text-muted">Productos</p>
                  <p className="mt-1 font-semibold text-text-primary">{plan.maxProducts ?? 'Sin límite'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {features.length ? features.map((feature) => (
                  <Badge key={feature} variant="outline">{feature}</Badge>
                )) : <Badge variant="outline">Sin features</Badge>}
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-text-muted">Módulos incluidos</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.modules?.length ? plan.modules.map((item) => (
                    <Badge key={item.moduleId} variant="secondary">{item.module.name}</Badge>
                  )) : <Badge variant="outline">Sin módulos</Badge>}
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(plan)}><Pencil size={14} />Editar</Button>
                {!isArchived ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirmArchive(plan)}><Archive size={14} />Archivar</Button>
                ) : null}
              </div>
            </Card>
          );
          })}
          {!plansQuery.isLoading && filteredPlans.length === 0 ? (
            <Card className="p-6 xl:col-span-3">
              <p className="font-medium text-text-primary">No hay planes con estos filtros.</p>
              <p className="mt-1 text-sm text-text-muted">Ajusta la búsqueda o crea un nuevo plan comercial.</p>
            </Card>
          ) : null}
        </section>

        <Modal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title={editing ? 'Editar plan' : 'Nuevo plan'}
          description="Define precio, límites comerciales y módulos que se activarán al asignar este plan."
          size="lg"
          actions={
            <>
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" form="platform-plan-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar plan'}</Button>
            </>
          }
        >
          <form id="platform-plan-form" className="space-y-5" onSubmit={submitForm}>
            <section className="rounded-xl border border-border-light bg-white p-4 shadow-card">
              <h3 className="font-semibold text-text-primary">Datos comerciales</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Field label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Field label="Valor mensual" type="number" min={0} value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} required />
                <Field label="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                <Field label="Features separadas por coma" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
              </div>
            </section>
            <section className="rounded-xl border border-border-light bg-white p-4 shadow-card">
              <h3 className="font-semibold text-text-primary">Límites operativos</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Max usuarios" type="number" min={1} value={form.maxUsers ?? ''} onChange={(e) => setForm({ ...form, maxUsers: e.target.value ? Number(e.target.value) : undefined })} />
                <Field label="Max productos" type="number" min={1} value={form.maxProducts ?? ''} onChange={(e) => setForm({ ...form, maxProducts: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </section>
            <section className="rounded-xl border border-border-light bg-white p-4 shadow-card">
              <h3 className="font-semibold text-text-primary">Módulos incluidos</h3>
              <p className="mt-1 text-sm text-text-muted">Al asignar este plan a una empresa, estos módulos se habilitan y el resto se deshabilita.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {activeModules.map((module) => (
                  <label key={module.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-light bg-white p-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={moduleIds.includes(module.id)}
                      onChange={(event) => {
                        setModuleIds((current) =>
                          event.target.checked
                            ? [...current, module.id]
                            : current.filter((id) => id !== module.id),
                        );
                      }}
                    />
                    <span>
                      <span className="block font-medium text-text-primary">{module.name}</span>
                      <span className="block text-sm text-text-muted">{module.category}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </form>
        </Modal>

        <Modal
          open={Boolean(confirmArchive)}
          onClose={() => setConfirmArchive(null)}
          title="Archivar plan"
          description="El plan dejará de estar disponible para nuevas asignaciones. Las suscripciones existentes conservarán referencia."
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setConfirmArchive(null)} disabled={saving}>Cancelar</Button>
              <Button variant="danger" onClick={runArchive} disabled={saving}>Archivar plan</Button>
            </>
          }
        >
          <p className="font-medium text-text-primary">{confirmArchive?.name}</p>
        </Modal>
      </div>
    </ProtectedLayout>
  );
}
