'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import type { PosSession } from '@/lib/types';
import { getSessionMetrics } from './pos-metrics';

type CloseCashModalProps = {
  session: PosSession;
  result: PosSession | null;
  error: string | null;
  closing: boolean;
  onClose: () => void;
  onConfirm: (closingCash: number) => Promise<void>;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function CloseCashModal({
  session,
  result,
  error,
  closing,
  onClose,
  onConfirm,
}: CloseCashModalProps) {
  const [closingCash, setClosingCash] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const metrics = useMemo(() => getSessionMetrics(session), [session]);
  const estimatedCash = metrics.expectedCash;
  const difference =
    closingCash === '' ? null : roundMoney(toNumber(closingCash) - estimatedCash);

  async function submit() {
    setLocalError(null);

    if (closingCash === '' || Number(closingCash) < 0) {
      setLocalError('Introduce un cierre de caja válido.');
      return;
    }

    await onConfirm(Number(closingCash));
  }

  const finalDifference = result ? toNumber(result.difference) : null;

  if (result) {
    return (
      <Modal
        open={true}
        onClose={onClose}
        title="Caja cerrada"
        description="Cierre de caja completado"
        size="lg"
        closeButton={true}
        actions={<Button onClick={onClose}>Cerrar</Button>}
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border-light bg-bg-soft p-4">
              <p className="text-xs text-text-muted uppercase tracking-wide">Efectivo inicial</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {formatCurrency(result.openingCash)}
              </p>
            </div>
            <div className="rounded-lg border border-border-light bg-bg-soft p-4">
              <p className="text-xs text-text-muted uppercase tracking-wide">Efectivo contado</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {formatCurrency(result.closingCash)}
              </p>
            </div>
            <div className="rounded-lg border border-border-light bg-bg-soft p-4">
              <p className="text-xs text-text-muted uppercase tracking-wide">Efectivo esperado</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {formatCurrency(result.expectedCash)}
              </p>
            </div>
            <div className="rounded-lg border border-border-light bg-bg-soft p-4">
              <p className="text-xs text-text-muted uppercase tracking-wide">Estado</p>
              <p className="mt-1">
                <Badge variant={result.status === 'CLOSED' ? 'success' : 'warning'}>
                  {result.status}
                </Badge>
              </p>
            </div>
          </div>

          {/* Result Status */}
          <div
            className={`rounded-lg p-4 border ${
              finalDifference === 0
                ? 'border-amber-200 bg-amber-50'
                : finalDifference && finalDifference > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-200 bg-red-50'
            }`}
          >
            <p className="font-semibold text-text-primary">
              Diferencia: {formatCurrency(result.difference)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {finalDifference === 0
                ? '✓ Caja cuadrada.'
                : finalDifference && finalDifference > 0
                  ? '⚠ Hay sobrante de caja.'
                  : '✗ Hay faltante de caja.'}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Confirmar cierre de caja"
      description="Verifica los datos antes de cerrar"
      size="lg"
      actions={
        <div className="flex gap-3">
          <Button type="button" disabled={closing} onClick={submit}>
            {closing ? 'Cerrando...' : 'Confirmar cierre'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          submit();
        }}
      >
        {/* Current State */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border-light bg-bg-soft p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Efectivo inicial</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {formatCurrency(session.openingCash)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Dispensaciones registradas</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {formatCurrency(metrics.cashSales)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Efectivo esperado</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {formatCurrency(estimatedCash)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Total registrado</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {formatCurrency(metrics.totalSold)}
            </p>
          </div>
          <div className="rounded-lg border border-border-light bg-bg-soft p-4">
            <p className="text-xs text-text-muted uppercase tracking-wide">Número de dispensaciones</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {metrics.salesCount}
            </p>
          </div>
        </div>

        {!metrics.hasPaymentDetails ? (
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            El efectivo esperado es una estimación porque la sesión actual no trae el detalle de aportaciones.
          </p>
        ) : null}

        {/* Recent Sales */}
        <div className="rounded-lg border border-border-light p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-text-primary">Dispensaciones registradas</p>
            <Badge size="sm">{session.sales?.length ?? 0}</Badge>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {session.sales?.length ? (
              session.sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    #{sale.id.slice(0, 8)} · {formatDate(sale.createdAt)}
                  </span>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">Sin dispensaciones recientes.</p>
            )}
          </div>
        </div>

        {/* Closing Amount */}
        <div className="rounded-lg border border-green-100 bg-amber-50 px-3 py-2 text-xs text-[#15140F]">
          El cierre quedará guardado con fecha, usuario y diferencia de caja.
        </div>

        <Field
          label="Efectivo contado"
          type="number"
          min="0"
          step="0.01"
          value={closingCash}
          onChange={(event) => setClosingCash(event.target.value)}
          required
          error={localError ?? error ?? undefined}
        />

        {/* Difference Preview */}
        {difference !== null && (
          <div className="rounded-lg border border-border-light bg-bg-soft p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide">Diferencia en vivo</p>
                <p
                  className={`mt-1 text-lg font-bold ${
                    difference === 0
                      ? 'text-text-primary'
                      : difference > 0
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }`}
                >
                  {formatCurrency(difference)}
                </p>
              </div>
              <Badge
                variant={
                  difference === 0 ? 'success' : difference > 0 ? 'warning' : 'danger'
                }
              >
                {difference === 0
                  ? 'Caja cuadrada'
                  : difference > 0
                    ? 'Sobra dinero'
                    : 'Falta dinero'}
              </Badge>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
