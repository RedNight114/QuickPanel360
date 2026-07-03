'use client';



import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useRouter, useSearchParams } from 'next/navigation';

import {

  Archive,

  Building2,

  Eye,

  Pencil,

  Plus,

  RotateCcw,

  Search,

  ShieldAlert,

  ShieldOff,

  SortAsc,

  Users,

  Wallet,

} from 'lucide-react';

import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';

import { StatCard } from '@/components/common/StatCard';

import { ProtectedLayout } from '@/components/layout/protected-layout';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';

import { EmptyState } from '@/components/ui/empty-state';

import { ErrorState } from '@/components/ui/error-state';

import { ListSkeleton } from '@/components/ui/loading-state';

import { Field } from '@/components/ui/field';

import { Modal } from '@/components/ui/modal';

import {

  useArchiveTenant,

  useCreatePlatformTenant,

  usePlatformTenants,

  useReactivateTenant,

  useSuspendTenant,

  useUpdatePlatformTenant,

} from '@/hooks/usePlatform';

import { getErrorMessage } from '@/lib/errors';

import { formatDate } from '@/lib/format';

import type { CreatePlatformTenantInput, PlatformTenantSummary, TenantAccessStatus, TenantStatus } from '@/lib/types';

import { useAuth } from '@/providers/auth-provider';



const emptyForm: CreatePlatformTenantInput = {

  name: '',

  legalName: '',

  taxId: '',

  email: '',

  phone: '',

  city: '',

  country: 'España',

  ownerName: '',

  ownerEmail: '',

  ownerPassword: '',

};



const statusLabels: Record<TenantStatus, string> = {

  PENDING: 'Pendiente',

  ACTIVE: 'Activa',

  SUSPENDED: 'Suspendida',

  DISABLED: 'Deshabilitada',

  ARCHIVED: 'Archivada',

};



const accessLabels: Record<string, string> = {

  ENABLED: 'Acceso activo',

  DISABLED: 'Acceso deshabilitado',

  EMERGENCY_LOCKED: 'Emergencia activa',

};



function cleanForm(form: CreatePlatformTenantInput) {

  return Object.fromEntries(

    Object.entries(form).filter(([, value]) => String(value ?? '').trim() !== ''),

  ) as CreatePlatformTenantInput;

}



function statusVariant(status: TenantStatus) {

  if (status === 'ACTIVE') return 'success';

  if (status === 'SUSPENDED') return 'danger';

  if (status === 'ARCHIVED') return 'warning';

  return 'secondary';

}



function accessVariant(status: string) {

  if (status === 'ENABLED') return 'success';

  if (status === 'EMERGENCY_LOCKED') return 'danger';

  return 'secondary';

}



function sortTenants(tenants: PlatformTenantSummary[], sort: string) {

  const copy = [...tenants];

  return copy.sort((a, b) => {

    if (sort === 'name') return a.name.localeCompare(b.name);

    if (sort === 'users') return b.usersCount - a.usersCount;

    if (sort === 'members') return b.membersCount - a.membersCount;

    if (sort === 'sales') return b.salesCount - a.salesCount;

    if (sort === 'activity') return new Date(b.lastActivityAt ?? 0).getTime() - new Date(a.lastActivityAt ?? 0).getTime();

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  });

}



function validateCreateForm(form: CreatePlatformTenantInput) {

  if (!form.name.trim()) return 'El nombre comercial es obligatorio';

  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return 'El email de empresa no es válido';

  if (!form.ownerName.trim()) return 'El nombre del responsable inicial es obligatorio';

  if (!/^\S+@\S+\.\S+$/.test(form.ownerEmail)) return 'El email del responsable inicial no es válido';

  if (form.ownerPassword.length < 8) return 'La contraseña temporal debe tener mínimo 8 caracteres';

  return null;

}



