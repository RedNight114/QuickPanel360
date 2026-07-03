'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  HandCoins,
  Plus,
  Search,
  UserRound,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';

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
import { CardGridSkeleton } from '@/components/ui/loading-state';
import { getErrorMessage } from '@/lib/errors';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useApproveReceivable,
  useCancelReceivable,
  useCreateReceivable,
  usePayReceivable,
  useReceivables,
  useReceivablesSummary,
} from '@/hooks/useReceivables';
import { useMemberSearch } from '@/hooks/useMembers';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Receivable, ReceivableStatus } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type StatusFilter = ReceivableStatus | 'all';
type SortMode = 'recent' | 'outstandingDesc' | 'outstandingAsc' | 'member';

const statusLabels: Record<ReceivableStatus, string> = {
  OPEN: 'Pendiente de aportación',
  PARTIALLY_PAID: 'Parcialmente regularizada',
  PAID: 'Regularizada',
  OVERDUE: 'Pendiente de aportación',
  CANCELLED: 'Cancelada',
};

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportReceivablesCsv(receivables: Receivable[]) {
  const headers = [
    'Socio',
    'Nº Socio',
    'Importe original',
    'Pagado',
    'Pendiente',
    'Estado',
    'Motivo',
    'Fecha creación',
    'Fecha vencimiento',
  ];

  const statusLabels: Record<string, string> = {
    OPEN: 'Pendiente de aportación',
    PARTIALLY_PAID: 'Parcialmente regularizada',
    PAID: 'Regularizada',
    OVERDUE: 'Pendiente vencida',
    CANCELLED: 'Cancelada',
  };

  const rows = receivables.map((receivable) => [
    `${receivable.member?.firstName ?? ''} ${receivable.member?.lastName ?? ''}`.trim() || 'Socio',
    receivable.member?.memberNumber ?? '',
    Number(receivable.originalAmount ?? 0).toFixed(2),
    Number(receivable.paidAmount ?? 0).toFixed(2),
    Number(receivable.outstandingAmount ?? 0).toFixed(2),
    statusLabels[receivable.status] ?? receivable.status,
    receivable.reason ?? '',
    receivable.createdAt ? new Date(receivable.createdAt).toLocaleDateString('es-ES') : '',
    receivable.dueDate ? new Date(receivable.dueDate).toLocaleDateString('es-ES') : '',
  ]);

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')),
  ].join('\n');

  const blob = new Blob([`﻿${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cuentas_pendientes_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function memberName(receivable: Receivable) {
  const member = receivable.member;
  return `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim() || 'Socio';
}

function statusTone(status: ReceivableStatus) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'CANCELLED') return 'secondary' as const;
  if (status === 'OVERDUE') return 'danger' as const;
  if (status === 'PARTIALLY_PAID') return 'warning' as const;
  return 'primary' as const;
}

