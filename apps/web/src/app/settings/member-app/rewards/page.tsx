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

type RewardStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

interface Reward {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  status: RewardStatus;
  requiresApproval: boolean;
  stockLimit: number | null;
  stockUsed: number;
  terms: string | null;
}

interface RewardDraft {
  title: string;
  description: string;
  pointsCost: string;
  requiresApproval: boolean;
  stockLimit: string;
  terms: string;
}

/* ────────────────────────── Labels ────────────────────────── */

const statusLabels: Record<RewardStatus, string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ARCHIVED: 'Archivado',
};

const statusVariant: Record<RewardStatus, 'success' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  ARCHIVED: 'secondary',
};

const allStatuses: RewardStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

const emptyDraft: RewardDraft = {
  title: '',
  description: '',
  pointsCost: '100',
  requiresApproval: true,
  stockLimit: '',
  terms: '',
};

function rewardToDraft(reward: Reward): RewardDraft {
  return {
    title: reward.title,
    description: reward.description ?? '',
    pointsCost: String(reward.pointsCost),
    requiresApproval: reward.requiresApproval,
    stockLimit: reward.stockLimit != null ? String(reward.stockLimit) : '',
    terms: reward.terms ?? '',
  };
}

/* ────────────────────────── Page ────────────────────────── */

export default function RewardsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('member_app.rewards.manage');

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RewardDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function fetchRewards() {
    setLoading(true);
    setError(false);
    getJson<Reward[]>('/member-app-admin/rewards')
      .then(setRewards)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManage) fetchRewards();
    else setLoading(false);
  }, [canManage]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  }

  function openEdit(reward: Reward) {
    setEditingId(reward.id);
    setDraft(rewardToDraft(reward));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const stockLimitValue = draft.stockLimit.trim() ? Number(draft.stockLimit) : null;

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        pointsCost: Number(draft.pointsCost),
        requiresApproval: draft.requiresApproval,
        stockLimit: stockLimitValue,
        terms: draft.terms.trim() || null,
      };

      if (editingId) {
        const updated = await patchJson<Reward>(`/member-app-admin/rewards/${editingId}`, payload);
        setRewards((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        toast.success('Recompensa actualizada.');
      } else {
        const created = await postJson<Reward>('/member-app-admin/rewards', payload);
        setRewards((prev) => [...prev, created]);
        toast.success('Recompensa creada.');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar la recompensa.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(reward: Reward, newStatus: RewardStatus) {
    setTogglingId(reward.id);
    try {
      const updated = await patchJson<Reward>(`/member-app-admin/rewards/${reward.id}`, {
        status: newStatus,
      });
      setRewards((prev) => prev.map((r) => (r.id === reward.id ? updated : r)));
      toast.success(`Recompensa ${statusLabels[newStatus].toLowerCase()}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado.'));
    } finally {
      setTogglingId(null);
    }
  }

  if (!canManage) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes permisos para gestionar recompensas." />
      </ProtectedLayout>
    );
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="space-y-4">
          <MemberAppAdminNav />
          <PageHeader title="Recompensas" />
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
          <PageHeader title="Recompensas" />
          <ErrorState message="No se pudo cargar las recompensas." onRetry={fetchRewards} />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <MemberAppAdminNav />
        <PageHeader
          title="Recompensas"
          description="Gestiona las recompensas canjeables por los socios."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nueva recompensa
            </Button>
          }
        />

        {rewards.length === 0 ? (
          <EmptyState
            title="Sin recompensas configuradas"
            text="Crea la primera recompensa para que los socios puedan canjearla."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} />
                Nueva recompensa
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => (
              <Card key={reward.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{reward.title}</h3>
                    <Badge variant={statusVariant[reward.status]}>
                      {statusLabels[reward.status]}
                    </Badge>
                  </div>
                  {reward.description ? (
                    <p className="mt-2 text-xs text-text-muted line-clamp-2">
                      {reward.description}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-1 text-xs text-text-muted">
                    <p>Coste: {reward.pointsCost} puntos</p>
                    <p>
                      Stock:{' '}
                      {reward.stockLimit != null
                        ? `${reward.stockUsed} / ${reward.stockLimit}`
                        : 'Ilimitado'}
                    </p>
                    <p>Requiere aprobacion: {reward.requiresApproval ? 'Si' : 'No'}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(reward)}>
                    <Pencil size={13} />
                    Editar
                  </Button>
                  {allStatuses
                    .filter((s) => s !== reward.status)
                    .map((s) => (
                      <Button
                        key={s}
                        variant="ghost"
                        size="sm"
                        disabled={togglingId === reward.id}
                        onClick={() => handleStatusChange(reward, s)}
                      >
                        {togglingId === reward.id ? (
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
            <DialogTitle>{editingId ? 'Editar recompensa' : 'Nueva recompensa'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Modifica los datos de la recompensa existente.'
                : 'Rellena los datos para crear una nueva recompensa.'}
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
            <Field
              label="Coste en puntos"
              type="number"
              value={draft.pointsCost}
              onChange={(e) => setDraft((d) => ({ ...d, pointsCost: e.target.value }))}
            />
            <Field
              label="Limite de stock (vacio = ilimitado)"
              type="number"
              value={draft.stockLimit}
              onChange={(e) => setDraft((d) => ({ ...d, stockLimit: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-text-primary">Terminos</label>
              <textarea
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={draft.terms}
                onChange={(e) => setDraft((d) => ({ ...d, terms: e.target.value }))}
                placeholder="Condiciones de canje..."
              />
            </div>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, requiresApproval: !d.requiresApproval }))}
              className={`flex w-full items-start justify-between gap-4 rounded-xl border p-3.5 text-left transition ${
                draft.requiresApproval
                  ? 'border-brand-primary/30 bg-brand-lighter/20'
                  : 'border-border-light bg-white hover:border-brand-primary/20'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Requiere aprobacion</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Un administrador debe aprobar cada solicitud de canje.
                </p>
              </div>
              <div
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  draft.requiresApproval ? 'bg-brand-primary' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    draft.requiresApproval ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !draft.title.trim()}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Crear recompensa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
