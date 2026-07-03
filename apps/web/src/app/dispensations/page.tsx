'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Package,
  Search,
  ShoppingCart,
  Printer,
  User,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { SectionErrorBoundary } from '@/components/errors/section-error-boundary';
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
import { ListSkeleton } from '@/components/ui/loading-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCancelSale, useDispensations } from '@/hooks/usePos';
import { formatCredits, formatDate } from '@/lib/format';
import type { SaleListItem } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
type TypeFilter = 'all' | 'STANDARD' | 'CREDIT' | 'PARTIAL_CREDIT' | 'SPECIAL';

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completada',
  CANCELLED: 'Anulada',
  REFUNDED: 'Devuelta',
  PENDING: 'Pendiente',
};

const typeLabels: Record<string, string> = {
  STANDARD: 'Estándar',
  CREDIT: 'A crédito',
  PARTIAL_CREDIT: 'Crédito parcial',
  SPECIAL: 'Especial',
};

const settlementLabels: Record<string, string> = {
  PAID: 'Pagada',
  PARTIALLY_PAID: 'Parcial',
  PENDING: 'Pendiente',
  CANCELLED: 'Anulada',
  REFUNDED: 'Devuelta',
};

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'border-amber-200 bg-amber-50 text-[#15140F]';
  if (status === 'CANCELLED') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'REFUNDED') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-border-light bg-bg-soft text-text-muted';
}

function settlementTone(settlement: string) {
  if (settlement === 'PAID') return 'border-amber-200 bg-amber-50 text-[#15140F]';
  if (settlement === 'PENDING') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (settlement === 'PARTIALLY_PAID') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-border-light bg-bg-soft text-text-muted';
}

function memberName(sale: SaleListItem) {
  const firstName = sale.member.firstName ?? '';
  const lastName = sale.member.lastName ?? '';
  return `${firstName} ${lastName}`.trim() || sale.member.memberNumber;
}