function ReceivableKpis({
  summary,
}: {
  summary: {
    totalOutstanding: number | string;
    openCount: number;
    partiallyPaidCount: number;
    overdueCount: number;
    collectedToday: number | string;
  };
}) {
  const items = [
    {
      label: 'Total pendiente',
      value: formatCurrency(summary.totalOutstanding),
      icon: Wallet,
      tone: 'text-amber-700',
    },
    {
      label: 'Pendientes de aportacin',
      value: summary.openCount ?? 0,
      icon: HandCoins,
      tone: 'text-[#15140F]',
    },
    {
      label: 'Parcialmente regularizadas',
      value: summary.partiallyPaidCount ?? 0,
      icon: CalendarClock,
      tone: 'text-blue-700',
    },
    {
      label: 'Regularizado hoy',
      value: formatCurrency(summary.collectedToday),
      icon: CheckCircle2,
      tone: 'text-[#15140F]',
    },
    {
      label: 'Pendientes vencidas',
      value: summary.overdueCount ?? 0,
      icon: AlertTriangle,
      tone: 'text-red-700',
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} size="sm" className="border border-border-light bg-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-text-primary">{item.value}</p>
              </div>
              <Icon className={item.tone} size={20} />
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function PayReceivableModal({
  receivable,
  open,
  saving,
  onClose,
  onSubmit,
}: {
  receivable: Receivable | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (amount: number, notes?: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const outstanding = toNumber(receivable?.outstandingAmount);
  const amountValue = toNumber(amount);
  const remaining = Math.max(outstanding - amountValue, 0);

  function resetAndClose() {
    setAmount('');
    setNotes('');
    setError(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!amount || amountValue <= 0) {
      setError('Introduce un importe mayor que cero.');
      return;
    }

    if (amountValue > outstanding) {
      setError('El importe no puede superar el pendiente actual.');
      return;
    }

    await onSubmit(amountValue, notes.trim() || undefined);
    setAmount('');
    setNotes('');
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? resetAndClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar aportación pendiente</DialogTitle>
          <DialogDescription>
            Este registro entra en la caja abierta del usuario actual.
          </DialogDescription>
        </DialogHeader>

        {receivable ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-text-primary">{memberName(receivable)}</p>
              <p className="text-text-muted">
                Pendiente actual: <span className="font-semibold">{formatCurrency(outstanding)}</span>
              </p>
            </div>

            <label className="block text-sm font-medium text-text-primary">
              Créditos recibidos en efectivo
              <Input
                className="mt-1.5"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-text-primary">
              Notas opcionales
              <Textarea
                className="mt-1.5"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej. Aportación parcial realizada en mostrador"
              />
            </label>

            <div className="rounded-xl border border-border-light bg-bg-soft p-3 text-sm">
              Pendiente restante: <span className="font-semibold">{formatCurrency(remaining)}</span>
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Registrando...' : 'Registrar aportacin'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CancelReceivableModal({
  receivable,
  open,
  saving,
  onClose,
  onSubmit,
}: {
  receivable: Receivable | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setReason('');
    setError(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Indica un motivo para cancelar el pendiente.');
      return;
    }

    await onSubmit(reason.trim());
    setReason('');
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? resetAndClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar Pendiente de aportación</DialogTitle>
          <DialogDescription>
            Esta accin no modifica la caja. El pendiente quedar cancelado y auditado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {receivable ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
              <p className="font-semibold text-text-primary">{memberName(receivable)}</p>
              <p className="text-text-muted">Pendiente restante: {formatCurrency(receivable.outstandingAmount)}</p>
            </div>
          ) : null}

          <label className="block text-sm font-medium text-text-primary">
            Motivo de cancelacin
            <Textarea
              className="mt-1.5"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. Error administrativo"
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Volver
            </Button>
            <Button type="submit" variant="danger" disabled={saving}>
              {saving ? 'Cancelando...' : 'Cancelar pendiente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateReceivableModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: {
    memberId: string;
    amount: number;
    reason?: string;
    dueDate?: string;
  }) => Promise<void>;
}) {
  const [memberQuery, setMemberQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMemberLabel, setSelectedMemberLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const memberSearch = useMemberSearch(memberQuery);
  const members = memberSearch.data ?? [];

  function resetAndClose() {
    setMemberQuery('');
    setSelectedMemberId('');
    setSelectedMemberLabel('');
    setAmount('');
    setReason('');
    setDueDate('');
    setError(null);
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedMemberId) {
      setError('Selecciona un socio.');
      return;
    }

    const amountValue = Number(amount);
    if (!amount || amountValue <= 0) {
      setError('Introduce un importe mayor que cero.');
      return;
    }

    await onSubmit({
      memberId: selectedMemberId,
      amount: amountValue,
      reason: reason.trim() || undefined,
      dueDate: dueDate || undefined,
    });
    resetAndClose();
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? resetAndClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cuenta pendiente</DialogTitle>
          <DialogDescription>
            Crea un Pendiente de aportación manual para un socio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-text-primary">
            Socio
            <div className="relative mt-1.5">
              {selectedMemberId ? (
                <div className="flex items-center justify-between rounded-lg border border-border-light bg-bg-soft p-2">
                  <span className="text-sm text-text-primary">{selectedMemberLabel}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMemberId('');
                      setSelectedMemberLabel('');
                      setMemberQuery('');
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    placeholder="Buscar por nombre, n socio, telfono..."
                  />
                  {memberQuery.length >= 2 && members.length > 0 ? (
                    <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border-light bg-white shadow-lg">
                      {members.map((member) => (
                        <button
                          type="button"
                          key={member.id}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-bg-soft"
                          onClick={() => {
                            setSelectedMemberId(member.id);
                            setSelectedMemberLabel(
                              `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim() +
                                (member.memberNumber ? ` (N ${member.memberNumber})` : ''),
                            );
                            setMemberQuery('');
                          }}
                        >
                          <span className="font-medium text-text-primary">
                            {member?.firstName ?? ''} {member?.lastName ?? ''}
                          </span>
                          {member.memberNumber ? (
                            <span className="ml-2 text-text-muted">N {member.memberNumber}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </label>

          <label className="block text-sm font-medium text-text-primary">
            Importe (crditos)
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ej. 50.00"
            />
          </label>

          <label className="block text-sm font-medium text-text-primary">
            Motivo (opcional)
            <Textarea
              className="mt-1.5"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. Aportacin pendiente por servicio extra"
            />
          </label>

          <label className="block text-sm font-medium text-text-primary">
            Fecha de vencimiento (opcional)
            <Input
              className="mt-1.5"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creando...' : 'Crear cuenta pendiente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReceivablesPage() {
  const { hasPermission } = useAuth();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [payTarget, setPayTarget] = useState<Receivable | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Receivable | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canView = hasPermission('credit.view');
  const canCollect = hasPermission('credit.collect');
  const canApprove = hasPermission('credit.approve');
  const canCancel = hasPermission('credit.cancel');
  const canCreate = hasPermission('credit.collect');

  const receivablesFilters = useMemo(
    () => ({ q: query, status, take: 150 }),
    [query, status],
  );

  const receivablesQuery = useReceivables(receivablesFilters);
  const summaryQuery = useReceivablesSummary();
  const payMutation = usePayReceivable();
  const approveMutation = useApproveReceivable();
  const cancelMutation = useCancelReceivable();
  const createMutation = useCreateReceivable();

  const receivables = useMemo(() => {
    const list = [...(receivablesQuery.data ?? [])];
    return list.sort((a, b) => {
      if (sort === 'outstandingDesc') return toNumber(b.outstandingAmount) - toNumber(a.outstandingAmount);
      if (sort === 'outstandingAsc') return toNumber(a.outstandingAmount) - toNumber(b.outstandingAmount);
      if (sort === 'member') return memberName(a).localeCompare(memberName(b));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [receivablesQuery.data, sort]);

  async function payReceivable(amount: number, notes?: string) {
    if (!payTarget) return;

    try {
      await payMutation.mutateAsync({ id: payTarget.id, body: { amount, notes } });
      toast.success('Aportacin registrada correctamente.');
      setPayTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo registrar la aportacin.'));
      throw error;
    }
  }

  async function cancelReceivable(reason: string) {
    if (!cancelTarget) return;

    try {
      await cancelMutation.mutateAsync({ id: cancelTarget.id, body: { reason } });
      toast.success('Pendiente de aportación cancelado.');
      setCancelTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cancelar el pendiente.'));
      throw error;
    }
  }

  async function createReceivable(data: {
    memberId: string;
    amount: number;
    reason?: string;
    dueDate?: string;
  }) {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Cuenta pendiente creada correctamente.');
      setCreateOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo crear la cuenta pendiente.'));
      throw error;
    }
  }

  return (
    <ProtectedLayout>
      {!canView ? (
        <ErrorState
          title="No tienes permiso para ver esta seccin."
          message="Necesitas el permiso credit.view para acceder a cuentas pendientes."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <PageHeader
              title="Cuentas pendientes"
              description="Controla pendientes de aportacin, regularizaciones y saldos de socios."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReceivablesCsv(receivables)}
                disabled={receivables.length === 0}
              >
                <Download size={15} />
                Exportar CSV
              </Button>
              {canCreate ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus size={16} />
                  Nueva cuenta
                </Button>
              ) : null}
            </div>
          </div>

          <ReceivableKpis
            summary={
              summaryQuery.data ?? {
                totalOutstanding: 0,
                openCount: 0,
                partiallyPaidCount: 0,
                overdueCount: 0,
                collectedToday: 0,
              }
            }
          />

          <Card size="sm" className="border border-border-light bg-white">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por socio, telfono, email o nmero"
                />
              </label>

              <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="OPEN">Pendientes de aportacin</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Parcialmente regularizadas</SelectItem>
                  <SelectItem value="PAID">Regularizadas</SelectItem>
                  <SelectItem value="OVERDUE">Pendientes vencidas</SelectItem>
                  <SelectItem value="CANCELLED">Canceladas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recientes</SelectItem>
                  <SelectItem value="outstandingDesc">Mayor pendiente</SelectItem>
                  <SelectItem value="outstandingAsc">Menor pendiente</SelectItem>
                  <SelectItem value="member">Socio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {receivablesQuery.isLoading ? <CardGridSkeleton count={4} cols="xl:grid-cols-2" /> : null}

          {!receivablesQuery.isLoading && receivablesQuery.error ? (
            <ErrorState
              title="No se pudieron cargar las cuentas pendientes"
              message={receivablesQuery.error.message}
              onRetry={() => receivablesQuery.refetch()}
            />
          ) : null}

          {!receivablesQuery.isLoading && !receivablesQuery.error && receivables.length === 0 ? (
            <EmptyState
              title="No hay cuentas pendientes"
              text="Cuando una dispensacin quede con Pendiente de aportación, aparecer aqu."
            />
          ) : null}

          <section className="grid gap-3 xl:grid-cols-2">
            {receivables.map((receivable) => {
              const isPending = ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'].includes(receivable.status);
              return (
                <Card key={receivable.id} size="sm" className="border border-border-light bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-lighter text-brand-primary">
                          <UserRound size={17} />
                        </div>
                        <div>
                          <h2 className="font-bold text-text-primary">{memberName(receivable)}</h2>
                          <p className="text-xs text-text-muted">
                            Nº {receivable.member?.memberNumber ?? '-'} · {receivable.member?.phone ?? receivable.member?.email ?? 'Sin contacto'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {receivable.approvedById ? (
                        <Badge variant="success">Aprobada</Badge>
                      ) : null}
                      <Badge variant={statusTone(receivable.status)}>
                        {statusLabels[receivable.status]}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-lg border border-border-light bg-bg-soft p-2">
                      <p className="text-xs text-text-muted">Crditos</p>
                      <p className="font-semibold">{formatCurrency(receivable.originalAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-border-light bg-bg-soft p-2">
                      <p className="text-xs text-text-muted">Regularizado</p>
                      <p className="font-semibold text-[#15140F]">{formatCurrency(receivable.paidAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <p className="text-xs text-amber-700">Pendiente restante</p>
                      <p className="font-bold text-amber-800">{formatCurrency(receivable.outstandingAmount)}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-text-muted">
                    <p>Creada: {formatDate(receivable.createdAt)}</p>
                    {receivable.dueDate ? <p>Vence: {formatDate(receivable.dueDate)}</p> : null}
                    {receivable.sale ? (
                      <p>Dispensación origen: {receivable.sale.id.slice(0, 8)} - {formatCurrency(receivable.sale.total)}</p>
                    ) : null}
                    {receivable.reason ? <p>Motivo: {receivable.reason}</p> : null}
                  </div>

                  {(receivable.payments ?? []).length ? (
                    <div className="rounded-lg border border-border-light bg-bg-soft p-2 text-xs text-text-muted">
                      Ultima aportacion: {formatCurrency(receivable.payments?.[0]?.amount)} - {formatDate(receivable.payments?.[0]?.createdAt)}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {canApprove && isPending && !receivable.approvedById ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending}
                        onClick={async () => {
                          try {
                            await approveMutation.mutateAsync(receivable.id);
                            toast.success('Cuenta pendiente aprobada.');
                          } catch (err) {
                            toast.error(getErrorMessage(err, 'No se pudo aprobar.'));
                          }
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Aprobar
                      </Button>
                    ) : null}
                    {canCollect && isPending ? (
                      <Button size="sm" onClick={() => setPayTarget(receivable)}>
                        <HandCoins size={14} />
                        Registrar aportación
                      </Button>
                    ) : null}
                    {canCancel && isPending ? (
                      <Button size="sm" variant="danger" onClick={() => setCancelTarget(receivable)}>
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </section>
        </div>
      )}

      <PayReceivableModal
        receivable={payTarget}
        open={Boolean(payTarget)}
        saving={payMutation.isPending}
        onClose={() => setPayTarget(null)}
        onSubmit={payReceivable}
      />

      <CancelReceivableModal
        receivable={cancelTarget}
        open={Boolean(cancelTarget)}
        saving={cancelMutation.isPending}
        onClose={() => setCancelTarget(null)}
        onSubmit={cancelReceivable}
      />

      <CreateReceivableModal
        open={createOpen}
        saving={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={createReceivable}
      />
    </ProtectedLayout>
  );
}

