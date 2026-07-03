'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Building2, CalendarDays, Filter, HandCoins, PlusCircle, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { ThirdPartyPaymentModal } from '@/components/third-party-payments/ThirdPartyPaymentModal';
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
import { ListSkeleton } from '@/components/ui/loading-state';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useThirdParties } from '@/hooks/useThirdParties';
import {
  useCancelThirdPartyPayment,
  useThirdPartyPayments,
} from '@/hooks/useThirdPartyPayments';
import { formatCurrency, formatDate } from '@/lib/format';
import type {
  ThirdPartyPayment,
  ThirdPartyPaymentCategory,
  ThirdPartyPaymentStatus,
} from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const categoryLabels: Record<ThirdPartyPaymentCategory, string> = {
  SUPPLIER_PAYMENT: 'Aportación a tercero',
  SERVICE_PAYMENT: 'Aportación de servicio',
  COLLABORATOR_PAYMENT: 'Aportación a colaborador',
  CASH_WITHDRAWAL: 'Retirada',
  EXPENSE: 'Salida',
  OTHER: 'Otro',
};

const categoryOptions: Array<{ value: ThirdPartyPaymentCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Todas las categorias' },
  { value: 'SUPPLIER_PAYMENT', label: 'Tercero' },
  { value: 'SERVICE_PAYMENT', label: 'Servicio' },
  { value: 'COLLABORATOR_PAYMENT', label: 'Colaborador' },
  { value: 'CASH_WITHDRAWAL', label: 'Retirada' },
  { value: 'EXPENSE', label: 'Salida' },
  { value: 'OTHER', label: 'Otro' },
];

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function shortId(id?: string | null) {
  return id ? id.slice(0, 8) : '-';
}

