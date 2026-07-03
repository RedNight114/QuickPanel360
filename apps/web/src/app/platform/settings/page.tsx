'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle,
  Globe,
  Loader2,
  Lock,
  Mail,
  ReceiptText,
  Save,
  Server,
  Shield,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { ListSkeleton } from '@/components/ui/loading-state';
import { usePlatformSettings, useUpdatePlatformSettings } from '@/hooks/usePlatform';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '@/lib/api';

type ReadyResponse = {
  status: string;
  database: string;
  redis: string;
  maintenance: boolean;
  uptime?: number;
  timestamp?: string;
};

type VersionResponse = {
  service: string;
  version: string;
  commit: string;
  buildDate: string;
  environment: string;
};

type PlatformTab = 'general' | 'notifications' | 'security' | 'billing' | 'system';

const tabs: Array<{ id: PlatformTab; label: string; icon: typeof Building2 }> = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'billing', label: 'Facturacion', icon: ReceiptText },
  { id: 'system', label: 'Sistema', icon: Server },
];

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border-light p-4 transition hover:bg-bg-soft">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-text-muted">{description}</p> : null}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-primary" />
    </label>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-text-muted">{description}</p> : null}
    </div>
  );
}

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const allowed = hasRole('SUPERADMIN');
  const [activeTab, setActiveTab] = useState<PlatformTab>('general');
  const settingsQuery = usePlatformSettings({ enabled: allowed });
  const updateMutation = useUpdatePlatformSettings();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  const readyQuery = useQuery({
    queryKey: ['platform', 'ready'],
    queryFn: () => getJson<ReadyResponse>('/ready'),
    enabled: allowed && activeTab === 'system',
    refetchInterval: activeTab === 'system' ? 30_000 : false,
    retry: false,
  });

  const versionQuery = useQuery({
    queryKey: ['platform', 'version'],
    queryFn: () => getJson<VersionResponse>('/version'),
    enabled: allowed && activeTab === 'system',
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!allowed) { router.replace('/dashboard'); }
  }, [allowed, router]);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
      setDirty(false);
    }
  }, [settingsQuery.data]);

  if (!allowed) return null;

  function update(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync(form);
      toast.success('Configuracion guardada');
      setDirty(false);
    } catch {
      toast.error('No se pudo guardar la configuracion');
    }
  }

  const s = form as Record<string, string | number | boolean>;

  return (
    <ProtectedLayout>
      <div className="space-y-5">
        <PageHeader
          title="Configuracion de plataforma"
          description="Ajustes globales que afectan a todas las empresas y al funcionamiento del SaaS."
          action={
            <Button onClick={handleSave} disabled={updateMutation.isPending || !dirty}>
              {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {updateMutation.isPending ? 'Guardando...' : dirty ? 'Guardar cambios' : 'Sin cambios'}
            </Button>
          }
        />

        {settingsQuery.isLoading ? <ListSkeleton rows={6} /> : null}
        {settingsQuery.isError ? <ErrorState message="No se pudo cargar la configuracion." onRetry={() => settingsQuery.refetch()} /> : null}

        {settingsQuery.data ? (
          <div className="flex flex-col gap-5 lg:flex-row">
            <nav className="flex gap-1 lg:w-56 lg:shrink-0 lg:flex-col">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-brand-lighter text-brand-primary' : 'text-text-secondary hover:bg-bg-soft hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 flex-1 space-y-5">
              {activeTab === 'general' ? (
                <Card className="p-5">
                  <SectionTitle title="Datos de la plataforma" description="Informacion general visible para administradores y en comunicaciones." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nombre de la plataforma" value={String(s.platformName ?? '')} onChange={(e) => update('platformName', e.target.value)} />
                    <Field label="Email de contacto" type="email" value={String(s.contactEmail ?? '')} onChange={(e) => update('contactEmail', e.target.value)} />
                    <Field label="Email de soporte" type="email" value={String(s.supportEmail ?? '')} onChange={(e) => update('supportEmail', e.target.value)} />
                    <Field label="URL del logo" value={String(s.logoUrl ?? '')} onChange={(e) => update('logoUrl', e.target.value)} />
                    <label className="block">
                      <span className="text-sm font-medium text-text-primary">Idioma por defecto</span>
                      <select value={String(s.defaultLocale ?? 'es')} onChange={(e) => update('defaultLocale', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20">
                        <option value="es">Espanol</option>
                        <option value="en">English</option>
                        <option value="nl">Nederlands</option>
                      </select>
                    </label>
                    <Field label="Zona horaria" value={String(s.defaultTimezone ?? '')} onChange={(e) => update('defaultTimezone', e.target.value)} />
                  </div>
                </Card>
              ) : null}

              {activeTab === 'notifications' ? (
                <Card className="p-5">
                  <SectionTitle title="Alertas de plataforma" description="Eventos que generan notificaciones para el equipo de administracion." />
                  <div className="space-y-2">
                    <Toggle label="Nuevas solicitudes (leads)" description="Cuando un club solicita acceso desde la landing." checked={Boolean(s.notifyNewLead)} onChange={(v) => update('notifyNewLead', v)} />
                    <Toggle label="Emergencias activas" description="Cuando un club activa el modo de emergencia." checked={Boolean(s.notifyEmergency)} onChange={(v) => update('notifyEmergency', v)} />
                    <Toggle label="Facturas vencidas" description="Cuando una factura supera la fecha de vencimiento." checked={Boolean(s.notifyPaymentOverdue)} onChange={(v) => update('notifyPaymentOverdue', v)} />
                    <Toggle label="Trial por expirar" description="Cuando un club en periodo de prueba esta a punto de expirar." checked={Boolean(s.notifyTrialExpiring)} onChange={(v) => update('notifyTrialExpiring', v)} />
                    <Toggle label="Nuevas empresas creadas" description="Cuando se crea una empresa desde el panel." checked={Boolean(s.notifyNewTenant)} onChange={(v) => update('notifyNewTenant', v)} />
                    <Toggle label="Suspensiones automaticas" description="Cuando un club se suspende por impago u otra razon." checked={Boolean(s.notifySuspension)} onChange={(v) => update('notifySuspension', v)} />
                  </div>
                  <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                      <Mail size={14} />
                      Notificaciones por email
                    </div>
                    <p className="mt-1 text-xs text-blue-700">
                      {s.emailNotifications
                        ? 'Las alertas se envian al email de contacto configurado.'
                        : 'Deshabilitado. Las alertas solo aparecen en el Centro de avisos interno.'}
                    </p>
                    <div className="mt-3">
                      <Toggle label="Activar envio por email" description="Envia un email al contacto de la plataforma para cada alerta activa." checked={Boolean(s.emailNotifications)} onChange={(v) => update('emailNotifications', v)} />
                    </div>
                  </div>
                </Card>
              ) : null}

              {activeTab === 'security' ? (
                <Card className="p-5">
                  <SectionTitle title="Politicas de seguridad" description="Reglas de acceso y autenticacion que aplican a todos los usuarios de la plataforma." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Longitud minima de contrasena" type="number" min={6} max={32} value={Number(s.minPasswordLength ?? 8)} onChange={(e) => update('minPasswordLength', Number(e.target.value))} />
                    <Field label="Tiempo de sesion (minutos)" type="number" min={30} max={1440} value={Number(s.sessionTimeoutMinutes ?? 480)} onChange={(e) => update('sessionTimeoutMinutes', Number(e.target.value))} />
                    <Field label="Intentos maximos de login" type="number" min={3} max={20} value={Number(s.maxLoginAttempts ?? 5)} onChange={(e) => update('maxLoginAttempts', Number(e.target.value))} />
                  </div>
                  <div className="mt-4">
                    <Toggle label="Requerir contrasenas fuertes" description="Al menos una mayuscula, una minuscula, un numero y un caracter especial." checked={Boolean(s.requireStrongPasswords)} onChange={(v) => update('requireStrongPasswords', v)} />
                  </div>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-medium">
                      <Lock size={14} />
                      2FA / MFA
                    </div>
                    <p className="mt-1 text-xs text-amber-700">
                      La autenticacion de dos factores (TOTP) se configurara en una proxima actualizacion. Cuando este disponible, podras requerir 2FA para todos los owners o para roles especificos.
                    </p>
                  </div>
                </Card>
              ) : null}

              {activeTab === 'billing' ? (
                <Card className="p-5">
                  <SectionTitle title="Datos de facturacion" description="Informacion fiscal y comercial que aparece en las facturas emitidas a las empresas." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nombre legal / razon social" value={String(s.platformLegalName ?? '')} onChange={(e) => update('platformLegalName', e.target.value)} />
                    <Field label="CIF / NIF" value={String(s.platformTaxId ?? '')} onChange={(e) => update('platformTaxId', e.target.value)} />
                    <Field label="Direccion" value={String(s.platformAddress ?? '')} onChange={(e) => update('platformAddress', e.target.value)} />
                    <Field label="Ciudad" value={String(s.platformCity ?? '')} onChange={(e) => update('platformCity', e.target.value)} />
                    <Field label="Pais" value={String(s.platformCountry ?? '')} onChange={(e) => update('platformCountry', e.target.value)} />
                    <Field label="Prefijo de factura" value={String(s.invoicePrefix ?? '')} onChange={(e) => update('invoicePrefix', e.target.value)} />
                    <Field label="Moneda por defecto" value={String(s.defaultCurrency ?? '')} onChange={(e) => update('defaultCurrency', e.target.value)} />
                  </div>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[#15140F]">
                    <div className="flex items-center gap-2 font-medium">
                      <Globe size={14} />
                      Vista previa de factura
                    </div>
                    <p className="mt-1 text-xs text-amber-700">
                      Las facturas se emitiran como: <strong>{s.invoicePrefix || 'INV'}-2026-001</strong> desde <strong>{s.platformLegalName || 'Sin configurar'}</strong> ({s.platformTaxId || 'Sin CIF'})
                    </p>
                  </div>
                </Card>
              ) : null}

              {activeTab === 'system' ? (
                <div className="space-y-5">
                  {/* Estado del sistema */}
                  <Card className="p-5">
                    <SectionTitle title="Estado del sistema" description="Healthcheck en tiempo real de la infraestructura de QuickPanel360." />
                    {readyQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Loader2 size={14} className="animate-spin" />
                        Verificando infraestructura...
                      </div>
                    ) : readyQuery.isError ? (
                      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertTriangle size={16} />
                        No se puede conectar con la API. Verifica el estado del servidor.
                      </div>
                    ) : readyQuery.data ? (
                      <div className="space-y-3">
                        {/* Maintenance banner */}
                        {readyQuery.data.maintenance ? (
                          <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                            <Wrench size={18} className="shrink-0 text-amber-600" />
                            <div>
                              <p className="text-sm font-semibold text-amber-800">Modo mantenimiento activo</p>
                              <p className="text-xs text-amber-700">
                                Los endpoints privados están devolviendo 503. Solo /health, /ready y /version responden.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                            <CheckCircle size={18} className="shrink-0 text-green-600" />
                            <p className="text-sm font-semibold text-green-800">Sistema operativo — sin mantenimiento activo</p>
                          </div>
                        )}

                        {/* Indicadores */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { label: 'Base de datos', value: readyQuery.data.database, ok: readyQuery.data.database === 'connected' },
                            { label: 'Redis', value: readyQuery.data.redis, ok: readyQuery.data.redis === 'connected' },
                            { label: 'API', value: readyQuery.data.status, ok: readyQuery.data.status === 'ready' || readyQuery.data.status === 'ok' },
                          ].map((item) => (
                            <div key={item.label} className={`flex items-center gap-3 rounded-xl border p-3 ${item.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                              <div>
                                <p className="text-xs text-text-muted">{item.label}</p>
                                <p className={`text-sm font-medium capitalize ${item.ok ? 'text-green-700' : 'text-red-700'}`}>{item.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {readyQuery.data.uptime !== undefined && (
                          <p className="text-xs text-text-muted">
                            Uptime API: {Math.floor(readyQuery.data.uptime / 3600)}h {Math.floor((readyQuery.data.uptime % 3600) / 60)}m
                            {readyQuery.data.timestamp ? ` · Última comprobación: ${new Date(readyQuery.data.timestamp).toLocaleTimeString('es-ES')}` : null}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </Card>

                  {/* Versión */}
                  {versionQuery.data ? (
                    <Card className="p-5">
                      <SectionTitle title="Versión desplegada" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { label: 'Versión', value: versionQuery.data.version },
                          { label: 'Entorno', value: versionQuery.data.environment },
                          { label: 'Commit', value: versionQuery.data.commit !== 'unknown' ? versionQuery.data.commit.slice(0, 8) : '—' },
                          { label: 'Build', value: versionQuery.data.buildDate !== 'unknown' ? versionQuery.data.buildDate : '—' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg border border-border-light bg-bg-soft p-3">
                            <p className="text-xs text-text-muted">{item.label}</p>
                            <p className="mt-0.5 font-mono text-sm text-text-primary">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : null}

                  {/* Modo mantenimiento — cómo activarlo */}
                  <Card className="p-5">
                    <SectionTitle
                      title="Modo mantenimiento"
                      description="Para activar el mantenimiento, edita la variable de entorno en el servidor. Esto garantiza que funcione aunque la base de datos esté caída."
                    />
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border-light bg-bg-soft p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Activar mantenimiento</p>
                        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400">
{`# En apps/api/.env.production
MAINTENANCE_MODE=true
MAINTENANCE_MESSAGE=Realizando mejoras. Volvemos pronto.
MAINTENANCE_ESTIMATED_END=2025-01-15T10:00:00Z

# Reiniciar la API
docker compose -f docker-compose.prod.yml restart api`}
                        </pre>
                      </div>
                      <div className="rounded-xl border border-border-light bg-bg-soft p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Desactivar mantenimiento</p>
                        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400">
{`# En apps/api/.env.production
MAINTENANCE_MODE=false

# Reiniciar la API
docker compose -f docker-compose.prod.yml restart api`}
                        </pre>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                        <div className="flex items-center gap-2 font-medium">
                          <Lock size={14} />
                          ¿Por qué no hay un toggle aquí?
                        </div>
                        <p className="mt-1 text-xs text-blue-700">
                          El modo mantenimiento se activa via variable de entorno para que funcione incluso si la base de datos está caída o en migración.
                          Si dependiera de la DB para activarse, no podría activarse cuando más se necesita.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Backups */}
                  <Card className="p-5">
                    <SectionTitle title="Backups" description="Los backups se generan con el script incluido en el repositorio." />
                    <div className="rounded-xl border border-border-light bg-bg-soft p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ejecutar backup manualmente</p>
                      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-green-400">
{`# Desde el directorio raíz del proyecto
./scripts/backup/postgres-backup.sh

# El backup se guarda en ./backups/
# ⚠️ Cópialo a almacenamiento externo (S3/R2)`}
                      </pre>
                    </div>
                    <p className="mt-3 text-xs text-text-muted">
                      Ver documentación completa: <code className="rounded bg-bg-soft px-1 py-0.5 text-xs">docs/deployment/scale-from-one-vps-to-two.md</code>
                    </p>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}