function PlatformTenantsContent() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const { hasRole } = useAuth();

  const allowed = hasRole('SUPERADMIN');

  const [query, setQuery] = useState('');

  const [status, setStatus] = useState<TenantStatus | 'all'>('all');

  const [accessStatus, setAccessStatus] = useState<TenantAccessStatus | 'all'>('all');

  const [sort, setSort] = useState('recent');

  const [formOpen, setFormOpen] = useState(false);

  const [editing, setEditing] = useState<PlatformTenantSummary | null>(null);

  const [form, setForm] = useState<CreatePlatformTenantInput>(emptyForm);

  const [confirmAction, setConfirmAction] = useState<null | { type: 'suspend' | 'reactivate' | 'archive'; tenant: PlatformTenantSummary }>(null);



  const tenantsQuery = usePlatformTenants({ q: query, status, accessStatus, take: 200 }, { enabled: allowed });

  const createTenant = useCreatePlatformTenant();

  const updateTenant = useUpdatePlatformTenant();

  const suspendTenant = useSuspendTenant();

  const reactivateTenant = useReactivateTenant();

  const archiveTenant = useArchiveTenant();



  useEffect(() => {

    if (!allowed) router.replace('/dashboard');

  }, [allowed, router]);



  useEffect(() => {

    if (allowed && searchParams.get('new') === '1') {

      setEditing(null);

      setForm(emptyForm);

      setFormOpen(true);

    }



    const access = searchParams.get('accessStatus');

    if (allowed && access === 'EMERGENCY_LOCKED') {

      setAccessStatus('EMERGENCY_LOCKED');

    }

  }, [allowed, searchParams]);



  const saving =

    createTenant.isPending ||

    updateTenant.isPending ||

    suspendTenant.isPending ||

    reactivateTenant.isPending ||

    archiveTenant.isPending;



  const tenants = useMemo(() => sortTenants(tenantsQuery.data ?? [], sort), [tenantsQuery.data, sort]);

  const kpis = useMemo(() => ({

    total: tenants.length,

    active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,

    suspended: tenants.filter((tenant) => tenant.status === 'SUSPENDED').length,

    archived: tenants.filter((tenant) => tenant.status === 'ARCHIVED').length,

    openCash: tenants.reduce((sum, tenant) => sum + tenant.openCashSessions, 0),

    newThisMonth: tenants.filter((tenant) => {

      const created = new Date(tenant.createdAt);

      const now = new Date();

      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();

    }).length,

  }), [tenants]);



  if (!allowed) return null;



  function openCreate() {

    setEditing(null);

    setForm(emptyForm);

    setFormOpen(true);

  }



  function openEdit(tenant: PlatformTenantSummary) {

    setEditing(tenant);

    setForm({

      name: tenant.name,

      legalName: tenant.legalName ?? '',

      taxId: tenant.taxId ?? '',

      email: tenant.email ?? '',

      phone: tenant.phone ?? '',

      city: tenant.city ?? '',

      country: tenant.country ?? 'España',

      ownerName: '',

      ownerEmail: '',

      ownerPassword: '',

    });

    setFormOpen(true);

  }



  async function submitForm(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();



    if (!editing) {

      const validation = validateCreateForm(form);

      if (validation) {

        toast.error(validation);

        return;

      }

    }



    try {

      if (editing) {

        const cleaned = cleanForm(form);

        await updateTenant.mutateAsync({

          id: editing.id,

          body: {

            name: cleaned.name,

            legalName: cleaned.legalName,

            taxId: cleaned.taxId,

            email: cleaned.email,

            phone: cleaned.phone,

            city: cleaned.city,

            country: cleaned.country,
          },
        });



        toast.success('Empresa actualizada');

      } else {

        const created = await createTenant.mutateAsync(cleanForm(form));

        toast.success('Empresa creada. Configura el plan y los módulos.', {

          action: {

            label: 'Configurar',

            onClick: () => router.push(`/platform/tenants/${created.id}?setup=1`),

          },

        });

        router.push(`/platform/tenants/${created.id}?setup=1`);

      }

      setFormOpen(false);

      router.replace('/platform/tenants');

    } catch (error) {

      toast.error(getErrorMessage(error, 'No se pudo guardar la empresa'));

    }

  }



  async function runConfirmAction() {

    if (!confirmAction) return;

    try {

      if (confirmAction.type === 'suspend') {

        await suspendTenant.mutateAsync(confirmAction.tenant.id);

        toast.success('Empresa suspendida');

      } else if (confirmAction.type === 'reactivate') {

        await reactivateTenant.mutateAsync(confirmAction.tenant.id);

        toast.success('Empresa reactivada');

      } else {

        await archiveTenant.mutateAsync(confirmAction.tenant.id);

        toast.success('Empresa archivada');

      }

      setConfirmAction(null);

    } catch (error) {

      toast.error(getErrorMessage(error, 'No se pudo completar la acción'));

    }

  }



  return (

    <ProtectedLayout>

      <div className="space-y-6">

        <PageHeader

          title="Empresas"

          description="Gestiona las empresas que usan el SaaS."

          action={<Button onClick={openCreate}><Plus size={16} />Nueva empresa</Button>}

        />



        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">

          <StatCard title="Total empresas" value={kpis.total} icon={<Building2 size={18} />} tone="blue" />

          <StatCard title="Activas" value={kpis.active} icon={<Building2 size={18} />} tone="green" />

          <StatCard title="Suspendidas" value={kpis.suspended} icon={<ShieldOff size={18} />} tone="red" />

          <StatCard title="Archivadas" value={kpis.archived} icon={<Archive size={18} />} tone="amber" />

          <StatCard title="Cajas abiertas" value={kpis.openCash} icon={<Wallet size={18} />} tone="blue" />

          <StatCard title="Nuevas este mes" value={kpis.newThisMonth} icon={<Plus size={18} />} tone="neutral" />

        </div>



        <Card className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_190px_190px]">

          <label className="relative">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />

            <input

              className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"

              placeholder="Buscar por nombre, email, ciudad o país"

              value={query}

              onChange={(event) => setQuery(event.target.value)}

            />

          </label>

          <select className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" value={status} onChange={(event) => setStatus(event.target.value as TenantStatus | 'all')}>

            <option value="all">Todos los estados</option>

            <option value="ACTIVE">Activas</option>

            <option value="SUSPENDED">Suspendidas</option>

            <option value="ARCHIVED">Archivadas</option>

          </select>

          <select className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" value={accessStatus} onChange={(event) => setAccessStatus(event.target.value as TenantAccessStatus | 'all')}>

            <option value="all">Todos los accesos</option>

            <option value="ENABLED">Activo</option>

            <option value="EMERGENCY_LOCKED">Emergencia</option>

          </select>

          <label className="relative">

            <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />

            <select className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" value={sort} onChange={(event) => setSort(event.target.value)}>

              <option value="recent">Recientes</option>

              <option value="name">Nombre</option>

              <option value="users">Más colaboradores</option>

              <option value="members">Más socios</option>

              <option value="sales">Más dispensaciones</option>

              <option value="activity">Última actividad</option>

            </select>

          </label>

        </Card>



        <section className="space-y-3">

          {tenantsQuery.isLoading ? <ListSkeleton rows={5} /> : null}

          {!tenantsQuery.isLoading && tenantsQuery.isError ? (

            <ErrorState message="No se pudieron cargar las empresas." onRetry={() => tenantsQuery.refetch()} />

          ) : null}

          {!tenantsQuery.isLoading && !tenantsQuery.isError && tenants.length === 0 ? <EmptyState title="No hay empresas con estos filtros" /> : null}

          {tenants.map((tenant) => (

            <Card key={tenant.id} className="p-4">

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">

                <div className="flex gap-3">

                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-lighter text-brand-primary">

                    <Building2 size={20} />

                  </div>

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <h2 className="font-semibold text-text-primary">{tenant.name}</h2>

                      <Badge variant={statusVariant(tenant.status)}>{statusLabels[tenant.status]}</Badge>

                      <Badge variant={accessVariant(tenant.accessStatus)}>{accessLabels[tenant.accessStatus] ?? tenant.accessStatus}</Badge>

                      <Badge variant="outline">{tenant.subscription?.plan?.name ?? 'Sin plan'}</Badge>

                    </div>

                    <p className="mt-1 text-sm text-text-muted">

                      {tenant.legalName || 'Sin nombre legal'} ? {tenant.email || 'Sin email'}

                    </p>

                    <p className="mt-1 text-sm text-text-muted">

                      {tenant.city || 'Sin ciudad'} / {tenant.country || 'Sin país'} · Alta {formatDate(tenant.createdAt)}

                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">

                      <span className="rounded-lg bg-bg-soft px-2 py-1"><Users size={12} className="mr-1 inline" />{tenant.usersCount} colaboradores</span>

                      <span className="rounded-lg bg-bg-soft px-2 py-1">{tenant.membersCount} socios</span>

                      <span className="rounded-lg bg-bg-soft px-2 py-1">{tenant.salesCount} dispensaciones</span>

                      <span className="rounded-lg bg-bg-soft px-2 py-1">{tenant.openCashSessions} cajas abiertas</span>

                      <span className="rounded-lg bg-bg-soft px-2 py-1">Actividad {formatDate(tenant.lastActivityAt)}</span>

                    </div>

                  </div>

                </div>

                <div className="flex flex-wrap gap-2">

                  <Button asChild variant="outline" size="sm"><Link href={`/platform/tenants/${tenant.id}`}><Eye size={14} />Ver</Link></Button>

                  {tenant.accessStatus === 'EMERGENCY_LOCKED' ? (

                    <Button asChild variant="outline" size="sm">

                      <Link href="/platform/emergencies"><ShieldAlert size={14} />Resolver emergencia</Link>

                    </Button>

                  ) : null}

                  <Button variant="secondary" size="sm" onClick={() => openEdit(tenant)}><Pencil size={14} />Editar</Button>

                  {tenant.status === 'SUSPENDED' ? (

                    <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'reactivate', tenant })}><RotateCcw size={14} />Reactivar</Button>

                  ) : tenant.status !== 'ARCHIVED' ? (

                    <Button variant="danger" size="sm" onClick={() => setConfirmAction({ type: 'suspend', tenant })}><ShieldOff size={14} />Suspender</Button>

                  ) : null}

                  {tenant.status !== 'ARCHIVED' ? (

                    <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'archive', tenant })}><Archive size={14} />Archivar</Button>

                  ) : null}

                </div>

              </div>

            </Card>

          ))}

        </section>



        <Modal

          open={formOpen}

          onClose={() => setFormOpen(false)}

          title={editing ? 'Editar empresa' : 'Nueva empresa'}

          description={editing ? 'Actualiza los datos principales de la empresa.' : 'Crea la empresa, su owner inicial y el access link de arranque.'}

          size="lg"

          actions={

            <>

              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>

              <Button type="submit" form="platform-tenant-form" disabled={saving}>{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear empresa'}</Button>

            </>

          }

        >

          <form id="platform-tenant-form" className="space-y-5" onSubmit={submitForm}>

            <section>

              <h3 className="mb-3 text-sm font-semibold text-text-primary">Datos de empresa</h3>

              <div className="grid gap-4 md:grid-cols-2">

                <Field label="Nombre comercial" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

                <Field label="Nombre legal" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />

                <Field label="Identificación fiscal" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />

                <Field label="Email empresa" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

                <Field label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

                <Field label="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />

                <Field label="País" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />

              </div>

            </section>



            {!editing ? (

              <>

                <section>

                  <h3 className="mb-3 text-sm font-semibold text-text-primary">Responsable inicial</h3>

                  <div className="grid gap-4 md:grid-cols-2">

                    <Field label="Nombre" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />

                    <Field label="Email" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required />

                    <Field label="Contraseña temporal" type="password" minLength={8} value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} required />

                  </div>

                </section>



                <section className="rounded-xl border border-border-light bg-white p-4 shadow-card text-sm text-text-muted">

                  <h3 className="font-semibold text-text-primary">Configuración inicial</h3>

                  <p className="mt-2">Estado inicial: Activa. Access link inicial: automático. Plan: Sin plan asignado.</p>

                  <p className="mt-1 text-xs text-text-muted">Podrás asignar plan y módulos desde el detalle de la empresa una vez creada.</p>

                </section>

              </>

            ) : null}

          </form>

        </Modal>



        <Modal

          open={Boolean(confirmAction)}

          onClose={() => setConfirmAction(null)}

          title={confirmAction?.type === 'archive' ? 'Archivar empresa' : confirmAction?.type === 'reactivate' ? 'Reactivar empresa' : 'Suspender empresa'}

          description={

            confirmAction?.type === 'archive'

              ? 'La empresa quedará archivada. Sus datos se conservarán, pero no podrá operar.'

              : confirmAction?.type === 'reactivate'

                ? 'La empresa recuperará el acceso al sistema.'

                : 'La empresa no podrá acceder al sistema mientras esté suspendida.'

          }

          size="sm"

          actions={

            <>

              <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={saving}>Cancelar</Button>

              <Button variant={confirmAction?.type === 'archive' || confirmAction?.type === 'suspend' ? 'danger' : 'default'} onClick={runConfirmAction} disabled={saving}>

                {confirmAction?.type === 'archive' ? 'Archivar empresa' : confirmAction?.type === 'reactivate' ? 'Reactivar empresa' : 'Suspender empresa'}

              </Button>

            </>

          }

        >

          <div className="space-y-2">

            <p className="font-medium text-text-primary">{confirmAction?.tenant.name}</p>

            {confirmAction?.type === 'suspend' ? <p className="text-sm text-text-muted">Esta acción quedará registrada en auditoría.</p> : null}

            {confirmAction?.type === 'archive' ? <p className="text-sm text-text-muted">No se borrarán datos físicamente.</p> : null}

          </div>

        </Modal>

      </div>

    </ProtectedLayout>

  );

}



export default function PlatformTenantsPage() {

  return (

    <Suspense fallback={<ProtectedLayout><ListSkeleton rows={5} /></ProtectedLayout>}>

      <PlatformTenantsContent />

    </Suspense>

  );

}