function ThirdPartyPaymentKpis({
  payments,
  activeThirdParties,
}: {
  payments: ThirdPartyPayment[];
  activeThirdParties: number;
}) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const paidPayments = payments.filter((payment) => payment.status === 'PAID');
  const paidToday = paidPayments
    .filter((payment) => sameDay(new Date(payment.createdAt), today))
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const paidMonth = paidPayments
    .filter((payment) => new Date(payment.createdAt) >= monthStart)
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const lastPayment = paidPayments[0];

  const items = [
    { label: 'Aportado hoy', value: formatCurrency(paidToday), tone: 'text-red-700', icon: HandCoins },
    { label: 'Aportado este mes', value: formatCurrency(paidMonth), tone: 'text-amber-700', icon: CalendarDays },
    { label: 'Número de aportaciones', value: String(payments.length), tone: 'text-text-primary', icon: HandCoins },
    { label: 'Terceros activos', value: String(activeThirdParties), tone: 'text-[#15140F]', icon: Building2 },
    {
      label: 'Última aportación',
      value: lastPayment ? formatCurrency(lastPayment.amount) : '-',
      tone: 'text-text-primary',
      icon: CalendarDays,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border border-border-light bg-white p-4" size="sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-text-secondary">{item.label}</p>
                <p className={`mt-2 text-xl font-semibold ${item.tone}`}>{item.value}</p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <Icon size={17} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function PaymentCard({
  payment,
  canCancel,
  onCancel,
}: {
  payment: ThirdPartyPayment;
  canCancel: boolean;
  onCancel: (payment: ThirdPartyPayment) => void;
}) {
  return (
    <Card className="border border-border-light bg-white p-4 transition-colors hover:border-amber-200" size="sm">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_130px_1fr_140px_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={payment.status === 'PAID' ? 'warning' : 'secondary'}>
              {payment.status === 'PAID' ? 'Registrada' : 'Cancelada'}
            </Badge>
            <Badge variant="outline">{categoryLabels[payment.category]}</Badge>
          </div>
          <p className="mt-2 font-semibold text-text-primary">
            {payment.thirdParty?.name || 'Sin tercero asociado'}
          </p>
          <p className="text-xs text-text-secondary">{payment.reason}</p>
        </div>

        <div>
          <p className="text-xs text-text-secondary">Créditos</p>
          <p className="text-lg font-semibold text-red-700">-{formatCurrency(payment.amount)}</p>
        </div>

        <div>
          <p className="text-xs text-text-secondary">Caja / colaborador</p>
          <p className="font-medium text-text-primary">Caja {shortId(payment.posSessionId)}</p>
          <p className="text-xs text-text-secondary">{payment.paidBy?.name || payment.paidBy?.email}</p>
        </div>

        <div>
          <p className="text-xs text-text-secondary">Fecha</p>
          <p className="font-medium text-text-primary">{formatDate(payment.createdAt)}</p>
          {payment.cancelReason ? (
            <p className="text-xs text-red-700">Cancelada: {payment.cancelReason}</p>
          ) : null}
        </div>

        {canCancel && payment.status === 'PAID' ? (
          <Button variant="outline" size="sm" onClick={() => onCancel(payment)}>
            <XCircle size={14} />
            Cancelar aportación
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function CancelPaymentDialog({
  payment,
  onClose,
}: {
  payment: ThirdPartyPayment | null;
  onClose: () => void;
}) {
  const cancelPayment = useCancelThirdPartyPayment();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!payment) return;

    if (!reason.trim()) {
      setError('Indica el motivo de la cancelación.');
      return;
    }

    try {
      await cancelPayment.mutateAsync({
        id: payment.id,
        body: {
          reason: reason.trim(),
        },
      });
      toast.success('Aportación cancelada y corrección registrada');
      setReason('');
      onClose();
    } catch (cancelError) {
      const msg = cancelError instanceof Error ? cancelError.message : 'No se pudo cancelar la aportación.';
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <Dialog open={Boolean(payment)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Cancelar aportación a tercero</DialogTitle>
            <DialogDescription>
              Se registrará una corrección positiva en caja por el mismo importe. La operación original no se eliminará.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-semibold text-text-primary">
              {payment?.thirdParty?.name || 'Aportación sin tercero'} · {formatCurrency(payment?.amount)}
            </p>
            <p className="text-text-secondary">{payment?.reason}</p>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            Motivo obligatorio
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Error administrativo, duplicado..."
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Volver
            </Button>
            <Button type="submit" disabled={cancelPayment.isPending}>
              {cancelPayment.isPending ? 'Cancelando...' : 'Cancelar aportación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ThirdPartyPaymentsPage() {
  const { hasPermission } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelPayment, setCancelPayment] = useState<ThirdPartyPayment | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ThirdPartyPaymentCategory | 'all'>('all');
  const [status, setStatus] = useState<ThirdPartyPaymentStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const canView = hasPermission('third_party_payment.view');
  const canCreatePayment = hasPermission('third_party_payment.create');
  const canCancelPayment = hasPermission('third_party_payment.cancel');
  const canCreateThirdParty = hasPermission('third_party.create');
  const paymentFilters = useMemo(
    () => ({
      q,
      category,
      status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      take: 150,
    }),
    [category, dateFrom, dateTo, q, status],
  );
  const payments = useThirdPartyPayments(paymentFilters);
  const thirdParties = useThirdParties({ status: 'ACTIVE', take: 300 });
  const paymentList = useMemo(() => payments.data ?? [], [payments.data]);

  if (!canView) {
    return (
      <ProtectedLayout>
        <ErrorState
          title="No tienes permiso para ver aportaciones a terceros"
          message="Necesitas el permiso third_party_payment.view."
        />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-5">
        <PageHeader
          title="Aportaciones a terceros"
          description="Registra salidas de efectivo asociadas a terceros, servicios o colaboradores."
          action={
            canCreatePayment ? (
              <Button onClick={() => setPaymentModalOpen(true)}>
                <PlusCircle size={16} />
                Nueva aportación
              </Button>
            ) : null
          }
        />

        <ThirdPartyPaymentKpis
          payments={paymentList}
          activeThirdParties={thirdParties.data?.length ?? 0}
        />

        <Card className="border border-border-light bg-white" size="sm">
          <div className="grid gap-3 xl:grid-cols-[1fr_210px_170px_160px_160px_auto] xl:items-end">
            <label className="grid gap-1 text-sm font-medium">
              Buscar
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Tercero, motivo o documento"
                  className="pl-9"
                />
              </div>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Categoria
              <Select value={category} onValueChange={(value) => setCategory(value as ThirdPartyPaymentCategory | 'all')}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Estado
              <Select value={status} onValueChange={(value) => setStatus(value as ThirdPartyPaymentStatus | 'all')}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PAID">Registradas</SelectItem>
                  <SelectItem value="CANCELLED">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Desde
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Hasta
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQ('');
                setCategory('all');
                setStatus('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              <Filter size={14} />
              Limpiar
            </Button>
          </div>
        </Card>

        {payments.isLoading ? <ListSkeleton rows={4} /> : null}
        {!payments.isLoading && payments.isError ? (
          <ErrorState title="No se pudieron cargar las aportaciones" message="Inténtalo de nuevo." onRetry={() => payments.refetch()} />
        ) : !payments.isLoading ? (
          <div className="space-y-2">
            {paymentList.length ? (
              paymentList.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  canCancel={canCancelPayment}
                  onCancel={setCancelPayment}
                />
              ))
            ) : (
              <EmptyState
                title="No hay aportaciones a terceros"
                text="Registra la primera aportación cuando haya una caja abierta."
              />
            )}
          </div>
        ) : null}
      </div>

      <ThirdPartyPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        canCreateThirdParty={canCreateThirdParty}
      />
      <CancelPaymentDialog payment={cancelPayment} onClose={() => setCancelPayment(null)} />
    </ProtectedLayout>
  );
}