function formatQuantity(value: number | string | null | undefined) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '-');
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportDispensationsCsv(sales: SaleListItem[]) {
  const headers = [
    'Fecha',
    'Socio',
    'N. socio',
    'Colaborador',
    'Productos',
    'Subtotal',
    'Descuento',
    'Total',
    'Estado',
    'Tipo',
    'Liquidacion',
    'Metodos',
    'Pendiente',
  ];

  const rows = sales.map((sale) => [
    sale.createdAt ? new Date(sale.createdAt).toLocaleString('es-ES') : '',
    memberName(sale),
    sale.member.memberNumber,
    sale.soldBy.name,
    sale.items
      .map((item) => `${item.productNameSnapshot} x${formatQuantity(item.quantity)}`)
      .join('; '),
    Number(sale.subtotal).toFixed(2),
    Number(sale.discount).toFixed(2),
    Number(sale.total).toFixed(2),
    statusLabels[sale.status] ?? sale.status,
    typeLabels[sale.saleType] ?? sale.saleType,
    settlementLabels[sale.settlementStatus] ?? sale.settlementStatus,
    sale.payments
      .map((payment) => `${payment.method} ${Number(payment.amount).toFixed(2)}`)
      .join('; '),
    Number(sale.amountPending).toFixed(2),
  ]);

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dispensaciones_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function DispensationsSkeleton() {
  return <ListSkeleton rows={6} />;
}

export default function DispensationsPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('pos.history.read');
  const dispensationsQuery = useDispensations(canView);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSale, setSelectedSale] = useState<SaleListItem | null>(null);

  const dispensations = useMemo(
    () => dispensationsQuery.data ?? [],
    [dispensationsQuery.data],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return dispensations.filter((sale) => {
      if (statusFilter !== 'all' && sale.status !== statusFilter) return false;
      if (typeFilter !== 'all' && sale.saleType !== typeFilter) return false;

      const saleDate = sale.createdAt?.slice(0, 10) ?? '';
      if (dateFrom && saleDate < dateFrom) return false;
      if (dateTo && saleDate > dateTo) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        memberName(sale),
        sale.member.memberNumber,
        sale.soldBy.name,
        ...sale.items.map((item) => item.productNameSnapshot),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [dateFrom, dateTo, dispensations, query, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const completedToday = dispensations.filter(
      (sale) => sale.status === 'COMPLETED' && sale.createdAt.slice(0, 10) === today,
    );

    return {
      total: dispensations.length,
      todayCount: completedToday.length,
      todayTotal: completedToday.reduce(
        (acc, sale) => acc + Number(sale.total ?? 0),
        0,
      ),
      cancelled: dispensations.filter((sale) => sale.status === 'CANCELLED').length,
    };
  }, [dispensations]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const hasActiveFilters = Boolean(
    query || statusFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo,
  );

  function resetFilters() {
    setQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  }

  if (!canView) {
    return (
      <ProtectedLayout>
        <EmptyState title="No tienes acceso al historial de dispensaciones." />
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <SectionErrorBoundary title="No se pudo cargar el historial de dispensaciones">
        <div className="space-y-6">
          <PageHeader
            title="Historial de dispensaciones"
            description="Consulta dispensaciones, productos entregados, colaborador, pagos y cuentas pendientes."
            action={
              <Button
                variant="outline"
                onClick={() => exportDispensationsCsv(filtered)}
                disabled={filtered.length === 0}
              >
                <Download size={16} />
                Exportar CSV ({filtered.length})
              </Button>
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total registradas"
              value={summary.total}
              icon={<ClipboardList size={18} />}
              tone="blue"
            />
            <StatCard
              title="Hoy"
              value={summary.todayCount}
              icon={<CalendarClock size={18} />}
              tone="green"
            />
            <StatCard
              title="Total hoy"
              value={formatCredits(summary.todayTotal)}
              icon={<ShoppingCart size={18} />}
              tone="green"
            />
            <StatCard
              title="Anuladas"
              value={summary.cancelled}
              icon={<XCircle size={18} />}
              tone="red"
            />
          </div>

          <Card className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5 text-text-muted"
                  size={15}
                />
                <input
                  className="h-10 w-full rounded-lg border border-border-light bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  placeholder="Buscar socio, colaborador o producto"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                />
              </div>

              <select
                className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(0);
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="COMPLETED">Completadas</option>
                <option value="CANCELLED">Anuladas</option>
                <option value="REFUNDED">Devueltas</option>
              </select>

              <select
                className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as TypeFilter);
                  setPage(0);
                }}
              >
                <option value="all">Todos los tipos</option>
                <option value="STANDARD">Estándar</option>
                <option value="CREDIT">A crédito</option>
                <option value="PARTIAL_CREDIT">Crédito parcial</option>
                <option value="SPECIAL">Especial</option>
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(0);
                  }}
                  title="Desde"
                />
                <span className="text-xs text-text-muted">-</span>
                <input
                  type="date"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(0);
                  }}
                  title="Hasta"
                />
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-brand-primary hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : null}
          </Card>

          {dispensationsQuery.isLoading ? <DispensationsSkeleton /> : null}

          {dispensationsQuery.isError ? (
            <ErrorState
              title="No se pudieron cargar las dispensaciones"
              message="Comprueba la conexión e inténtalo de nuevo."
              onRetry={() => dispensationsQuery.refetch()}
            />
          ) : null}

          {!dispensationsQuery.isLoading && !dispensationsQuery.isError ? (
            filtered.length > 0 ? (
              <>
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-bg-soft text-xs font-semibold uppercase tracking-wide text-text-muted hover:bg-bg-soft">
                        <TableHead>Fecha</TableHead>
                        <TableHead>Socio</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead className="text-center">Productos</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Liquidación</TableHead>
                        <TableHead className="text-center">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((sale) => (
                        <TableRow
                          key={sale.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <TableCell className="text-text-secondary">
                            {formatDate(sale.createdAt)}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-text-primary">
                              {memberName(sale)}
                            </p>
                            <p className="text-xs text-text-muted">
                              #{sale.member.memberNumber}
                            </p>
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {sale.soldBy.name}
                          </TableCell>
                          <TableCell className="text-center text-text-secondary">
                            {sale.items.length}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-text-primary">
                            {formatCredits(sale.total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={statusTone(sale.status)}>
                              {statusLabels[sale.status] ?? sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={settlementTone(sale.settlementStatus)}>
                              {settlementLabels[sale.settlementStatus] ??
                                sale.settlementStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-text-muted transition hover:bg-brand-lighter hover:text-brand-primary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedSale(sale);
                              }}
                              aria-label="Ver detalle"
                            >
                              <Eye size={16} />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-muted">
                      {safePage * PAGE_SIZE + 1}-
                      {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de{' '}
                      {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, safePage - 1))}
                        disabled={safePage === 0}
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button variant="outline" size="sm" className="min-w-9">
                        {safePage + 1}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage(Math.min(totalPages - 1, safePage + 1))
                        }
                        disabled={safePage >= totalPages - 1}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <Card className="p-6">
                <EmptyState
                  title="No hay dispensaciones para mostrar"
                  text="Ajusta los filtros o espera nueva actividad."
                />
              </Card>
            )
          ) : null}
        </div>
      </SectionErrorBoundary>

      <DispensationDetailDialog
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </ProtectedLayout>
  );
}

function DispensationsItemTable({ sale }: { sale: SaleListItem }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-light">
      <Table>
        <TableHeader>
          <TableRow className="bg-bg-soft text-xs text-text-muted hover:bg-bg-soft">
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sale.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <span className="font-medium text-text-primary">
                  {item.productNameSnapshot}
                </span>
                {item.scaleToleranceExceeded ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                    <AlertTriangle size={9} />
                    Tolerancia
                  </span>
                ) : null}
                {item.scaleVerified ? (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    <CheckCircle2 size={9} />
                    Verificado
                  </span>
                ) : null}
                {item.actualWeight != null && Number(item.actualWeight) > 0 ? (
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    Peso real: {formatQuantity(item.actualWeight)} g
                    {item.wasteQuantity != null && Number(item.wasteQuantity) > 0
                      ? ` | Merma: ${formatQuantity(Number(item.wasteQuantity) * 1000)} g`
                      : ''}
                  </p>
                ) : null}
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                {formatQuantity(item.quantity)}
              </TableCell>
              <TableCell className="text-right text-text-secondary">
                {formatCredits(item.unitPrice)}
              </TableCell>
              <TableCell className="text-right font-medium text-text-primary">
                {formatCredits(item.total)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DispensationDetailDialog({
  sale,
  onClose,
}: {
  sale: SaleListItem | null;
  onClose: () => void;
}) {
  const { hasPermission } = useAuth();
  const canCancel = hasPermission('pos.cancel');
  const cancelMutation = useCancelSale();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!sale) return null;

  const canBeCancelled = sale.status === 'COMPLETED' && canCancel;

  async function handleCancel() {
    if (!cancelReason.trim() || !sale) return;
    await cancelMutation.mutateAsync({
      id: sale.id,
      reason: cancelReason.trim(),
    });
    setCancelOpen(false);
    setCancelReason('');
    onClose();
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>Dispensación - {memberName(sale)}</span>
              <Badge className={statusTone(sale.status)}>
                {statusLabels[sale.status] ?? sale.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Detalle completo de la operación, productos, pagos y estado de
              liquidación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text-muted">
                  <User size={13} />
                  <span>
                    Colaborador:{' '}
                    <strong className="text-text-primary">{sale.soldBy.name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <CalendarClock size={13} />
                  <span>{formatDate(sale.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <Package size={13} />
                  <span>
                    {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-text-muted">
                  Socio:{' '}
                  <strong className="text-text-primary">{memberName(sale)}</strong>{' '}
                  <span className="text-xs">#{sale.member.memberNumber}</span>
                </div>
                <div>
                  <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                    {typeLabels[sale.saleType] ?? sale.saleType}
                  </Badge>
                </div>
                <div>
                  <Badge className={settlementTone(sale.settlementStatus)}>
                    {settlementLabels[sale.settlementStatus] ??
                      sale.settlementStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Productos dispensados
              </h4>
              <DispensationsItemTable sale={sale} />
            </div>

            {sale.payments.length > 0 ? (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Aportaciones
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sale.payments.map((payment) => (
                    <span
                      key={payment.id}
                      className="rounded-full border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      {payment.method}: {formatCredits(payment.amount)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-light bg-bg-soft p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-text-muted">
                  Subtotal:{' '}
                  <strong className="text-text-primary">
                    {formatCredits(sale.subtotal)}
                  </strong>
                </span>
                {Number(sale.discount) > 0 ? (
                  <span className="text-text-muted">
                    Descuento:{' '}
                    <strong className="text-amber-700">
                      -{formatCredits(sale.discount)}
                    </strong>
                  </span>
                ) : null}
                {Number(sale.amountPending) > 0 ? (
                  <span className="text-text-muted">
                    Pendiente:{' '}
                    <strong className="text-amber-700">
                      {formatCredits(sale.amountPending)}
                    </strong>
                  </span>
                ) : null}
              </div>
              <span className="text-xl font-bold text-text-primary">
                {formatCredits(sale.total)}
              </span>
            </div>

            {sale.creditReason ? (
              <p className="text-sm text-text-muted">
                <strong>Motivo de crédito:</strong> {sale.creditReason}
              </p>
            ) : null}

            {sale.cancelReason ? (
              <p className="text-sm text-red-600">
                <strong>Motivo de anulación:</strong> {sale.cancelReason}
                {sale.cancelledAt ? (
                  <span className="ml-2 text-text-muted">
                    ({formatDate(sale.cancelledAt)})
                  </span>
                ) : null}
              </p>
            ) : null}

            {sale.receivable ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-medium text-amber-800">Cuenta pendiente</p>
                <p className="mt-1 text-amber-700">
                  Pendiente: {formatCredits(sale.receivable.outstandingAmount)} |
                  Estado: {settlementLabels[sale.receivable.status] ?? sale.receivable.status}
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  import('@/app/pos/components/sale-receipt-modal').then(({ printSaleReceipt }) => {
                    printSaleReceipt(sale as unknown as import('@/lib/types').SaleResponse, sale.soldBy?.name);
                  });
                }}
              >
                <Printer size={14} />
                Imprimir comprobante
              </Button>
              {canBeCancelled ? (
                <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                  <XCircle size={14} />
                  Anular dispensacion
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anular dispensación</DialogTitle>
            <DialogDescription>
              Se devolverá el stock, se corregirá la caja y se cancelará la
              cuenta pendiente asociada, si existe.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Motivo de la anulación"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Volver
            </Button>
            <Button
              variant="danger"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={handleCancel}
            >
              {cancelMutation.isPending ? 'Anulando...' : 'Confirmar anulación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
