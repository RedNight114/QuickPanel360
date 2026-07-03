'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  Download,
  Eye,
  Filter,
  HandCoins,
  MinusCircle,
  PlusCircle,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
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
import { ListSkeleton, SectionSkeleton } from '@/components/ui/loading-state';
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
  useCashCurrentSummary,
  useCashMovements,
  useCashSessionDetail,
  useCashSessions,
  useCreateCashMovement,
} from '@/hooks/useCash';
import { formatCurrency, formatDate } from '@/lib/format';
import type {
  CashMovement,
  CashCurrentSummary,
  CashMovementType,
  CashSessionSummary,
  CashSummary,
  CreateCashMovementInput,
} from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type CashTab = 'current' | 'movements' | 'sessions';
type MovementDialogState = {
  open: boolean;
  type: CashMovementType;
};

const cashNavItems: Array<{
  value: CashTab;
  label: string;
  description: string;
  icon: typeof Wallet;
}> = [
  {
    value: 'current',
    label: 'Caja actual',
    description: 'Resumen vivo',
    icon: Wallet,
  },
  {
    value: 'movements',
    label: 'Movimientos',
    description: 'Entradas y salidas',
    icon: Banknote,
  },
  {
    value: 'sessions',
    label: 'Sesiones',
    description: 'Histórico de caja',
    icon: CalendarClock,
  },
];

const movementLabels: Record<CashMovementType, string> = {
  CASH_IN: 'Entrada manual',
  CASH_OUT: 'Salida manual',
  CORRECTION: 'Corrección',
  EXPENSE: 'Salida',
  SALE_CASH_IN: 'Dispensación en efectivo',
  RECEIVABLE_CASH_IN: 'Registro de aportación de pendiente',
  THIRD_PARTY_CASH_OUT: 'Aportación a tercero',
  WITHDRAWAL: 'Retirada',
  CORRECTION_IN: 'Corrección positiva',
  CORRECTION_OUT: 'Corrección negativa',
};

const manualMovementLabels: Record<
  Extract<CashMovementType, 'CASH_IN' | 'WITHDRAWAL' | 'EXPENSE' | 'CORRECTION_IN' | 'CORRECTION_OUT'>,
  string
> = {
  CASH_IN: 'Registrar entrada',
  WITHDRAWAL: 'Registrar retirada',
  EXPENSE: 'Registrar salida',
  CORRECTION_IN: 'Corrección positiva',
  CORRECTION_OUT: 'Corrección negativa',
};

const negativeTypes = new Set<CashMovementType>([
  'CASH_OUT',
  'EXPENSE',
  'WITHDRAWAL',
  'THIRD_PARTY_CASH_OUT',
  'CORRECTION_OUT',
]);

const movementTypeOptions: Array<{ value: CashMovementType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'SALE_CASH_IN', label: 'Dispensaciones registradas' },
  { value: 'RECEIVABLE_CASH_IN', label: 'Registro de aportaciones de pendientes' },
  { value: 'CASH_IN', label: 'Entradas manuales' },
  { value: 'WITHDRAWAL', label: 'Retiradas' },
  { value: 'EXPENSE', label: 'Salidas' },
  { value: 'CORRECTION_IN', label: 'Correcciones positivas' },
  { value: 'CORRECTION_OUT', label: 'Correcciones negativas' },
];

const sessionStatusOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'OPEN', label: 'Abiertas' },
  { value: 'CLOSED', label: 'Cerradas' },
];

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function movementTone(type: CashMovementType) {
  if (type === 'CORRECTION_IN' || type === 'CORRECTION_OUT' || type === 'CORRECTION') {
    return 'warning' as const;
  }

  if (negativeTypes.has(type)) {
    return 'danger' as const;
  }

  return 'success' as const;
}

function signedAmount(movement: Pick<CashMovement, 'type' | 'amount'>) {
  const sign = negativeTypes.has(movement.type) ? '-' : '+';
  return `${sign}${formatCurrency(movement.amount)}`;
}

