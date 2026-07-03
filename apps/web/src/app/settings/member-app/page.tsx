'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { MemberAppAdminNav } from '@/components/member-app/member-app-admin-nav';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { SectionSkeleton } from '@/components/ui/loading-state';
import { getJson, patchJson } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

interface MemberAppSettings {
  id: string;
  tenantId: string;
  enabled: boolean;
  catalogEnabled: boolean;
  showProductValues: boolean;
  showApproxAvailability: boolean;
  pointsEnabled: boolean;
  allowProfileEdit: boolean;
  digitalCardEnabled: boolean;
  gamesEnabled: boolean;
  missionsEnabled: boolean;
  rewardsEnabled: boolean;
  allowRewardRedemption: boolean;
  requireRewardApproval: boolean;
  maxDailyGamePlays: number;
  maxDailyPointsFromGames: number;
}

const toggleFields: Array<{
  key: keyof MemberAppSettings;
  label: string;
  description: string;
}> = [
  {
    key: 'enabled',
    label: 'Activar Portal del Socio',
    description: 'Permite a los socios acceder a su portal privado.',
  },
  {
    key: 'catalogEnabled',
    label: 'Catalogo visible',
    description: 'El catalogo es informativo y no permite compras ni reservas.',
  },
  {
    key: 'showProductValues',
    label: 'Mostrar valores en CR',
    description: 'Muestra el valor orientativo de cada producto.',
  },
  {
    key: 'showApproxAvailability',
    label: 'Mostrar disponibilidad',
    description: 'Indica si el producto esta disponible para dispensacion.',
  },
  {
    key: 'pointsEnabled',
    label: 'Sistema de puntos',
    description: 'Los puntos son de participacion, no de consumo.',
  },
  {
    key: 'allowProfileEdit',
    label: 'Permitir edicion de perfil',
    description: 'El socio puede editar su telefono y email.',
  },
  {
    key: 'digitalCardEnabled',
    label: 'Carnet digital',
    description: 'El carnet digital sirve para identificar al socio dentro del club.',
  },
  {
    key: 'gamesEnabled',
    label: 'Juegos',
    description: 'Muestra juegos de participacion dentro del portal.',
  },
  {
    key: 'missionsEnabled',
    label: 'Misiones',
    description: 'Activa retos y objetivos de participacion para socios.',
  },
  {
    key: 'rewardsEnabled',
    label: 'Recompensas',
    description: 'Permite consultar recompensas disponibles en el portal.',
  },
  {
    key: 'allowRewardRedemption',
    label: 'Permitir solicitudes de canje',
    description: 'Los socios pueden enviar solicitudes de recompensa para revision.',
  },
  {
    key: 'requireRewardApproval',
    label: 'Canjes con aprobacion',
    description: 'Cada solicitud de canje pasa por revision interna antes de entregarse.',
  },
];

function ToggleCard({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start justify-between gap-4 rounded-xl border p-3.5 text-left transition ${
        checked
          ? 'border-brand-primary/30 bg-brand-lighter/20'
          : 'border-border-light bg-white hover:border-brand-primary/20'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
      </div>
      <div
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-brand-primary' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

export default function MemberAppSettingsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('member_app.view');
  const canManage = hasPermission('member_app.manage');

  const [settings, setSettings] = useState<MemberAppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    getJson<MemberAppSettings>('/member-app-admin/settings')
      .then(setSettings)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [canView]);

  function setValue<K extends keyof MemberAppSettings>(
    key: K,
    value: MemberAppSettings[K],
  ) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await patchJson<MemberAppSettings>('/member-app-admin/settings', {
        enabled: settings.enabled,
        catalogEnabled: settings.catalogEnabled,
        showProductValues: settings.showProductValues,
        showApproxAvailability: settings.showApproxAvailability,
        pointsEnabled: settings.pointsEnabled,
        allowProfileEdit: settings.allowProfileEdit,
        digitalCardEnabled: settings.digitalCardEnabled,
        gamesEnabled: settings.gamesEnabled,
        missionsEnabled: settings.missionsEnabled,
        rewardsEnabled: settings.rewardsEnabled,
        allowRewardRedemption: settings.allowRewardRedemption,
        requireRewardApproval: settings.requireRewardApproval,
        maxDailyGamePlays: settings.maxDailyGamePlays,
        maxDailyPointsFromGames: settings.maxDailyPointsFromGames,
      });
      setSettings(updated);
      toast.success('Configuracion del portal guardada.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar la configuracion del portal.'));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes permisos para gestionar el Portal del Socio." />
      </ProtectedLayout>
    );
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <SectionSkeleton rows={4} />
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !settings) {
    return (
      <ProtectedLayout>
        <ErrorState
          message="No se pudo cargar la configuracion del portal."
          onRetry={() => {
            setError(false);
            setLoading(true);
            getJson<MemberAppSettings>('/member-app-admin/settings')
              .then(setSettings)
              .catch(() => setError(true))
              .finally(() => setLoading(false));
          }}
        />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <MemberAppAdminNav />
        <PageHeader
          title="Portal del Socio"
          description="Controla el acceso y las funcionalidades visibles del portal para socios."
          action={
            <Button onClick={handleSave} disabled={saving || !canManage}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          }
        />

        <Card>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary">Funcionalidades</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Activa o desactiva las secciones del portal de socios.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {toggleFields.map((field) => (
              <ToggleCard
                key={field.key}
                label={field.label}
                description={field.description}
                checked={Boolean(settings[field.key])}
                onChange={(value) => setValue(field.key, value as never)}
                disabled={!canManage}
              />
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-primary">Limites de juegos</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Ajusta la participacion diaria maxima dentro del portal.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Jugadas maximas por dia"
              type="number"
              min={1}
              value={String(settings.maxDailyGamePlays)}
              onChange={(e) => setValue('maxDailyGamePlays', Number(e.target.value) || 0)}
              disabled={!canManage}
            />
            <Field
              label="Puntos maximos por juegos al dia"
              type="number"
              min={1}
              value={String(settings.maxDailyPointsFromGames)}
              onChange={(e) =>
                setValue('maxDailyPointsFromGames', Number(e.target.value) || 0)
              }
              disabled={!canManage}
            />
          </div>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
