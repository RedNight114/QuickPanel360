'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle, Truck } from 'lucide-react';
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
import { getJson, patchJson } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

/* ────────────────────────── Types ────────────────────────── */

type RedemptionStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DELIVERED' | 'CANCELLED';

interface Redemption {
  id: string;
  member: {
    id: string;
    name: string;
    memberNumber: string | null;
  };
  rewardTitle: string;
  pointsSpent: number;
  status: RedemptionStatus;
  createdAt: string;
  notes: string | null;
  reviewedAt: string | null;
  deliveredAt: string | null;
}

interface RedemptionsResponse {
  items: Redemption[];
  total: number;
}

/* ────────────────────────── Labels ────────────────────────── */

const statusLabels: Record<RedemptionStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

const statusVariant: Record<RedemptionStatus, 'success' | 'warning' | 'secondary' | 'danger' | 'primary'> = {
  REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  DELIVERED: 'primary',
  CANCELLED: 'secondary',
};

const allFilterStatuses: RedemptionStatus[] = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'DELIVERED',
  'CANCELLED',
];

/* ────────────────────────── Page ────────────────────────── */

export default function RedemptionsAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('member_app.redemptions.review');

  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RedemptionStatus | ''>('REQUESTED');
  const [search, setSearch] = useState('');

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  function fetchRedemptions(status?: RedemptionStatus | '', searchValue?: string) {
    setLoading(true);
    setError(false);
    const statusParam = status ?? filterStatus;
    const params = new URLSearchParams();
    if (statusParam) params.set('status', statusParam);
    const effectiveSearch = searchValue ?? search;
    if (effectiveSearch.trim()) params.set('search', effectiveSearch.trim());
    const query = params.toString() ? `?${params.toString()}` : '';
    getJson<RedemptionsResponse>(`/member-app-admin/redemptions${query}`)
      .then((response) => setRedemptions(response.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManage) fetchRedemptions();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, filterStatus]);

  function handleFilterChange(status: RedemptionStatus | '') {
    setFilterStatus(status);
  }

  async function handleApprove(redemption: Redemption) {
    setActionLoading(redemption.id);
    try {
      await patchJson<Redemption>(
        `/member-app-admin/redemptions/${redemption.id}/approve`,
      );
      fetchRedemptions(filterStatus, search);
      toast.success('Solicitud aprobada.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo aprobar la solicitud.'));
    } finally {
      setActionLoading(null);
    }
  }

  function openRejectDialog(redemption: Redemption) {
    setRejectingId(redemption.id);
    setRejectNotes('');
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!rejectingId) return;
    setActionLoading(rejectingId);
    try {
      await patchJson<Redemption>(
        `/member-app-admin/redemptions/${rejectingId}/reject`,
        { notes: rejectNotes.trim() || null },
      );
      fetchRedemptions(filterStatus, search);
      toast.success('Solicitud rechazada.');
      setRejectDialogOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo rechazar la solicitud.'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeliver(redemption: Redemption) {
    setActionLoading(redemption.id);
    try {
      await patchJson<Redemption>(
        `/member-app-admin/redemptions/${redemption.id}/deliver`,
      );
      fetchRedemptions(filterStatus, search);
      toast.success('Solicitud marcada como entregada.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo marcar como entregada.'));
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(dateStr: string) {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  if (!canManage) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes permisos para gestionar solicitudes de canje." />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <MemberAppAdminNav />
        <PageHeader
          title="Solicitudes de canje"
          description="Revisa y gestiona las solicitudes de canje de recompensas."
        />

        <Field
          label="Buscar por socio o recompensa"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre, numero de socio o recompensa"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchRedemptions(filterStatus, search);
            }
          }}
        />

        {/* ── Status filter ── */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterStatus === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('')}
          >
            Todas
          </Button>
          {allFilterStatuses.map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(s)}
            >
              {statusLabels[s]}
            </Button>
          ))}
        </div>

        {loading ? (
          <CardGridSkeleton count={4} />
        ) : error ? (
          <ErrorState
            message="No se pudo cargar las solicitudes."
            onRetry={() => fetchRedemptions()}
          />
        ) : redemptions.length === 0 ? (
          <EmptyState
            title="Sin solicitudes"
            text="No hay solicitudes de canje con el filtro seleccionado."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {redemptions.map((redemption) => (
              <Card key={redemption.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {redemption.rewardTitle}
                    </h3>
                    <Badge variant={statusVariant[redemption.status]}>
                      {statusLabels[redemption.status]}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-text-muted">
                    <p>Socio: {redemption.member.name}</p>
                    {redemption.member.memberNumber ? (
                      <p>Numero de socio: {redemption.member.memberNumber}</p>
                    ) : null}
                    <p>Puntos: {redemption.pointsSpent}</p>
                    <p>Fecha: {formatDate(redemption.createdAt)}</p>
                    {redemption.reviewedAt ? (
                      <p>Revisada: {formatDate(redemption.reviewedAt)}</p>
                    ) : null}
                    {redemption.deliveredAt ? (
                      <p>Entregada: {formatDate(redemption.deliveredAt)}</p>
                    ) : null}
                    {redemption.notes ? <p>Notas: {redemption.notes}</p> : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {redemption.status === 'REQUESTED' ? (
                    <>
                      <Button
                        size="sm"
                        disabled={actionLoading === redemption.id}
                        onClick={() => handleApprove(redemption)}
                      >
                        {actionLoading === redemption.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle size={13} />
                        )}
                        Aprobar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={actionLoading === redemption.id}
                        onClick={() => openRejectDialog(redemption)}
                      >
                        <XCircle size={13} />
                        Rechazar
                      </Button>
                    </>
                  ) : null}
                  {redemption.status === 'APPROVED' ? (
                    <Button
                      size="sm"
                      disabled={actionLoading === redemption.id}
                      onClick={() => handleDeliver(redemption)}
                    >
                      {actionLoading === redemption.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Truck size={13} />
                      )}
                      Entregar
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
            <DialogDescription>
              Opcionalmente puedes agregar una nota explicativa.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Notas (opcional)
            </label>
            <textarea
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Motivo del rechazo..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={actionLoading === rejectingId}
            >
              {actionLoading === rejectingId ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {actionLoading === rejectingId ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedLayout>
  );
}
