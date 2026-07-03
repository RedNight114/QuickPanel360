'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { ListSkeleton } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import {
  useCreatePlatformPayment,
  useGenerateMonthlyInvoices,
  usePlatformInvoiceDetail,
  usePlatformInvoices,
  usePlatformPayments,
  useUpdatePlatformInvoice,
} from '@/hooks/usePlatform';
import { getErrorMessage } from '@/lib/errors';
import { formatCredits, formatDate } from '@/lib/format';
import type { PlatformInvoice } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

function invoiceVariant(status: string) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'ISSUED') return 'warning' as const;
  if (status === 'VOID') return 'danger' as const;
  return 'secondary' as const;
}

const invoiceLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Emitida',
  PAID: 'Cobrada',
  VOID: 'Anulada',
};

function byNewest<T extends { paidAt?: string | null; issuedAt?: string | null }>(
  items: T[],
) {
  return items
    .slice()
    .sort(
      (a, b) =>
        new Date(b.paidAt ?? b.issuedAt ?? 0).getTime() -
        new Date(a.paidAt ?? a.issuedAt ?? 0).getTime(),
    );
}

function PlatformBillingContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const allowed = hasRole('SUPERADMIN');
  const [filters, setFilters] = useState(() => ({
    q: searchParams.get('q') ?? '',
    invoiceStatus: searchParams.get('invoiceStatus') ?? 'all',
    paymentStatus: searchParams.get('paymentStatus') ?? 'all',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  }));
  const invoicesQuery = usePlatformInvoices(filters, { enabled: allowed });
  const paymentsQuery = usePlatformPayments(filters, { enabled: allowed });
  const generateInvoices = useGenerateMonthlyInvoices();
  const updateInvoice = useUpdatePlatformInvoice();
  const createPayment = useCreatePlatformPayment();

  const [detailInvoice, setDetailInvoice] = useState<PlatformInvoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<PlatformInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payReference, setPayReference] = useState('');
  const [reactivateSubscription, setReactivateSubscription] = useState(false);
  const [paymentNextRenewalAt, setPaymentNextRenewalAt] = useState('');

  const invoiceDetailQuery = usePlatformInvoiceDetail(detailInvoice?.id);

  useEffect(() => {
    if (!allowed) router.replace('/dashboard');
  }, [allowed, router]);

  useEffect(() => {
    const nextFilters = {
      q: searchParams.get('q') ?? '',
      invoiceStatus: searchParams.get('invoiceStatus') ?? 'all',
      paymentStatus: searchParams.get('paymentStatus') ?? 'all',
      dateFrom: searchParams.get('dateFrom') ?? '',
      dateTo: searchParams.get('dateTo') ?? '',
    };

    setFilters((current) => {
      if (
        current.q === nextFilters.q &&
        current.invoiceStatus === nextFilters.invoiceStatus &&
        current.paymentStatus === nextFilters.paymentStatus &&
        current.dateFrom === nextFilters.dateFrom &&
        current.dateTo === nextFilters.dateTo
      ) {
        return current;
      }

      return nextFilters;
    });
  }, [searchParams]);

  useEffect(() => {
    if (!allowed) return;

    const params = new URLSearchParams(searchParams.toString());

    if (filters.q) params.set('q', filters.q);
    else params.delete('q');

    if (filters.invoiceStatus !== 'all') params.set('invoiceStatus', filters.invoiceStatus);
    else params.delete('invoiceStatus');

    if (filters.paymentStatus !== 'all') params.set('paymentStatus', filters.paymentStatus);
    else params.delete('paymentStatus');

    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    else params.delete('dateFrom');

    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    else params.delete('dateTo');

    const currentQuery = searchParams.toString();
    const nextQuery = params.toString();

    if (currentQuery !== nextQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [allowed, filters, pathname, router, searchParams]);

  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const recentInvoices = useMemo(() => byNewest(invoices).slice(0, 12), [invoices]);
  const recentPayments = useMemo(() => byNewest(payments).slice(0, 12), [payments]);

  const metrics = useMemo(() => {
    const now = new Date();
    const issued = invoices.filter((invoice) => invoice.status === 'ISSUED');
    const overdue = issued.filter(
      (invoice) => invoice.dueAt && new Date(invoice.dueAt) < now,
    );

    return {
      invoicedTotal: invoices
        .filter((invoice) => invoice.status !== 'VOID')
        .reduce((sum, invoice) => sum + Number(invoice.amount), 0),
      paidTotal: payments
        .filter((payment) => payment.status !== 'REFUNDED')
        .reduce((sum, payment) => sum + Number(payment.amount), 0),
      issuedCount: issued.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce(
        (sum, invoice) => sum + Number(invoice.amount),
        0,
      ),
    };
  }, [invoices, payments]);

  if (!allowed) return null;

  function resetFilters() {
    setFilters({
      q: '',
      invoiceStatus: 'all',
      paymentStatus: 'all',
      dateFrom: '',
      dateTo: '',
    });
  }

  function openPaymentModal(invoice: PlatformInvoice) {
    setPaymentInvoice(invoice);
    setPayAmount(String(Number(invoice.amount)));
    setPayMethod('');
    setPayReference(invoice.number);
    setReactivateSubscription(false);
    setPaymentNextRenewalAt('');
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentInvoice?.tenantId) return;

    try {
      await createPayment.mutateAsync({
        tenantId: paymentInvoice.tenantId,
        body: {
          amount: parseFloat(payAmount) || 0,
          invoiceId: paymentInvoice.id,
          method: payMethod.trim() || undefined,
          reference: payReference.trim() || undefined,
          reactivateSubscription,
          nextRenewalAt: reactivateSubscription
            ? paymentNextRenewalAt || undefined
            : undefined,
        },
      });
      toast.success(
        reactivateSubscription
          ? 'Cobro registrado y suscripción reactivada.'
          : 'Cobro registrado correctamente.',
      );
      setPaymentInvoice(null);
      setPayAmount('');
      setPayMethod('');
      setPayReference('');
      setReactivateSubscription(false);
      setPaymentNextRenewalAt('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo registrar el cobro.'));
    }
  }

  async function markInvoicePaid(invoice: PlatformInvoice) {
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        body: { status: 'PAID' },
      });
      toast.success(`Factura ${invoice.number} marcada como cobrada.`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar la factura.'));
    }
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Facturación SaaS"
          description="Vista global de facturas, cobros manuales y seguimiento de deuda por empresa."
          action={(
            <Button
              disabled={generateInvoices.isPending}
              onClick={async () => {
                try {
                  const result = await generateInvoices.mutateAsync();
                  if (result.generated > 0) {
                    toast.success(
                      `${result.generated} factura${result.generated !== 1 ? 's' : ''} generada${result.generated !== 1 ? 's' : ''}.`,
                    );
                  } else {
                    toast.info('Las facturas del mes ya estaban generadas.');
                  }
                } catch (error) {
                  toast.error(
                    getErrorMessage(error, 'No se pudieron generar las facturas del mes.'),
                  );
                }
              }}
            >
              <RefreshCw size={16} />
              {generateInvoices.isPending ? 'Generando...' : 'Generar facturas del mes'}
            </Button>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Facturado" value={formatCredits(metrics.invoicedTotal)} icon={<FileText size={18} />} tone="blue" />
          <StatCard title="Cobrado" value={formatCredits(metrics.paidTotal)} icon={<Wallet size={18} />} tone="green" />
          <StatCard title="Emitidas" value={metrics.issuedCount} icon={<FileText size={18} />} tone="neutral" />
          <StatCard title="Vencidas" value={metrics.overdueCount} icon={<AlertTriangle size={18} />} tone="amber" />
          <StatCard title="Pendiente" value={formatCredits(metrics.overdueAmount)} icon={<AlertTriangle size={18} />} tone="red" />
        </div>

        <Card className="p-4">
          <div className="grid gap-3 xl:grid-cols-[1.4fr_180px_180px_160px_160px_auto] xl:items-center">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-border-light bg-white px-3">
              <Search size={16} className="text-text-muted" />
              <input
                value={filters.q}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, q: event.target.value }))
                }
                placeholder="Buscar por empresa, factura, referencia o método"
                className="h-full flex-1 bg-transparent text-sm outline-none"
              />
            </label>

            <select
              value={filters.invoiceStatus}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  invoiceStatus: event.target.value,
                }))
              }
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="all">Todas las facturas</option>
              <option value="DRAFT">Borrador</option>
              <option value="ISSUED">Emitidas</option>
              <option value="PAID">Cobradas</option>
              <option value="VOID">Anuladas</option>
            </select>

            <select
              value={filters.paymentStatus}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  paymentStatus: event.target.value,
                }))
              }
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="all">Todos los cobros</option>
              <option value="PAID">Pagados</option>
              <option value="REFUNDED">Reembolsados</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
              className="h-10 rounded-lg border border-border-light bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />

            <Button variant="outline" onClick={resetFilters}>
              Limpiar
            </Button>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Facturas recientes</h2>
                <p className="text-sm text-text-muted">Seguimiento global del ciclo de facturación.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/platform/subscriptions">
                  <Plus size={14} />
                  Gestionar suscripciones
                </Link>
              </Button>
            </div>

            {invoicesQuery.isLoading ? <ListSkeleton rows={4} /> : null}

            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{invoice.number}</p>
                    <Badge variant={invoiceVariant(invoice.status)}>
                      {invoiceLabels[invoice.status] ?? invoice.status}
                    </Badge>
                    {invoice.tenant ? (
                      <Link
                        href={`/platform/tenants/${invoice.tenant.id}`}
                        className="text-sm text-brand-primary hover:underline"
                      >
                        {invoice.tenant.name}
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {formatCredits(invoice.amount)}
                    {invoice.description ? ` · ${invoice.description}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Emitida {formatDate(invoice.issuedAt)}
                    {invoice.dueAt ? ` · Vence ${formatDate(invoice.dueAt)}` : ''}
                    {invoice.paidAt ? ` · Cobrada ${formatDate(invoice.paidAt)}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDetailInvoice(invoice)}>
                      <Eye size={14} />
                      Ver detalle
                    </Button>
                    {invoice.status === 'ISSUED' ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openPaymentModal(invoice)}>
                          <Wallet size={14} />
                          Registrar cobro
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateInvoice.isPending}
                          onClick={() => markInvoicePaid(invoice)}
                        >
                          <CheckCircle2 size={14} />
                          Marcar cobrada
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}

              {!recentInvoices.length && !invoicesQuery.isLoading ? (
                <EmptyState title="Sin facturas registradas" text="Todavía no hay facturación global en plataforma." />
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Cobros recientes</h2>
              <p className="text-sm text-text-muted">Registro manual de pagos recibidos en plataforma.</p>
            </div>

            {paymentsQuery.isLoading ? <ListSkeleton rows={4} /> : null}

            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="rounded-xl border border-border-light bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text-primary">{formatCredits(payment.amount)}</p>
                    <Badge variant={payment.status === 'PAID' ? 'success' : 'secondary'}>
                      {payment.status}
                    </Badge>
                    {payment.tenant ? (
                      <Link
                        href={`/platform/tenants/${payment.tenant.id}`}
                        className="text-sm text-brand-primary hover:underline"
                      >
                        {payment.tenant.name}
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {payment.method || 'Sin método'}
                    {payment.reference ? ` · Ref. ${payment.reference}` : ''}
                    {payment.invoice?.number ? ` · Factura ${payment.invoice.number}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Registrado {formatDate(payment.paidAt)}
                  </p>
                </div>
              ))}

              {!recentPayments.length && !paymentsQuery.isLoading ? (
                <EmptyState title="Sin cobros registrados" text="Todavía no hay pagos manuales registrados en plataforma." />
              ) : null}
            </div>
          </Card>
        </div>

        <Modal
          open={Boolean(detailInvoice)}
          onClose={() => setDetailInvoice(null)}
          title={detailInvoice ? `Factura ${detailInvoice.number}` : 'Detalle de factura'}
          description="Detalle completo de la factura y pagos vinculados."
          actions={(
            <Button variant="outline" onClick={() => setDetailInvoice(null)}>
              Cerrar
            </Button>
          )}
        >
          {invoiceDetailQuery.isLoading ? <ListSkeleton rows={3} /> : null}
          {invoiceDetailQuery.data ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-border-light bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={invoiceVariant(invoiceDetailQuery.data.status)}>
                    {invoiceLabels[invoiceDetailQuery.data.status] ?? invoiceDetailQuery.data.status}
                  </Badge>
                  <span className="font-medium text-text-primary">
                    {invoiceDetailQuery.data.tenant.name}
                  </span>
                </div>
                <p className="mt-3 text-text-muted">
                  {invoiceDetailQuery.data.description || 'Sin descripción'}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <p><span className="font-medium text-text-primary">Importe:</span> {formatCredits(invoiceDetailQuery.data.amount)}</p>
                  <p><span className="font-medium text-text-primary">Emitida:</span> {formatDate(invoiceDetailQuery.data.issuedAt)}</p>
                  <p><span className="font-medium text-text-primary">Vence:</span> {formatDate(invoiceDetailQuery.data.dueAt)}</p>
                  <p><span className="font-medium text-text-primary">Cobrada:</span> {formatDate(invoiceDetailQuery.data.paidAt)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-text-primary">Pagos vinculados</h3>
                <div className="mt-2 space-y-2">
                  {invoiceDetailQuery.data.payments.length ? (
                    invoiceDetailQuery.data.payments.map((payment) => (
                      <div key={payment.id} className="rounded-xl border border-border-light bg-bg-soft p-3">
                        <p className="font-medium text-text-primary">{formatCredits(payment.amount)}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {payment.method || 'Sin método'}
                          {payment.reference ? ` · Ref. ${payment.reference}` : ''}
                          {` · ${formatDate(payment.paidAt)}`}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="Sin pagos vinculados" text="Esta factura todavía no tiene cobros asociados." />
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(paymentInvoice)}
          onClose={() => setPaymentInvoice(null)}
          title={paymentInvoice ? `Registrar cobro · ${paymentInvoice.number}` : 'Registrar cobro'}
          description="Registra el cobro manual de esta factura desde la vista global."
          actions={(
            <>
              <Button variant="outline" onClick={() => setPaymentInvoice(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="platform-billing-payment-form"
                disabled={createPayment.isPending || !payAmount}
              >
                {createPayment.isPending ? 'Registrando...' : 'Registrar cobro'}
              </Button>
            </>
          )}
        >
          <form id="platform-billing-payment-form" className="space-y-4" onSubmit={submitPayment}>
            <Field
              label="Importe (CR)"
              type="number"
              min="0"
              step="0.01"
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
              required
              placeholder="0.00"
            />
            <Field
              label="Método"
              value={payMethod}
              onChange={(event) => setPayMethod(event.target.value)}
              placeholder="Transferencia, efectivo, etc."
            />
            <Field
              label="Referencia (opcional)"
              value={payReference}
              onChange={(event) => setPayReference(event.target.value)}
              placeholder="Número de transferencia, recibo, etc."
            />

            <label className="flex items-start gap-3 rounded-xl border border-border-light bg-bg-soft px-3 py-3">
              <input
                type="checkbox"
                checked={reactivateSubscription}
                onChange={(event) => setReactivateSubscription(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border-light text-brand-primary focus:ring-brand-primary"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">Reactivar suscripción con este cobro</p>
                <p className="text-xs text-text-muted">
                  Úsalo cuando el pago deje nuevamente al club activo a nivel SaaS.
                </p>
              </div>
            </label>

            {reactivateSubscription ? (
              <Field
                label="Próxima renovación (opcional)"
                type="date"
                value={paymentNextRenewalAt}
                onChange={(event) => setPaymentNextRenewalAt(event.target.value)}
              />
            ) : null}
          </form>
        </Modal>
      </div>
    </ProtectedLayout>
  );
}

export default function PlatformBillingPage() {
  return (
    <Suspense
      fallback={(
        <ProtectedLayout>
          <div className="space-y-6">
            <PageHeader
              title="Facturación SaaS"
              description="Cargando vista global de facturas y cobros."
            />
            <ListSkeleton rows={6} />
          </div>
        </ProtectedLayout>
      )}
    >
      <PlatformBillingContent />
    </Suspense>
  );
}
