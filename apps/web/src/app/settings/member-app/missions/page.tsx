'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { MemberAppAdminNav } from '@/components/member-app/member-app-admin-nav';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Field } from '@/components/ui/field';
import { CardGridSkeleton } from '@/components/ui/loading-state';
import { getJson, postJson, patchJson } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

/* ────────────────────────── Types ────────────────────────── */

type MissionType =
  | 'COMPLETE_PROFILE'
  | 'DAILY_ACCESS'
  | 'QUIZ_PARTICIPATION'
  | 'CHECK_IN'
  | 'CUSTOM';

type MissionStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  type: MissionType;
  status: MissionStatus;
  pointsReward: number;
  targetValue: number;
  completedMembersCount?: number;
}

interface MissionDraft {
  title: string;
  description: string;
  type: MissionType;
  pointsReward: string;
  targetValue: string;
}

/* ────────────────────────── Labels ────────────────────────── */

const missionTypeLabels: Record<MissionType, string> = {
  COMPLETE_PROFILE: 'Completar perfil',
  DAILY_ACCESS: 'Acceso diario',
  QUIZ_PARTICIPATION: 'Participar en quiz',
  CHECK_IN: 'Check-in',
  CUSTOM: 'Personalizada',
};

const statusLabels: Record<MissionStatus, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ARCHIVED: 'Archivado',
};

const statusVariant: Record<MissionStatus, 'success' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'secondary',
};

const allMissionTypes: MissionType[] = [
  'COMPLETE_PROFILE',
  'DAILY_ACCESS',
  'QUIZ_PARTICIPATION',
  'CHECK_IN',
  'CUSTOM',
];
const allStatuses: MissionStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

const emptyDraft: MissionDraft = {
  title: '',
  description: '',
  type: 'DAILY_ACCESS',
  pointsReward: '10',
  targetValue: '1',
};

function missionToDraft(mission: Mission): MissionDraft {
  return {
    title: mission.title,
    description: mission.description ?? '',
    type: mission.type,
    pointsReward: String(mission.pointsReward),
    targetValue: String(mission.targetValue),
  };
}

/* ────────────────────────── Page ────────────────────────── */

export default function MissionsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('member_app.missions.manage');

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MissionDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function fetchMissions() {
    setLoading(true);
    setError(false);
    getJson<Mission[]>('/member-app-admin/missions')
      .then(setMissions)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManage) fetchMissions();
    else setLoading(false);
  }, [canManage]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  }

  function openEdit(mission: Mission) {
    setEditingId(mission.id);
    setDraft(missionToDraft(mission));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        type: draft.type,
        pointsReward: Number(draft.pointsReward),
        targetValue: Number(draft.targetValue),
      };

      if (editingId) {
        const updated = await patchJson<Mission>(`/member-app-admin/missions/${editingId}`, payload);
        setMissions((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
        toast.success('Mision actualizada.');
      } else {
        const created = await postJson<Mission>('/member-app-admin/missions', payload);
        setMissions((prev) => [...prev, created]);
        toast.success('Mision creada.');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar la mision.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(mission: Mission, newStatus: MissionStatus) {
    setTogglingId(mission.id);
    try {
      const updated = await patchJson<Mission>(`/member-app-admin/missions/${mission.id}`, {
        status: newStatus,
      });
      setMissions((prev) => prev.map((m) => (m.id === mission.id ? updated : m)));
      toast.success(`Mision ${statusLabels[newStatus].toLowerCase()}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setTogglingId(null);
    }
  }

  if (!canManage) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes permisos para gestionar misiones." />
      </ProtectedLayout>
    );
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <MemberAppAdminNav />
          <PageHeader title="Misiones" />
          <CardGridSkeleton count={3} />
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <MemberAppAdminNav />
          <PageHeader title="Misiones" />
          <ErrorState message="No se pudo cargar las misiones." onRetry={fetchMissions} />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <MemberAppAdminNav />
        <PageHeader
          title="Misiones"
          description="Gestiona las misiones disponibles para los socios en el portal."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nueva mision
            </Button>
          }
        />

        {missions.length === 0 ? (
          <EmptyState
            title="Sin misiones configuradas"
            text="Crea la primera mision para que los socios puedan completarla."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Nueva mision
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {missions.map((mission) => (
              <Card key={mission.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{mission.title}</h3>
                    <Badge variant={statusVariant[mission.status]}>
                      {statusLabels[mission.status]}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{missionTypeLabels[mission.type]}</Badge>
                  </div>
                  {mission.description ? (
                    <p className="mt-2 text-xs text-text-muted line-clamp-2">
                      {mission.description}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-1 text-xs text-text-muted">
                    <p>Puntos: {mission.pointsReward}</p>
                    <p>Objetivo: {mission.targetValue}</p>
                    <p>Socios completados: {mission.completedMembersCount ?? 0}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(mission)}>
                    <Pencil size={13} />
                    Editar
                  </Button>
                  {allStatuses
                    .filter((s) => s !== mission.status)
                    .map((s) => (
                      <Button
                        key={s}
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === mission.id}
                        onClick={() => handleStatusChange(mission, s)}
                      >
                        {togglingId === mission.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : null}
                        {statusLabels[s]}
                      </Button>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar mision' : 'Nueva mision'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos de la mision existente.'
                : 'Rellena los datos para crear una nueva mision.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Field
              label="Titulo"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <Field
              label="Descripcion"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary">Tipo</label>
              <select
                className="mt-1.5 h-11 w-full rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={draft.type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, type: e.target.value as MissionType }))
                }
              >
                {allMissionTypes.map((t) => (
                  <option key={t} value={t}>
                    {missionTypeLabels[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Puntos"
                type="number"
                value={draft.pointsReward}
                onChange={(e) => setDraft((d) => ({ ...d, pointsReward: e.target.value }))}
              />
              <Field
                label="Objetivo (targetValue)"
                type="number"
                value={draft.targetValue}
                onChange={(e) => setDraft((d) => ({ ...d, targetValue: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !draft.title.trim()}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear mision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
