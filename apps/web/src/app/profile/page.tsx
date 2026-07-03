'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Save,
  Settings2,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
  Bell,
  MessageCircle,
  Wifi,
  X,
} from 'lucide-react';
import { useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { ListSkeleton } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useChangePassword, useProfile, useRevokeAllOtherSessions, useRevokeSession, useSessions, useUpdateProfile } from '@/hooks/useProfile';
import { useNotificationPreferences, useUpdateNotificationPreference } from '@/hooks/useNotificationPreferences';
import { useChatDeviceKeys, useRevokeChatDeviceKey } from '@/hooks/useChat';
import { useAuth } from '@/providers/auth-provider';
import type { NotificationType, UserRole } from '@/lib/types';

type ProfileTab = 'personal' | 'security' | 'preferences' | 'notifications' | 'chat' | 'permissions';

const tabs: Array<{ id: ProfileTab; label: string; icon: typeof User }> = [
  { id: 'personal', label: 'Datos personales', icon: User },
  { id: 'security', label: 'Seguridad', icon: Lock },
  { id: 'preferences', label: 'Preferencias', icon: Settings2 },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'permissions', label: 'Mis permisos', icon: Shield },
];

const roleLabels: Record<UserRole, string> = {
  OWNER: 'Dueño',
  MANAGER: 'Manager',
  EMPLOYEE: 'Colaborador',
  SUPERADMIN: 'Superadmin',
};

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-text-muted">{description}</p> : null}
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  storageKey,
}: {
  label: string;
  description?: string;
  storageKey: string;
}) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    setValue(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  function toggle() {
    const next = !value;
    setValue(next);
    localStorage.setItem(storageKey, String(next));
    window.dispatchEvent(new StorageEvent('storage', { key: storageKey, newValue: String(next) }));
    toast.success('Preferencia guardada.');
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => e.key === ' ' && toggle()}
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3.5 transition ${
        value
          ? 'border-brand-primary/30 bg-brand-lighter/20'
          : 'border-border-light bg-white hover:border-brand-primary/20'
      }`}
    >
      <div className="min-w-0">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-text-muted">{description}</span> : null}
      </div>
      <div className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-brand-primary' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, permissions, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const notifPrefsQuery = useNotificationPreferences();
  const updateNotifPref = useUpdateNotificationPreference();
  const sessionsQuery = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAllOther = useRevokeAllOtherSessions();

  const canChat = hasPermission('chat.view');
  const chatDeviceKeysQuery = useChatDeviceKeys(activeTab === 'chat' && canChat);
  const revokeChatDeviceKey = useRevokeChatDeviceKey();

  const profile = profileQuery.data;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const NAV_OPTIONS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/pos', label: 'Punto de dispensación' },
    { href: '/cash', label: 'Caja' },
    { href: '/members', label: 'Socios' },
    { href: '/products', label: 'Inventario' },
    { href: '/receivables', label: 'Cuentas pendientes' },
    { href: '/third-party-payments', label: 'Aportaciones a terceros' },
    { href: '/users', label: 'Colaboradores' },
    { href: '/chat', label: 'Chat interno' },
    { href: '/notifications', label: 'Centro de avisos' },
    { href: '/analytics', label: 'Analítica' },
    { href: '/audit', label: 'Auditoría' },
    { href: '/security', label: 'Seguridad' },
    { href: '/settings', label: 'Configuración' },
  ] as const;

  const [startPage, setStartPage] = useState('/dashboard');
  const [quickLinks, setQuickLinks] = useState<string[]>([]);

  useEffect(() => {
    setStartPage(localStorage.getItem('pref:startPage') ?? '/dashboard');
    try {
      const stored = localStorage.getItem('pref:quickLinks');
      setQuickLinks(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      setQuickLinks([]);
    }
  }, []);

  function saveStartPage(href: string) {
    setStartPage(href);
    localStorage.setItem('pref:startPage', href);
    toast.success('Preferencia guardada.');
  }

  function toggleQuickLink(href: string) {
    setQuickLinks((prev) => {
      const next = prev.includes(href)
        ? prev.filter((h) => h !== href)
        : prev.length < 3 ? [...prev, href] : prev;
      localStorage.setItem('pref:quickLinks', JSON.stringify(next));
      if (!prev.includes(href) && prev.length >= 3) {
        toast.error('Máximo 3 accesos rápidos.');
      } else {
        toast.success('Accesos rápidos guardados.');
      }
      return next;
    });
  }

  async function submitChangePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden.');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    }
  }

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setAvatarUrl(profile.avatarUrl ?? '');
    }
  }, [profile]);

  async function submitPersonal(event: FormEvent) {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      toast.success('Perfil actualizado correctamente.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    }
  }

  const groupedPermissions = permissions.reduce<Record<string, string[]>>((acc, perm) => {
    const [module] = perm.split('.');
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Mi perfil"
          description="Gestiona tus datos personales, preferencias y seguridad."
        />

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar nav */}
          <div className="space-y-3">
            <Card className="h-fit border border-border-light bg-white p-2 shadow-sm">
              <nav className="grid gap-0.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                        active
                          ? 'bg-brand-lighter text-brand-primary'
                          : 'text-text-secondary hover:bg-bg-soft hover:text-text-primary'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </Card>

            {/* User summary card */}
            <Card className="border border-border-light bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-lighter text-brand-primary font-bold text-lg">
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-primary">{user?.name}</p>
                  <p className="truncate text-xs text-text-muted">{user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-brand-lighter px-2 py-0.5 text-xs font-medium text-brand-primary">
                    {user?.role ? roleLabels[user.role] ?? user.role : '—'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Content */}
          <div>
            {/* ── DATOS PERSONALES ─────────────────────────── */}
            {activeTab === 'personal' ? (
              <Card className="border border-border-light bg-white p-5 shadow-sm">
                <SectionTitle
                  title="Datos personales"
                  description="Tu nombre, teléfono y avatar visibles para el equipo."
                />

                {profileQuery.isLoading ? <ListSkeleton rows={3} /> : null}
                {!profileQuery.isLoading && profileQuery.isError ? (
                  <ErrorState
                    message="No se pudo cargar tu perfil."
                    onRetry={() => profileQuery.refetch()}
                  />
                ) : null}

                {!profileQuery.isLoading && profile ? (
                  <form onSubmit={submitPersonal} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre visible"
                      />
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                        <p className="h-11 flex items-center rounded-lg border border-border-light bg-bg-soft px-3 text-sm text-text-muted">
                          {profile.email}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">El email no se puede cambiar desde aquí.</p>
                      </div>
                      <Field
                        label="Teléfono (opcional)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej: +34 600 000 000"
                      />
                      <Field
                        label="URL del avatar (opcional)"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="rounded-xl border border-border-light bg-bg-soft p-3 text-sm">
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2 text-text-muted">
                          <BadgeCheck size={14} />
                          <span>Rol: <strong className="text-text-primary">{user?.role ? roleLabels[user.role] ?? user.role : '—'}</strong></span>
                        </div>
                        {profile.lastLoginAt ? (
                          <div className="flex items-center gap-2 text-text-muted">
                            <KeyRound size={14} />
                            <span>Último acceso: <strong className="text-text-primary">{new Date(profile.lastLoginAt).toLocaleString('es-ES')}</strong></span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </Card>
            ) : null}

            {/* ── SEGURIDAD ────────────────────────────────── */}
            {activeTab === 'security' ? (
              <div className="space-y-4">
                {/* Cambiar contraseña */}
                <Card className="border border-border-light bg-white p-5 shadow-sm">
                  <SectionTitle
                    title="Cambiar contraseña"
                    description="Introduce tu contraseña actual y la nueva. Mínimo 8 caracteres."
                  />
                  <form onSubmit={submitChangePassword} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Contraseña actual"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Tu contraseña actual"
                        required
                      />
                      <div />
                      <Field
                        label="Nueva contraseña"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        required
                      />
                      <Field
                        label="Confirmar nueva contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                      >
                        {changePassword.isPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                        {changePassword.isPending ? 'Guardando...' : 'Cambiar contraseña'}
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* 2FA */}
                <TotpSection />

                {/* Push notifications */}
                <PushSection />

                {/* Cerrar sesión */}
                <Card className="border border-border-light bg-white p-5 shadow-sm">
                  <SectionTitle title="Sesión" description="Gestiona tu sesión activa." />
                  <div className="rounded-xl border border-border-light bg-white p-4">
                    <p className="text-sm font-semibold text-text-primary">Cerrar sesión</p>
                    <p className="mt-1 text-xs text-text-muted">Cierra tu sesión actual en este dispositivo.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={logout}>
                      <LogOut size={14} />
                      Cerrar sesión
                    </Button>
                  </div>
                </Card>

                {/* Sesiones activas */}
                <Card className="border border-border-light bg-white p-5 shadow-sm">
                  <SectionTitle
                    title="Sesiones activas"
                    description="Dispositivos donde tu cuenta está actualmente conectada."
                  />
                  {sessionsQuery.isLoading ? <ListSkeleton rows={2} /> : null}
                  {!sessionsQuery.isLoading && sessionsQuery.isError ? (
                    <ErrorState message="No se pudieron cargar las sesiones." onRetry={() => sessionsQuery.refetch()} />
                  ) : null}
                  {sessionsQuery.data && sessionsQuery.data.length === 0 ? (
                    <p className="text-sm text-text-muted">No hay sesiones activas registradas.</p>
                  ) : null}
                  {sessionsQuery.data && sessionsQuery.data.length > 0 ? (
                    <div className="space-y-2">
                      {sessionsQuery.data.map((session, idx) => (
                        <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-white p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Monitor size={16} className="shrink-0 text-text-muted" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {session.deviceName || 'Dispositivo desconocido'}
                                {idx === 0 ? (
                                  <span className="ml-2 rounded-full bg-brand-lighter px-2 py-0.5 text-[10px] font-medium text-brand-primary">
                                    Actual
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-xs text-text-muted">
                                {session.ipAddress ? `${session.ipAddress} · ` : ''}
                                Último acceso {new Date(session.lastSeenAt).toLocaleString('es-ES')}
                              </p>
                            </div>
                          </div>
                          {idx !== 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-text-muted hover:text-red-500"
                              disabled={revokeSession.isPending}
                              onClick={() => {
                                revokeSession.mutate(session.id, {
                                  onSuccess: () => toast.success('Sesión cerrada.'),
                                  onError: () => toast.error('No se pudo cerrar la sesión.'),
                                });
                              }}
                              title="Cerrar esta sesión"
                            >
                              <Trash2 size={15} />
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {sessionsQuery.data && sessionsQuery.data.length > 1 ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revokeAllOther.isPending}
                        onClick={() => {
                          revokeAllOther.mutate(undefined, {
                            onSuccess: () => toast.success('Resto de sesiones cerradas.'),
                            onError: () => toast.error('No se pudo cerrar las sesiones.'),
                          });
                        }}
                      >
                        {revokeAllOther.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                        Cerrar otras sesiones
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </div>
            ) : null}

            {/* ── PREFERENCIAS ─────────────────────────────── */}
            {activeTab === 'preferences' ? (
              <Card className="border border-border-light bg-white p-5 shadow-sm">
                <SectionTitle
                  title="Preferencias personales"
                  description="Se guardan en este dispositivo. No afectan a otros colaboradores."
                />
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Apariencia</p>
                    <div className="grid gap-2">
                      <PreferenceRow
                        label="Vista compacta"
                        description="Reduce el espacio entre elementos para ver más información en pantalla."
                        storageKey="pref:compact"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Interacción</p>
                    <div className="grid gap-2">
                      <PreferenceRow
                        label="Sonidos de la aplicación"
                        description="Reproduce efectos de sonido al registrar aportaciones, recibir mensajes de chat o avisos del sistema."
                        storageKey="pref:sounds"
                      />
                      <PreferenceRow
                        label="Ayuda contextual"
                        description="Muestra tooltips de ayuda junto a campos y secciones para explicar su función."
                        storageKey="pref:help"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-5">
                  {/* Tab inicial */}
                  <div>
                    <SectionTitle
                      title="Página de inicio"
                      description="Primera página que se carga al abrir la aplicación."
                    />
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {NAV_OPTIONS.map((opt) => (
                        <label
                          key={opt.href}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                            startPage === opt.href
                              ? 'border-brand-primary bg-brand-lighter/40 font-semibold text-brand-primary'
                              : 'border-border-light bg-white text-text-primary hover:border-brand-primary/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="startPage"
                            value={opt.href}
                            checked={startPage === opt.href}
                            onChange={() => saveStartPage(opt.href)}
                            className="accent-brand-primary"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Accesos rápidos */}
                  <div>
                    <SectionTitle
                      title="Accesos rápidos"
                      description="Hasta 3 páginas destacadas en la barra lateral. Se marcan con una estrella."
                    />
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {NAV_OPTIONS.map((opt) => {
                        const active = quickLinks.includes(opt.href);
                        return (
                          <label
                            key={opt.href}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                              active
                                ? 'border-brand-primary bg-brand-lighter/40 font-semibold text-brand-primary'
                                : 'border-border-light bg-white text-text-primary hover:border-brand-primary/30'
                            } ${!active && quickLinks.length >= 3 ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleQuickLink(opt.href)}
                              className="accent-brand-primary"
                              disabled={!active && quickLinks.length >= 3}
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-text-muted">{quickLinks.length}/3 seleccionados</p>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* ── NOTIFICACIONES ───────────────────────────── */}
            {activeTab === 'notifications' ? (
              <Card className="border border-border-light bg-white p-5 shadow-sm">
                <SectionTitle
                  title="Preferencias de notificaciones"
                  description="Elige qué avisos quieres recibir en el Centro de avisos. Solo afecta a tu cuenta."
                />
                {notifPrefsQuery.isLoading ? <ListSkeleton rows={4} /> : null}
                {!notifPrefsQuery.isLoading && notifPrefsQuery.isError ? (
                  <ErrorState message="No se pudieron cargar tus preferencias." onRetry={() => notifPrefsQuery.refetch()} />
                ) : null}
                {notifPrefsQuery.data ? (() => {
                  const prefsMap = new Map(notifPrefsQuery.data.map((p) => [p.notificationType, p.enabled]));

                  function NotifToggle({ type, label, description }: { type: NotificationType; label: string; description?: string }) {
                    const enabled = prefsMap.get(type) ?? true;
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => updateNotifPref.mutate({ notificationType: type, enabled: !enabled })}
                        onKeyDown={(e) => e.key === ' ' && updateNotifPref.mutate({ notificationType: type, enabled: !enabled })}
                        className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3.5 transition ${
                          enabled
                            ? 'border-brand-primary/30 bg-brand-lighter/20'
                            : 'border-border-light bg-white hover:border-brand-primary/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-text-primary">{label}</span>
                          {description ? <span className="mt-0.5 block text-xs text-text-muted">{description}</span> : null}
                        </div>
                        <div className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-brand-primary' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Inventario</p>
                        <div className="space-y-2">
                          <NotifToggle type="INVENTORY_LOW" label="Stock bajo" description="Avisa cuando un producto cae por debajo del umbral mínimo." />
                          <NotifToggle type="INVENTORY_OUT" label="Sin stock" description="Avisa cuando un producto llega a 0 g disponibles." />
                          <NotifToggle type="SCALE_TOLERANCE_EXCEEDED" label="Tolerancia de báscula superada" description="Diferencia entre peso real y registrado fuera de tolerancia." />
                          <NotifToggle type="POSITIVE_WASTE_HIGH" label="Merma positiva alta" description="Merma positiva acumulada por encima del límite configurado." />
                          <NotifToggle type="NEGATIVE_DIFFERENCE" label="Diferencia negativa en inventario" description="El inventario registrado es menor que el real." />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Caja</p>
                        <div className="space-y-2">
                          <NotifToggle type="CASH_DIFFERENCE" label="Diferencia de caja" description="Al cerrar caja se detecta una diferencia respecto al esperado." />
                          <NotifToggle type="CASH_OPEN_TOO_LONG" label="Sesión de caja abierta demasiado tiempo" description="La caja lleva más horas abiertas que el tiempo configurado." />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Socios</p>
                        <div className="space-y-2">
                          <NotifToggle type="MEMBER_BIRTHDAY" label="Cumpleaños de socio" description="Un socio cumple años hoy." />
                          <NotifToggle type="MEMBER_PENDING_CONTRIBUTION" label="Aportación pendiente" description="Un socio tiene una aportación pendiente de cobro." />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Sistema y seguridad</p>
                        <div className="space-y-2">
                          <NotifToggle type="SECURITY_ALERT" label="Alerta de seguridad" description="Eventos de acceso sospechoso o bloqueo." />
                          <NotifToggle type="EMERGENCY_ACTIVE" label="Emergencia activa" description="Se ha activado el modo de emergencia en el club." />
                          <NotifToggle type="SYSTEM" label="Avisos del sistema" description="Mensajes de la plataforma o mantenimiento." />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Plataforma y suscripción</p>
                        <div className="space-y-2">
                          <NotifToggle type="TRIAL_EXPIRING" label="Periodo de prueba" description="Tu periodo de prueba está a punto de finalizar." />
                          <NotifToggle type="INVOICE_OVERDUE" label="Factura pendiente" description="Tienes una factura vencida sin regularizar." />
                          <NotifToggle type="SUSPENSION_WARNING" label="Riesgo de suspensión" description="El servicio puede suspenderse por impago prolongado." />
                          <NotifToggle type="PLAN_LIMIT_WARNING" label="Límites de plan" description="Estás cerca o has alcanzado los límites de tu plan." />
                        </div>
                      </div>
                    </div>
                  );
                })() : null}
                <p className="mt-4 text-xs text-text-muted">
                  Solo afecta al Centro de avisos interno. No se envían notificaciones externas.
                </p>
              </Card>
            ) : null}

            {/* ── CHAT ─────────────────────────────────────── */}
            {activeTab === 'chat' ? (
              <div className="space-y-4">
                {/* Cifrado */}
                <Card className="border border-border-light bg-white p-5 shadow-sm">
                  <SectionTitle title="Cifrado del chat" description="Estado del cifrado extremo a extremo del chat interno." />
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-[#15140F]">Cifrado activo — AES-256-GCM</p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          Los mensajes se cifran en el servidor con AES-256-GCM antes de almacenarse.
                          Cada mensaje usa un vector de inicialización único y tag de autenticación.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-border-light bg-white p-4 shadow-card">
                      <Wifi size={18} className="mt-0.5 shrink-0 text-text-muted" />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Conexión en tiempo real</p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          El chat usa WebSocket con actualización automática cada 5 s como respaldo.
                          La conexión es segura (TLS) en producción.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Dispositivos registrados */}
                {canChat ? (
                  <Card className="border border-border-light bg-white p-5 shadow-sm">
                    <SectionTitle
                      title="Dispositivos de cifrado"
                      description="Dispositivos que han registrado una clave pública para el chat cifrado. Puedes revocar los que ya no uses."
                    />
                    {chatDeviceKeysQuery.isLoading ? <ListSkeleton rows={2} /> : null}
                    {!chatDeviceKeysQuery.isLoading && chatDeviceKeysQuery.isError ? (
                      <ErrorState message="No se pudieron cargar los dispositivos." onRetry={() => chatDeviceKeysQuery.refetch()} />
                    ) : null}
                    {chatDeviceKeysQuery.data && chatDeviceKeysQuery.data.length === 0 ? (
                      <p className="text-sm text-text-muted">No hay dispositivos registrados para cifrado.</p>
                    ) : null}
                    {chatDeviceKeysQuery.data && chatDeviceKeysQuery.data.length > 0 ? (
                      <div className="space-y-2">
                        {chatDeviceKeysQuery.data.map((key) => (
                          <div key={key.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-white p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Laptop size={16} className="shrink-0 text-text-muted" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary">
                                  {key.deviceName || key.deviceId}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {key.algorithm}
                                  {key.lastSeenAt ? ` · Último uso ${new Date(key.lastSeenAt).toLocaleDateString('es-ES')}` : ''}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-text-muted hover:text-red-500"
                              disabled={revokeChatDeviceKey.isPending}
                              onClick={() => {
                                if (confirm('¿Revocar este dispositivo?')) {
                                  revokeChatDeviceKey.mutate(key.id, {
                                    onSuccess: () => toast.success('Dispositivo revocado.'),
                                    onError: () => toast.error('No se pudo revocar el dispositivo.'),
                                  });
                                }
                              }}
                              title="Revocar dispositivo"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                ) : null}

                {/* Preferencias de notificación del chat */}
                <Card className="border border-border-light bg-white p-5 shadow-sm">
                  <SectionTitle
                    title="Notificaciones de chat"
                    description="Preferencias locales para el chat. Se guardan en este dispositivo."
                  />
                  <div className="space-y-2">
                    <PreferenceRow
                      label="Sonido al recibir mensaje"
                      description="Reproduce un sonido cuando recibes un nuevo mensaje de chat."
                      storageKey="pref:chat-sound"
                    />
                    <PreferenceRow
                      label="Mostrar vista previa del mensaje"
                      description="Muestra el contenido del mensaje en la notificación del Centro de avisos."
                      storageKey="pref:chat-preview"
                    />
                  </div>
                </Card>
              </div>
            ) : null}

            {/* ── PERMISOS ─────────────────────────────────── */}
            {activeTab === 'permissions' ? (
              <Card className="border border-border-light bg-white p-5 shadow-sm">
                <SectionTitle
                  title="Mis permisos"
                  description="Acciones que puedes realizar según tu rol. Solo lectura."
                />
                <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                  Estos permisos los gestiona el dueño o la administración de la plataforma. No puedes modificarlos.
                </div>
                {permissions.length === 0 ? (
                  <p className="text-sm text-text-muted">No tienes permisos asignados.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).sort(([a], [b]) => a.localeCompare(b)).map(([module, perms]) => (
                      <div key={module}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{module}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {perms.map((perm) => (
                            <span
                              key={perm}
                              className="rounded-lg border border-border-light bg-bg-soft px-2 py-1 text-xs font-medium text-text-primary"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

// ── TOTP / 2FA Section ────────────────────────────────────────────────────────

function TotpSection() {
  const { accessToken } = useAuth();
  const [step, setStep] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check current 2FA status from profile
  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ totpEnabled: boolean }>('/auth/totp/status', { token: accessToken })
      .then((r) => setEnabled(r.totpEnabled))
      .catch(() => setEnabled(false));
  }, [accessToken]);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ secret: string; qrDataUrl: string }>('/auth/totp/setup', {
        method: 'POST',
        token: accessToken,
      });
      setSecret(res.secret);
      setQrUrl(res.qrDataUrl);
      setStep('setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al configurar 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/totp/verify', {
        method: 'POST',
        body: { code },
        token: accessToken,
      });
      setEnabled(true);
      setStep('idle');
      setDigits(['', '', '', '', '', '']);
      toast.success('Verificación en dos pasos activada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    const code = digits.join('');
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/totp/disable', {
        method: 'POST',
        body: { code },
        token: accessToken,
      });
      setEnabled(false);
      setStep('idle');
      setDigits(['', '', '', '', '', '']);
      toast.success('Verificación en dos pasos desactivada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const onDigit = (i: number, value: string) => {
    const d = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  return (
    <Card className="border border-border-light bg-white p-5 shadow-sm">
      <SectionTitle
        title="Verificación en dos pasos (2FA)"
        description="Protege tu cuenta con un código temporal de tu app de autenticación."
      />

      {enabled === null && <p className="text-sm text-text-muted">Cargando...</p>}

      {enabled === false && step === 'idle' && (
        <div className="flex items-center justify-between rounded-xl border border-border-light bg-[#FAF8F2] p-4">
          <div className="flex items-center gap-3">
            <Smartphone size={18} className="text-text-muted" />
            <div>
              <p className="text-sm font-semibold text-text-primary">2FA desactivado</p>
              <p className="text-xs text-text-muted">Sin capa adicional de seguridad</p>
            </div>
          </div>
          <Button size="sm" onClick={handleSetup} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Activar
          </Button>
        </div>
      )}

      {enabled === true && step === 'idle' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-800">2FA activo</p>
                <p className="text-xs text-green-600">Cuenta protegida con autenticador</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setStep('disable'); setDigits(['','','','','','']); }}>
              <X size={14} />
              Desactivar
            </Button>
          </div>
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Escanea el código QR con Google Authenticator, Authy o cualquier app TOTP.
          </p>
          <div className="flex justify-center">
            <img src={qrUrl} alt="QR 2FA" className="h-48 w-48 rounded-xl border border-border-light" />
          </div>
          <div className="rounded-xl border border-border-light bg-[#FAF8F2] px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Clave manual</p>
            <p className="font-mono text-sm font-bold tracking-widest text-text-primary">{secret}</p>
          </div>
          <p className="text-sm font-medium text-text-primary">Introduce el código de 6 dígitos para confirmar:</p>
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={(e) => onDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-border-light bg-white text-center text-lg font-bold text-text-primary outline-none focus:border-[#15140F] focus:ring-2 focus:ring-[#FFE600]/30"
              />
            ))}
          </div>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep('idle'); setError(null); }}>Cancelar</Button>
            <Button size="sm" onClick={handleVerify} disabled={loading || digits.some((d) => !d)} className="flex-1">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Verificar y activar
            </Button>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Introduce el código de tu app para desactivar el 2FA:</p>
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={(e) => onDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-border-light bg-white text-center text-lg font-bold text-text-primary outline-none focus:border-[#15140F] focus:ring-2 focus:ring-[#FFE600]/30"
              />
            ))}
          </div>
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStep('idle'); setError(null); }}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDisable} disabled={loading || digits.some((d) => !d)} className="flex-1">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              Desactivar 2FA
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Push Notifications Section ─────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

function PushSection() {
  const [status, setStatus] = useState<'unknown' | 'subscribed' | 'denied' | 'unsupported' | 'unsubscribed'>('unknown');
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuth();

  const checkStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? 'subscribed' : 'unsubscribed');
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  async function subscribe() {
    setLoading(true);
    try {
      const keyRes = await fetch(`${API}/push/vapid-public-key`);
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setStatus('denied'); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch(`${API}/push/admin/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ subscription: sub }),
      });
      setStatus('subscribed');
      toast.success('Notificaciones activadas en este dispositivo.');
    } catch {
      toast.error('No se pudo activar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API}/push/admin/unsubscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('unsubscribed');
      toast.success('Notificaciones desactivadas en este dispositivo.');
    } catch {
      toast.error('No se pudo desactivar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'unsupported') return null;

  return (
    <Card className="border border-border-light bg-white p-5 shadow-sm">
      <SectionTitle title="Notificaciones push" description="Recibe avisos directamente en este dispositivo." />
      <div className="rounded-xl border border-border-light bg-white p-4">
        {status === 'denied' ? (
          <div className="flex items-start gap-3">
            <Wifi size={18} className="mt-0.5 shrink-0 text-text-muted" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Permisos bloqueados</p>
              <p className="mt-1 text-xs text-text-muted">
                El navegador ha bloqueado las notificaciones. Actívalas desde la configuración del sitio.
              </p>
            </div>
          </div>
        ) : status === 'subscribed' ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bell size={18} className="mt-0.5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Notificaciones activas</p>
                <p className="mt-1 text-xs text-text-muted">Este dispositivo recibirá avisos del panel.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void unsubscribe()} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              Desactivar
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Bell size={18} className="mt-0.5 shrink-0 text-text-muted" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Notificaciones desactivadas</p>
                <p className="mt-1 text-xs text-text-muted">Actívalas para recibir avisos en este dispositivo.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => void subscribe()} disabled={loading || status === 'unknown'}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              Activar
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