function shortId(id?: string | null) {
  return id ? id.slice(0, 8) : '-';
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportMovementsCsv(movements: CashMovement[]) {
  const headers = [
    'Fecha',
    'Tipo',
    'Importe',
    'Motivo',
    'Referencia',
  ];

  const rows = movements.map((movement) => [
    movement.createdAt ? new Date(movement.createdAt).toLocaleString('es-ES') : '',
    movementLabels[movement.type] ?? movement.type,
    `${negativeTypes.has(movement.type) ? '-' : ''}${Number(movement.amount ?? 0).toFixed(2)}`,
    movement.reason ?? '',
    movement.saleId
      ? `Dispensación ${shortId(movement.saleId)}`
      : `Caja ${shortId(movement.posSessionId)}`,
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
  link.download = `movimientos_caja_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function differenceLabel(value: unknown) {
  const difference = toNumber(value);

  if (difference === 0) {
    return `Cuadrada · ${formatCurrency(0)}`;
  }

  if (difference > 0) {
    return `Sobrante · +${formatCurrency(difference)}`;
  }

  return `Faltante · -${formatCurrency(Math.abs(difference))}`;
}

function differenceTone(value: unknown) {
  const difference = toNumber(value);
  if (difference === 0) return 'success' as const;
  if (difference > 0) return 'warning' as const;
  return 'danger' as const;
}

function SummaryTile({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'neutral';
}) {
  const toneClass = {
    green: 'bg-yellow-50 text-yellow-800 ring-yellow-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    neutral: 'bg-white text-text-primary ring-border-light',
  }[tone];

  return (
    <div className={`min-h-[92px] rounded-xl p-4 ring-1 ${toneClass}`}>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-2 text-xl font-semibold leading-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-text-secondary">{detail}</p> : null}
    </div>
  );
}

function CurrentSummaryCards({ summary }: { summary: CashSummary }) {
  const totalOut =
    toNumber(summary.cashOut) +
    toNumber(summary.thirdPartyCashOut) +
    toNumber(summary.expenses) +
    toNumber(summary.withdrawals) +
    toNumber(summary.correctionsOut);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryTile label="Efectivo inicial" value={formatCurrency(summary.openingCash)} />
      <SummaryTile
        label="Dispensaciones registradas"
        value={formatCurrency(summary.saleCashIn)}
        detail={`${summary.operationsCount} operaciones`}
        tone="green"
      />
      <SummaryTile
        label="Registro de aportaciones de pendientes"
        value={formatCurrency(summary.receivableCashIn)}
        tone="blue"
      />
      <SummaryTile
        label="Efectivo esperado"
        value={formatCurrency(summary.expectedCash)}
        detail="Según movimientos registrados"
        tone="green"
      />
      <SummaryTile
        label="Entradas manuales"
        value={formatCurrency(summary.manualCashIn)}
        tone="green"
      />
      <SummaryTile label="Salidas" value={formatCurrency(totalOut)} tone="red" />
      <SummaryTile
        label="Aportaciones a terceros"
        value={formatCurrency(summary.thirdPartyCashOut)}
        tone="red"
      />
      <SummaryTile
        label="Correcciones"
        value={formatCurrency(toNumber(summary.correctionsIn) - toNumber(summary.correctionsOut))}
        tone="amber"
      />
      <SummaryTile
        label="Movimientos"
        value={summary.movementsCount}
        detail={`Dispensaciones: ${formatCurrency(summary.salesTotal)}`}
      />
    </div>
  );
}

function CashActionButtons({
  actions,
  onSelect,
  compact = false,
}: {
  actions: Array<{ type: CashMovementType; label: string; icon: typeof PlusCircle }>;
  onSelect: (type: CashMovementType) => void;
  compact?: boolean;
}) {
  if (!actions.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.type}
            size={compact ? 'sm' : 'md'}
            variant={negativeTypes.has(action.type) ? 'outline' : 'primary'}
            onClick={() => onSelect(action.type)}
          >
            <Icon size={14} />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

function CashSectionNav({
  activeTab,
  onChange,
}: {
  activeTab: CashTab;
  onChange: (tab: CashTab) => void;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-white p-1.5 shadow-sm">
      <div className="grid gap-1.5 sm:grid-cols-3">
        {cashNavItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                active
                  ? 'bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200'
                  : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  active ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-text-secondary'
                }`}
              >
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block truncate text-xs opacity-75">{item.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CashStatusHero({
  session,
  summary,
}: {
  session: CashCurrentSummary['session'];
  summary: CashSummary;
}) {
  return (
    <Card className="border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/70">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" size="md">Caja abierta</Badge>
            <p className="text-sm font-semibold text-text-primary">Caja {shortId(session?.id)}</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr] md:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-yellow-800">
                Efectivo esperado
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-yellow-800">
                {formatCurrency(summary.expectedCash)}
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Según dispensaciones, aportaciones, entradas, salidas y correcciones registradas.
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Abierta por</p>
              <p className="mt-1 font-semibold text-text-primary">
                {session?.openedBy?.name || 'Usuario'}
              </p>
              <p className="text-xs text-text-secondary">{formatDate(session?.openedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Actividad</p>
              <p className="mt-1 font-semibold text-text-primary">
                {summary.operationsCount} operaciones
              </p>
              <p className="text-xs text-text-secondary">{summary.movementsCount} movimientos</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MovementRow({ movement }: { movement: CashMovement }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border-light bg-white p-3 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-colors hover:border-yellow-200 md:grid-cols-[150px_1fr_120px_160px] md:items-center">
      <div>
        <p className="font-medium text-text-primary">{formatDate(movement.createdAt)}</p>
        <p className="text-xs text-text-secondary">Caja {shortId(movement.posSessionId)}</p>
      </div>
      <div>
        <Badge variant={movementTone(movement.type)}>{movementLabels[movement.type]}</Badge>
        <p className="mt-1 text-text-secondary">{movement.reason || 'Sin motivo indicado'}</p>
        {movement.saleId ? (
          <p className="mt-0.5 text-xs text-text-secondary">Dispensación {shortId(movement.saleId)}</p>
        ) : null}
      </div>
      <p
        className={`text-right font-semibold md:text-left ${
          negativeTypes.has(movement.type) ? 'text-red-700' : 'text-[#15140F]'
        }`}
      >
        {signedAmount(movement)}
      </p>
      <p className="text-xs text-text-secondary">
        {movement.createdBy?.name || movement.createdBy?.email || 'Usuario'}
      </p>
    </div>
  );
}

function SessionDetailMovementRow({ movement }: { movement: CashMovement }) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={movementTone(movement.type)}>{movementLabels[movement.type]}</Badge>
            <span className="text-xs text-text-secondary">{formatDate(movement.createdAt)}</span>
          </div>
          <p className="mt-2 max-w-xl break-words text-text-primary">
            {movement.reason || 'Sin motivo indicado'}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span>Caja {shortId(movement.posSessionId)}</span>
            {movement.saleId ? <span>Dispensación {shortId(movement.saleId)}</span> : null}
            <span>{movement.createdBy?.name || movement.createdBy?.email || 'Usuario'}</span>
          </div>
        </div>
        <p
          className={`shrink-0 text-base font-semibold ${
            negativeTypes.has(movement.type) ? 'text-red-700' : 'text-[#15140F]'
          }`}
        >
          {signedAmount(movement)}
        </p>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  onView,
}: {
  session: CashSessionSummary;
  onView: (id: string) => void;
}) {
  const difference = toNumber(session.difference);

  return (
    <div className="grid gap-3 rounded-xl border border-border-light bg-white p-4 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] transition-colors hover:border-yellow-200 lg:grid-cols-[1.4fr_120px_120px_120px_150px_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={session.status === 'OPEN' ? 'success' : 'secondary'}>
            {session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
          </Badge>
          <p className="font-semibold text-text-primary">Caja {shortId(session.id)}</p>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {session.openedBy?.name || 'Usuario'} · {formatDate(session.openedAt)}
          {session.closedAt ? ` -> ${formatDate(session.closedAt)}` : ''}
        </p>
      </div>
      <div>
        <p className="text-xs text-text-secondary">Inicial</p>
        <p className="font-medium">{formatCurrency(session.openingCash)}</p>
      </div>
      <div>
        <p className="text-xs text-text-secondary">Esperado</p>
        <p className="font-medium">{formatCurrency(session.summary.expectedCash)}</p>
      </div>
      <div>
        <p className="text-xs text-text-secondary">Contado</p>
        <p className="font-medium">{formatCurrency(session.closingCash)}</p>
      </div>
      <div>
        <p className="text-xs text-text-secondary">Diferencia registrada</p>
        <Badge variant={differenceTone(difference)}>{differenceLabel(difference)}</Badge>
      </div>
      <Button variant="outline" size="sm" onClick={() => onView(session.id)}>
        <Eye size={14} />
        Ver detalle
      </Button>
    </div>
  );
}

function ManualMovementDialog({
  state,
  onOpenChange,
}: {
  state: MovementDialogState;
  onOpenChange: (state: MovementDialogState) => void;
}) {
  const createMovement = useCreateCashMovement();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const title =
    manualMovementLabels[state.type as keyof typeof manualMovementLabels] ??
    'Movimiento de caja';
  const isOut = negativeTypes.has(state.type);

  const close = () => {
    setAmount('');
    setReason('');
    setNotes('');
    setError(null);
    onOpenChange({ ...state, open: false });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Introduce un importe mayor que 0.');
      return;
    }

    if (!reason.trim()) {
      setError('Indica un motivo para registrar el movimiento.');
      return;
    }

    const body: CreateCashMovementInput = {
      type: state.type,
      amount: numericAmount,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    };

    try {
      await createMovement.mutateAsync(body);
      toast.success('Movimiento registrado');
      close();
    } catch (movementError) {
      setError(movementError instanceof Error ? movementError.message : 'No se pudo registrar el movimiento.');
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={(open) => (open ? onOpenChange({ ...state, open }) : close())}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {isOut
                ? 'Este importe reducirá el efectivo esperado de la caja.'
                : 'Este importe aumentará el efectivo esperado de la caja.'}
            </DialogDescription>
          </DialogHeader>

          <label className="grid gap-1 text-sm font-medium">
            Importe
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Motivo
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. Retirada para cambio"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Notas opcionales
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Detalle interno para auditoría"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMovement.isPending}>
              {createMovement.isPending ? 'Guardando...' : 'Guardar movimiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessionDetailDialog({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useCashSessionDetail(sessionId);
  const movements = data?.session.cashMovements ?? [];
  const difference = toNumber(data?.session.difference);
  const totalOut = data
    ? toNumber(data.summary.cashOut) +
      toNumber(data.summary.thirdPartyCashOut) +
      toNumber(data.summary.expenses) +
      toNumber(data.summary.withdrawals) +
      toNumber(data.summary.correctionsOut)
    : 0;
  const correctionBalance = data
    ? toNumber(data.summary.correctionsIn) - toNumber(data.summary.correctionsOut)
    : 0;
  const sessionReading =
    difference === 0
      ? 'La sesión se cerró cuadrada.'
      : difference > 0
        ? `La sesión se cerró con un sobrante de ${formatCurrency(difference)}.`
        : `La sesión se cerró con un faltante de ${formatCurrency(Math.abs(difference))}.`;

  return (
    <Dialog open={Boolean(sessionId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] w-[min(1040px,calc(100vw-2rem))] !max-w-none overflow-y-auto overflow-x-hidden p-5 sm:!max-w-none">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-lg">Detalle de sesión de caja</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">
                Sesión {shortId(data?.session.id ?? sessionId)} con dispensaciones, aportaciones y movimientos asociados.
              </DialogDescription>
            </div>
            {data ? (
              <Badge variant={data.session.status === 'OPEN' ? 'success' : 'secondary'} size="md">
                {data.session.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-text-secondary">Cargando detalle...</p>
        ) : data ? (
          <div className="space-y-4">
            <Card className="border border-border-light bg-white p-4" size="sm">
              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
                <div>
                  <p className="text-xs text-text-secondary">Lectura de cierre</p>
                  <p className="mt-1 max-w-sm text-lg font-semibold leading-snug text-text-primary">
                    {sessionReading}
                  </p>
                  <Badge className="mt-2" variant={differenceTone(difference)}>
                    {differenceLabel(difference)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Apertura</p>
                  <p className="mt-1 font-medium text-text-primary">{formatDate(data.session.openedAt)}</p>
                  <p className="text-xs text-text-secondary">
                    Por {data.session.openedBy?.name || 'Usuario'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Cierre</p>
                  <p className="mt-1 font-medium text-text-primary">{formatDate(data.session.closedAt)}</p>
                  <p className="text-xs text-text-secondary">
                    Por {data.session.closedBy?.name || data.session.closedBy?.email || '-'}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile label="Inicial" value={formatCurrency(data.summary.openingCash)} />
              <SummaryTile label="Dispensaciones registradas" value={formatCurrency(data.summary.saleCashIn)} tone="green" />
              <SummaryTile label="Registro de aportaciones pendientes" value={formatCurrency(data.summary.receivableCashIn)} tone="blue" />
              <SummaryTile label="Esperado" value={formatCurrency(data.summary.expectedCash)} tone="green" />
              <SummaryTile label="Entradas manuales" value={formatCurrency(data.summary.manualCashIn)} tone="green" />
              <SummaryTile label="Salidas" value={formatCurrency(totalOut)} tone="red" />
              <SummaryTile label="Correcciones" value={formatCurrency(correctionBalance)} tone="amber" />
              <SummaryTile
                label="Contado"
                value={formatCurrency(data.session.closingCash)}
                detail={`${data.summary.movementsCount} movimientos`}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Movimientos de caja</h3>
                  <p className="text-xs text-text-secondary">Entradas, salidas y correcciones de esta sesión.</p>
                </div>
                <Badge variant="outline">{movements.length} registros</Badge>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {movements.length ? (
                  movements.map((movement) => (
                    <SessionDetailMovementRow key={movement.id} movement={movement} />
                  ))
                ) : (
                  <EmptyState title="Sin movimientos" text="Esta sesión no tiene movimientos registrados." />
                )}
              </div>
            </div>
          </div>
        ) : (
          <ErrorState title="No se pudo cargar la sesión" message="Inténtalo de nuevo en unos segundos." />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CashPage() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<CashTab>('current');
  const [movementType, setMovementType] = useState<CashMovementType | 'all'>('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementSessionId, setMovementSessionId] = useState('');
  const [movementDateFrom, setMovementDateFrom] = useState('');
  const [movementDateTo, setMovementDateTo] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string | 'all'>('all');
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionDateFrom, setSessionDateFrom] = useState('');
  const [sessionDateTo, setSessionDateTo] = useState('');
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [thirdPartyPaymentOpen, setThirdPartyPaymentOpen] = useState(false);
  const [dialogState, setDialogState] = useState<MovementDialogState>({
    open: false,
    type: 'CASH_IN',
  });

  const canViewCash = hasPermission('cash.summary.view') || hasPermission('cash.sessions.view');
  const canCreateMovement = hasPermission('cash.movements.create');
  const canWithdraw = hasPermission('cash.withdraw');
  const canExpense = hasPermission('cash.expense');
  const canCorrection = hasPermission('cash.correction');
  const canCreateThirdPartyPayment = hasPermission('third_party_payment.create');
  const canCreateThirdParty = hasPermission('third_party.create');

  const movementFilters = useMemo(
    () => ({
      type: movementType,
      sessionId: movementSessionId.trim() || undefined,
      dateFrom: movementDateFrom || undefined,
      dateTo: movementDateTo || undefined,
      take: 100,
    }),
    [movementDateFrom, movementDateTo, movementSessionId, movementType],
  );
  const sessionFilters = useMemo(
    () => ({
      status: sessionStatus,
      dateFrom: sessionDateFrom || undefined,
      dateTo: sessionDateTo || undefined,
      take: 80,
    }),
    [sessionDateFrom, sessionDateTo, sessionStatus],
  );

  const currentSummary = useCashCurrentSummary();
  const movements = useCashMovements(movementFilters);
  const sessions = useCashSessions(sessionFilters);
  const openSession = currentSummary.data?.session;
  const recentMovements = currentSummary.data?.recentMovements ?? [];
  const filteredMovements = useMemo(() => {
    const query = movementSearch.trim().toLowerCase();
    const data = movements.data ?? [];

    if (!query) {
      return data;
    }

    return data.filter((movement) => {
      const haystack = [
        movement.reason,
        movement.type,
        movement.id,
        movement.posSessionId,
        movement.saleId,
        movement.createdBy?.name,
        movement.createdBy?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [movementSearch, movements.data]);
  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    const data = sessions.data ?? [];

    if (!query) {
      return data;
    }

    return data.filter((session) => {
      const haystack = [
        session.id,
        session.openedBy?.name,
        session.openedBy?.email,
        session.closedBy?.name,
        session.closedBy?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [sessionSearch, sessions.data]);

  const manualActions = useMemo(
    () =>
      [
        canCreateMovement ? { type: 'CASH_IN' as const, label: 'Entrada', icon: PlusCircle } : null,
        canWithdraw ? { type: 'WITHDRAWAL' as const, label: 'Retirada', icon: MinusCircle } : null,
        canExpense ? { type: 'EXPENSE' as const, label: 'Salida', icon: ReceiptText } : null,
        canCorrection ? { type: 'CORRECTION_IN' as const, label: 'Corrección +', icon: ArrowUpCircle } : null,
        canCorrection ? { type: 'CORRECTION_OUT' as const, label: 'Corrección -', icon: ArrowDownCircle } : null,
      ].filter(Boolean) as Array<{
        type: CashMovementType;
        label: string;
        icon: typeof PlusCircle;
      }>,
    [canCorrection, canCreateMovement, canExpense, canWithdraw],
  );

  if (!canViewCash) {
    return (
      <ProtectedLayout>
        <ErrorState
          title="No tienes permiso para ver Caja"
          message="Necesitas permisos de caja para consultar sesiones o movimientos."
        />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-5 overflow-hidden">
        <PageHeader
          title="Caja"
          description="Control de efectivo, sesiones y movimientos del club."
          action={
            <div className="flex flex-wrap justify-end gap-2">
              {openSession ? (
                <>
                  <CashActionButtons
                    actions={manualActions}
                    onSelect={(type) => setDialogState({ open: true, type })}
                    compact
                  />
                  {canCreateThirdPartyPayment ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setThirdPartyPaymentOpen(true)}
                    >
                      <HandCoins size={14} />
                      Aportación a tercero
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { printDailyCashReport } = await import('@/lib/report-pdf');
                  const cs = currentSummary.data;
                  const s = cs?.summary;
                  const movs = movements.data ?? [];
                  printDailyCashReport(
                    {
                      openingCash: Number(s?.openingCash ?? 0),
                      totalSales: Number(s?.salesTotal ?? 0),
                      totalDeposits: Number(s?.manualCashIn ?? 0),
                      totalWithdrawals: Number(s?.withdrawals ?? 0),
                      totalExpenses: Number(s?.expenses ?? 0),
                      expectedCash: Number(s?.expectedCash ?? 0),
                      sessionsCount: sessions.data?.length ?? 0,
                      salesCount: Number(s?.operationsCount ?? 0),
                    },
                    movs.map((m: {
                      type?: unknown;
                      amount?: unknown;
                      reason?: string | null;
                      createdAt?: unknown;
                    }) => ({
                      type: String(m.type ?? ''),
                      amount: Number(m.amount),
                      reason: m.reason ?? undefined,
                      createdAt: String(m.createdAt ?? ''),
                    })),
                  );
                }}
              >
                <Printer size={14} />
                Resumen diario
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  currentSummary.refetch();
                  movements.refetch();
                  sessions.refetch();
                }}
              >
                <RefreshCw size={14} />
                Actualizar
              </Button>
            </div>
          }
        />

        <CashSectionNav activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'current' ? (
          <section className="space-y-4">
            {currentSummary.isLoading ? <SectionSkeleton rows={3} /> : null}
            {!currentSummary.isLoading && currentSummary.isError ? (
              <ErrorState title="No se pudo cargar la caja actual" message="Revisa tu conexión e inténtalo de nuevo." onRetry={() => currentSummary.refetch()} />
            ) : !currentSummary.isLoading && openSession ? (
              <>
                {currentSummary.data?.summary ? (
                  <>
                    <CashStatusHero
                      session={openSession}
                      summary={currentSummary.data.summary}
                    />
                    <CurrentSummaryCards summary={currentSummary.data.summary} />
                  </>
                ) : null}

                <Card className="border border-border-light bg-white" size="sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-text-primary">Movimientos recientes</h2>
                      <p className="text-xs text-text-secondary">Últimos registros de la caja abierta.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('movements')}>
                      Ver todos
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentMovements.length ? (
                      recentMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)
                    ) : (
                      <EmptyState title="Sin movimientos" text="Aún no hay movimientos en esta caja." />
                    )}
                  </div>
                </Card>
              </>
            ) : !currentSummary.isLoading ? (
              <EmptyState
                title="No hay caja abierta"
                text="Abre una caja desde el Punto de dispensación para empezar a registrar dispensaciones y movimientos."
              />
            ) : null}
          </section>
        ) : null}

        {activeTab === 'movements' ? (
          <section className="space-y-4">
            <Card className="border border-border-light bg-white" size="sm">
              <div className="grid gap-3 xl:grid-cols-[1fr_220px_180px_160px_160px_auto] xl:items-end">
                <label className="grid gap-1 text-sm font-medium">
                  Buscar
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
                    <Input
                      value={movementSearch}
                      onChange={(event) => setMovementSearch(event.target.value)}
                      placeholder="Motivo, usuario, dispensación o caja"
                      className="pl-9"
                    />
                  </div>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Tipo
                  <Select
                    value={movementType}
                    onValueChange={(value) => setMovementType(value as CashMovementType | 'all')}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {movementTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Caja
                  <Input
                    value={movementSessionId}
                    onChange={(event) => setMovementSessionId(event.target.value)}
                    placeholder="ID caja"
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Desde
                  <Input
                    type="date"
                    value={movementDateFrom}
                    onChange={(event) => setMovementDateFrom(event.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Hasta
                  <Input
                    type="date"
                    value={movementDateTo}
                    onChange={(event) => setMovementDateTo(event.target.value)}
                  />
                </label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMovementSearch('');
                      setMovementType('all');
                      setMovementSessionId('');
                      setMovementDateFrom('');
                      setMovementDateTo('');
                    }}
                  >
                    <Filter size={14} />
                    Limpiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportMovementsCsv(filteredMovements)}
                    disabled={filteredMovements.length === 0}
                  >
                    <Download size={15} />
                    Exportar CSV
                  </Button>
                </div>
              </div>
            </Card>

            {movements.isLoading ? <ListSkeleton rows={5} /> : null}
            {!movements.isLoading && movements.isError ? (
              <ErrorState title="No se pudieron cargar los movimientos" message="Inténtalo de nuevo." onRetry={() => movements.refetch()} />
            ) : !movements.isLoading ? (
              <div className="space-y-2">
                {filteredMovements.length ? (
                  filteredMovements.map((movement) => <MovementRow key={movement.id} movement={movement} />)
                ) : (
                  <EmptyState title="No hay movimientos" text="No se encontraron movimientos con estos filtros." />
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'sessions' ? (
          <section className="space-y-4">
            <Card className="border border-border-light bg-white" size="sm">
              <div className="grid gap-3 xl:grid-cols-[1fr_190px_160px_160px_auto] xl:items-end">
                <label className="grid gap-1 text-sm font-medium">
                  Buscar sesión
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
                    <Input
                      value={sessionSearch}
                      onChange={(event) => setSessionSearch(event.target.value)}
                      placeholder="ID, usuario o email"
                      className="pl-9"
                    />
                  </div>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Estado
                  <Select value={sessionStatus} onValueChange={setSessionStatus}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Desde
                  <Input
                    type="date"
                    value={sessionDateFrom}
                    onChange={(event) => setSessionDateFrom(event.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  Hasta
                  <Input
                    type="date"
                    value={sessionDateTo}
                    onChange={(event) => setSessionDateTo(event.target.value)}
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSessionSearch('');
                    setSessionStatus('all');
                    setSessionDateFrom('');
                    setSessionDateTo('');
                  }}
                >
                  <Filter size={14} />
                  Limpiar
                </Button>
              </div>
            </Card>

            {sessions.isLoading ? <ListSkeleton rows={4} /> : null}
            {!sessions.isLoading && sessions.isError ? (
              <ErrorState title="No se pudieron cargar las sesiones" message="Inténtalo de nuevo." onRetry={() => sessions.refetch()} />
            ) : !sessions.isLoading ? (
              <div className="space-y-2">
                {filteredSessions.length ? (
                  filteredSessions.map((session) => (
                    <SessionRow key={session.id} session={session} onView={setDetailSessionId} />
                  ))
                ) : (
                  <EmptyState title="No hay sesiones" text="Aún no hay sesiones de caja con estos filtros." />
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <ManualMovementDialog state={dialogState} onOpenChange={setDialogState} />
      <ThirdPartyPaymentModal
        open={thirdPartyPaymentOpen}
        onOpenChange={setThirdPartyPaymentOpen}
        canCreateThirdParty={canCreateThirdParty}
        onSuccess={() => {
          currentSummary.refetch();
          movements.refetch();
          sessions.refetch();
        }}
      />
      <SessionDetailDialog sessionId={detailSessionId} onClose={() => setDetailSessionId(null)} />
    </ProtectedLayout>
  );
}
