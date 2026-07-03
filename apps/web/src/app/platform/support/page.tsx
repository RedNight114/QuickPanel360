'use client';



import { FormEvent, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { AlertTriangle, Clock, Headphones, Lock, LogIn, Search, ShieldCheck, XCircle } from 'lucide-react';

import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';

import { StatCard } from '@/components/common/StatCard';

import { ProtectedLayout } from '@/components/layout/protected-layout';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';

import { EmptyState } from '@/components/ui/empty-state';

import { ListSkeleton } from '@/components/ui/loading-state';

import { Field } from '@/components/ui/field';

import { Modal } from '@/components/ui/modal';

import {

  useCloseSupportSession,

  useImpersonateSupportSession,

  useOpenSupportSession,

  usePlatformSupportSessions,

  usePlatformTenants,

} from '@/hooks/usePlatform';

import { getErrorMessage } from '@/lib/errors';

import { formatDate } from '@/lib/format';

import type { PlatformSupportSession } from '@/lib/types';

import { useAuth } from '@/providers/auth-provider';



function getSupportMinutes(openedAt: string, closedAt?: string | null) {

  const end = closedAt ? new Date(closedAt).getTime() : Date.now();

  const start = new Date(openedAt).getTime();



  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {

    return 0;

  }



  return Math.floor((end - start) / 60000);

}



function formatSupportDuration(session: PlatformSupportSession) {

  const minutes = getSupportMinutes(session.openedAt, session.closedAt);

  const hours = Math.floor(minutes / 60);

  const rest = minutes % 60;



  if (hours <= 0) {

    return `${rest} min`;

  }



  return `${hours} h ${rest} min`;

}



export default function PlatformSupportPage() {

  const router = useRouter();

  const { hasRole, startImpersonation } = useAuth();

  const allowed = hasRole('SUPERADMIN');

  const sessionsQuery = usePlatformSupportSessions({}, { enabled: allowed });

  const tenantsQuery = usePlatformTenants({ take: 200 }, { enabled: allowed });

  const closeSession = useCloseSupportSession();

  const impersonateSession = useImpersonateSupportSession();

  const openSession = useOpenSupportSession();

  const [query, setQuery] = useState('');

  const [status, setStatus] = useState<'all' | 'OPEN' | 'CLOSED'>('all');

  const [tenantId, setTenantId] = useState('all');

  const [closing, setClosing] = useState<PlatformSupportSession | null>(null);

  const [impersonating, setImpersonating] = useState<PlatformSupportSession | null>(null);

  const [closeNotes, setCloseNotes] = useState('');

  const [openModal, setOpenModal] = useState(false);

  const [openTenantId, setOpenTenantId] = useState('');

  const [openReason, setOpenReason] = useState('');



  useEffect(() => {

    if (!allowed) router.replace('/dashboard');

  }, [allowed, router]);



  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  const filteredSessions = useMemo(() => {

    const normalizedQuery = query.trim().toLowerCase();



    return sessions.filter((session) => {

      const matchesStatus = status === 'all' || session.status === status;

      const matchesTenant = tenantId === 'all' || session.tenantId === tenantId;

      const matchesQuery = !normalizedQuery

        || [session.reason, session.notes, session.tenant?.name, session.openedBy?.name]

          .filter(Boolean)

          .some((value) => String(value).toLowerCase().includes(normalizedQuery));



      return matchesStatus && matchesTenant && matchesQuery;

    }).sort((a, b) => {

      if (a.status !== b.status) return a.status === 'OPEN' ? -1 : 1;

      return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();

    });

  }, [query, sessions, status, tenantId]);



  const longRunningSessions = sessions.filter((session) => session.status === 'OPEN' && getSupportMinutes(session.openedAt) >= 120);

  const kpis = {

    total: sessions.length,

    open: sessions.filter((session) => session.status === 'OPEN').length,

    closed: sessions.filter((session) => session.status === 'CLOSED').length,

    longRunning: longRunningSessions.length,

  };



  if (!allowed) return null;



  async function submitClose(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (!closing) return;



    try {

      await closeSession.mutateAsync({ id: closing.id, body: { notes: closeNotes.trim() || undefined } });

      toast.success('Sesión de soporte cerrada');

      setClosing(null);

      setCloseNotes('');

    } catch (error) {

      toast.error(getErrorMessage(error, 'No se pudo cerrar la sesión'));

    }

  }



  async function submitOpenSession(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (!openTenantId || !openReason.trim()) return;

    try {

      await openSession.mutateAsync({ tenantId: openTenantId, body: { reason: openReason.trim() } });

      toast.success('Sesión de soporte abierta.');

      setOpenModal(false);

      setOpenTenantId('');

      setOpenReason('');

    } catch (error) {

      toast.error(getErrorMessage(error, 'No se pudo abrir la sesión.'));

    }

  }



  async function startSupportImpersonation(session: PlatformSupportSession) {

    try {

      const loginResponse = await impersonateSession.mutateAsync(session.id);

      toast.success('Entrando en modo soporte');

      setImpersonating(null);

      startImpersonation(loginResponse);

    } catch (error) {

      toast.error(getErrorMessage(error, 'No se pudo iniciar soporte'));

    }

  }



  return (

    <ProtectedLayout>

      <div className="space-y-6">

        <PageHeader

          title="Soporte"

          description="Sesiones internas de soporte con motivo obligatorio y auditoría."

          action={

            <Button onClick={() => setOpenModal(true)}>

              <Headphones size={15} />

              Abrir sesión

            </Button>

          }

        />



        <div className="grid gap-4 md:grid-cols-4">

          <StatCard title="Sesiones" value={kpis.total} icon={<Headphones size={18} />} tone="blue" />

          <StatCard title="Abiertas" value={kpis.open} icon={<Lock size={18} />} tone="amber" />

          <StatCard title="Cerradas" value={kpis.closed} icon={<XCircle size={18} />} tone="green" />

          <StatCard title="Largas" value={kpis.longRunning} icon={<Clock size={18} />} tone={kpis.longRunning ? 'red' : 'neutral'} />

        </div>



        <Card className="border-yellow-200 bg-yellow-50 p-4">

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

            <div className="flex gap-3">

              <ShieldCheck className="mt-0.5 text-yellow-800" size={20} />

              <div>

                <p className="font-semibold text-yellow-950">Modo soporte seguro</p>

                <p className="mt-1 text-sm text-yellow-900">

                  Solo se puede entrar con una sesión abierta, motivo registrado y auditoría. Al volver a plataforma se cierra la sesión automáticamente.
                </p>


              </div>

            </div>

            {kpis.longRunning ? (

              <Badge variant="danger">1 sesión larga</Badge>

            ) : (

              <Badge variant="success">Sin sesiones largas</Badge>

            )}

          </div>

        </Card>



        <Card className="grid gap-3 p-4 lg:grid-cols-[1fr_220px_180px_auto]">

          <label className="flex h-10 items-center gap-2 rounded-lg border border-border-light bg-white px-3">

            <Search size={16} className="text-text-muted" />

            <input

              value={query}

              onChange={(event) => setQuery(event.target.value)}

              placeholder="Buscar por motivo, empresa o actor"

              className="h-full flex-1 bg-transparent text-sm outline-none"

            />

          </label>

          <select

            value={tenantId}

            onChange={(event) => setTenantId(event.target.value)}

            className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"

          >

            <option value="all">Todas las empresas</option>

            {tenantsQuery.data?.map((tenant) => (

              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>

            ))}

          </select>

          <select

            value={status}

            onChange={(event) => setStatus(event.target.value as typeof status)}

            className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"

          >

            <option value="all">Todos</option>

            <option value="OPEN">Abiertas</option>

            <option value="CLOSED">Cerradas</option>

          </select>

          <Button variant="outline" onClick={() => { setQuery(''); setTenantId('all'); setStatus('all'); }}>

            Limpiar

          </Button>

        </Card>



        {sessionsQuery.isLoading ? <ListSkeleton rows={4} /> : null}

        {!sessionsQuery.isLoading && filteredSessions.length === 0 ? <EmptyState title="Sin sesiones de soporte" /> : null}



        <section className="space-y-3">

          {filteredSessions.map((session) => (

            <Card key={session.id} className="p-4">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <Badge variant={session.status === 'OPEN' ? 'warning' : 'success'}>

                      {session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}

                    </Badge>

                    {session.status === 'OPEN' && getSupportMinutes(session.openedAt) >= 120 ? (

                      <Badge variant="danger">Revisar duración</Badge>

                    ) : null}

                    {session.tenant ? (

                      <Link className="font-semibold text-brand-primary" href={`/platform/tenants/${session.tenant.id}`}>

                        {session.tenant.name}

                      </Link>

                    ) : (

                      <p className="font-semibold text-text-primary">Empresa</p>

                    )}

                  </div>

                  <p className="mt-2 text-sm text-text-muted">Motivo: {session.reason}</p>

                  {session.notes ? <p className="mt-1 text-sm text-text-muted">Notas: {session.notes}</p> : null}

                  <p className="mt-2 text-xs text-text-muted">

                    Abierta por {session.openedBy?.name ?? 'Sistema'} ? {formatDate(session.openedAt)} ? Duración {formatSupportDuration(session)}

                    {session.closedAt ? ` ? Cerrada ${formatDate(session.closedAt)}` : ''}

                  </p>

                </div>

                {session.status === 'OPEN' ? (

                  <div className="flex flex-wrap gap-2">

                    {session.tenant ? (

                      <Button asChild variant="outline">

                        <Link href={`/platform/tenants/${session.tenant.id}`}>Ver empresa</Link>

                      </Button>

                    ) : null}

                    <Button variant="secondary" onClick={() => setImpersonating(session)} disabled={impersonateSession.isPending}>

                      <LogIn size={15} />

                      Entrar como soporte

                    </Button>

                    <Button variant="outline" onClick={() => { setClosing(session); setCloseNotes(session.notes ?? ''); }} disabled={closeSession.isPending}>

                      Cerrar sesión

                    </Button>

                  </div>

                ) : null}

              </div>

            </Card>

          ))}

        </section>



        <Modal

          open={Boolean(impersonating)}

          onClose={() => setImpersonating(null)}

          title="Entrar en modo soporte"

          description="Accederás al club con permisos operativos. La acción quedará auditada."



          actions={(

            <>

              <Button variant="outline" onClick={() => setImpersonating(null)} disabled={impersonateSession.isPending}>Cancelar</Button>

              <Button onClick={() => { if (impersonating) startSupportImpersonation(impersonating); }} disabled={impersonateSession.isPending || !impersonating}>

                Entrar ahora

              </Button>

            </>

          )}

        >

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">

            <div className="flex gap-2">

              <AlertTriangle size={16} className="mt-0.5 shrink-0" />

              <p>Usa este modo solo para resolver la incidencia indicada. Al volver a plataforma la sesión se cerrará automáticamente.</p>

            </div>

          </div>

          <div className="mt-3 space-y-1 text-sm text-text-muted">

            <p><span className="font-medium text-text-primary">Empresa:</span> {impersonating?.tenant?.name}</p>

            <p><span className="font-medium text-text-primary">Motivo:</span> {impersonating?.reason}</p>

          </div>

        </Modal>



        <Modal

          open={Boolean(closing)}

          onClose={() => setClosing(null)}

          title="Cerrar sesión de soporte"

          description="La sesión quedará cerrada y auditada."

          size="sm"

          actions={(

            <>

              <Button variant="outline" onClick={() => setClosing(null)} disabled={closeSession.isPending}>Cancelar</Button>

              <Button type="submit" form="platform-support-close-form" disabled={closeSession.isPending}>Cerrar sesión</Button>

            </>

          )}

        >

          <form id="platform-support-close-form" className="space-y-3" onSubmit={submitClose}>

            <p className="text-sm text-text-muted">{closing?.tenant?.name}</p>

            <Field label="Notas de cierre" value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} />

          </form>

        </Modal>

        <Modal
          open={openModal}
          onClose={() => setOpenModal(false)}
          title="Abrir sesión de soporte"
          description="Selecciona la empresa y describe el motivo. Queda registrado en auditoría."
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenModal(false)} disabled={openSession.isPending}>Cancelar</Button>
              <Button type="submit" form="platform-support-open-form" disabled={openSession.isPending || !openTenantId || !openReason.trim()}>
                {openSession.isPending ? 'Abriendo...' : 'Abrir sesión'}
              </Button>
            </>
          }
        >
          <form id="platform-support-open-form" className="space-y-4" onSubmit={submitOpenSession}>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">Empresa</label>
              <select
                value={openTenantId}
                onChange={(e) => setOpenTenantId(e.target.value)}
                className="h-11 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                required
              >
                <option value="">Selecciona una empresa</option>
                {tenantsQuery.data?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <Field
              label="Motivo de la sesión"
              value={openReason}
              onChange={(e) => setOpenReason(e.target.value)}
              placeholder="Describe el motivo de acceso"
              required
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              La sesión queda registrada con tu nombre, la empresa y el motivo. Podrás entrar como soporte desde la lista de sesiones abiertas.
            </div>
          </form>
        </Modal>

      </div>

    </ProtectedLayout>

  );

}
