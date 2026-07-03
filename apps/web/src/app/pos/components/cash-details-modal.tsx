'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { SignaturePad } from '@/components/ui/signature-pad';
import { formatCurrency, formatDate } from '@/lib/format';
import { printCashCloseReport } from '@/lib/report-pdf';
import type { PosSession } from '@/lib/types';
import { getSessionMetrics } from './pos-metrics';

type CashDetailsModalProps = {
  open: boolean;
  session: PosSession | null;
  result: PosSession | null;
  closing: boolean;
  error: string | null;
  onClose: () => void;
  onCloseCash: (closingCash: number, signature?: string, reason?: string) => Promise<void>;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function CashDetailsModal({
  open,
  session,
  result,
  closing,
  error,
  onClose,
  onCloseCash,
}: CashDetailsModalProps) {
  const [closingCash, setClosingCash] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [discrepancyReason, setDiscrepancyReason] = useState('');

  useEffect(() => {
    setIsVisible(open);

    if (!open) {
      setClosingCash('');
      setIsClosing(false);
      setReviewMode(false);
      setLocalError(null);
      setSignature(null);
      setDiscrepancyReason('');
    }
  }, [open]);

  const activeSession = session ?? result;
  const metrics = useMemo(() => getSessionMetrics(activeSession), [activeSession]);

  const estimatedCash = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    if (result?.expectedCash !== undefined && result?.expectedCash !== null) {
      return toNumber(result.expectedCash);
    }

    return metrics.expectedCash;
  }, [activeSession, result?.expectedCash, metrics.expectedCash]);

  const difference = closingCash === '' ? null : roundMoney(toNumber(closingCash) - estimatedCash);

  if (!activeSession) {
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (closingCash === '' || Number(closingCash) < 0) {
      setLocalError('Introduce el efectivo contado para cerrar la caja.');
      return;
    }

    if (!reviewMode) {
      setReviewMode(true);
      return;
    }

    if (!signature) {
      setLocalError('Firma requerida para confirmar el cierre.');
      return;
    }

    setIsClosing(true);

    try {
      await onCloseCash(
        Number(closingCash),
        signature ?? undefined,
        discrepancyReason.trim() || undefined,
      );
    } finally {
      setIsClosing(false);
    }
  }

  if (result) {
    const finalDifference = toNumber(result.difference);
    const isBalanced = finalDifference === 0;
    const isOverage = finalDifference > 0;

    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Caja cerrada"
        description="Resumen del cierre de caja"
        size="md"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => printCashCloseReport(result as Parameters<typeof printCashCloseReport>[0])}>Imprimir</Button>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        }
      >
        <div className={`space-y-4 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className={`rounded-lg p-4 text-center transition-all duration-500 ${
              isBalanced
                ? 'border border-amber-200 bg-amber-50'
                : isOverage
                  ? 'border border-amber-200 bg-amber-50'
                  : 'border border-red-200 bg-red-50'
            }`}
          >
            <p
              className={`text-sm font-bold transition-all ${
                isBalanced ? 'text-amber-700' : isOverage ? 'text-amber-700' : 'text-red-700'
              }`}
            >
              {isBalanced
                ? 'Caja cuadrada correctamente'
                : isOverage
                  ? 'Sobrante de caja'
                  : 'Faltante de caja'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Inicial', value: result.openingCash, color: 'text-text-primary' },
              { label: 'Contado', value: result.closingCash, color: 'text-text-primary' },
              { label: 'Esperado', value: result.expectedCash, color: 'text-brand-primary' },
              {
                label: 'Diferencia',
                value: result.difference,
                color: isBalanced ? 'text-text-primary' : isOverage ? 'text-amber-600' : 'text-red-600',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border-light bg-bg-soft p-3">
                <p className="text-xs uppercase tracking-wide text-text-muted">{item.label}</p>
                <p className={`mt-2 text-lg font-bold sm:text-xl ${item.color}`}>{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border-light p-3 text-sm">
            <p className="mb-3 font-semibold text-text-primary">Sesión registrada</p>

            <div className="space-y-2 text-text-secondary">
              <div className="flex items-center justify-between gap-4">
                <span>Abierta:</span>
                <span className="text-right font-medium">{formatDate(result.openedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Cerrada:</span>
                <span className="text-right font-medium">
                  {result.closedAt ? formatDate(result.closedAt) : 'Sin cierre'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Duración:</span>
                <span className="font-medium">
                  {result.closedAt && result.openedAt
                    ? Math.round((new Date(result.closedAt).getTime() - new Date(result.openedAt).getTime()) / 60000)
                    : 0}{' '}
                  min
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Operaciones:</span>
                <span className="font-medium">{result.sales?.length ?? 0}</span>
              </div>
            </div>
          </div>

          {result.closingSignature ? (
            <div className="rounded-lg border border-border-light p-3">
              <p className="mb-2 text-xs font-medium text-text-muted">Firma del cierre</p>
              <Image
                src={result.closingSignature}
                alt="Firma de cierre"
                width={320}
                height={64}
                unoptimized
                className="mx-auto max-h-16 w-auto opacity-80"
              />
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isClosing ? 'Cerrar caja' : 'Detalles de caja'}
      description={isClosing ? 'Verifica antes de confirmar' : 'Estado actual de la sesión'}
      size="md"
      actions={
        <div className="flex gap-3">
          {!isClosing ? (
            <Button
              onClick={() => {
                setIsClosing(true);
                setReviewMode(false);
                setClosingCash('');
                setLocalError(null);
              }}
            >
              Cerrar caja
            </Button>
          ) : !reviewMode ? (
            <>
              <Button type="submit" form="close-cash-form" disabled={closing}>
                Revisar cierre
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLocalError(null);
                  setIsClosing(false);
                }}
              >
                Cancelar
              </Button>
            </>
          ) : difference === 0 ? (
            <>
              <Button type="submit" form="close-cash-form" disabled={closing}>
                {closing ? 'Cerrando...' : 'Cerrar caja'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setReviewMode(false)}>
                Corregir importe
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReviewMode(false);
                  setLocalError(null);
                }}
              >
                Corregir importe
              </Button>
              <Button type="submit" form="close-cash-form" disabled={closing} variant="danger">
                {closing ? 'Cerrando...' : 'Cerrar con descuadre'}
              </Button>
            </>
          )}
        </div>
      }
    >
      {!isClosing ? (
        <div className={`space-y-4 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Inicial', value: activeSession.openingCash, color: 'text-text-primary' },
              { label: 'Dispensado', value: metrics.totalSold, color: 'text-status-success' },
              { label: 'Esperado', value: estimatedCash, color: 'text-brand-primary' },
              { label: 'Operaciones', value: metrics.salesCount, isCount: true, color: 'text-text-primary' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border-light bg-bg-soft p-3">
                <p className="text-xs uppercase tracking-wide text-text-muted">{item.label}</p>
                <p className={`mt-2 text-lg font-bold sm:text-xl ${item.color}`}>
                  {'isCount' in item ? item.value : formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border-light p-3 text-sm">
            <p className="mb-2 font-semibold text-text-primary">Información de sesión</p>
            <div className="grid gap-1 text-text-secondary">
              <span>Abierta: {formatDate(activeSession.openedAt)}</span>
              <span>ID: {activeSession.id.slice(0, 12)}...</span>
              <span>Media por dispensación: {formatCurrency(metrics.averageTicket)}</span>
            </div>
          </div>

          {activeSession.sales?.length ? (
            <div className="rounded-lg border border-border-light p-3">
              <p className="mb-2 text-sm font-semibold text-text-primary">Últimas dispensaciones</p>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {activeSession.sales.map((sale) => (
                  <div key={sale.id} className="flex justify-between text-xs">
                    <span className="text-text-secondary">#{sale.id.slice(0, 8)}</span>
                    <span className="font-medium text-text-primary">{formatCurrency(sale.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <form
          id="close-cash-form"
          onSubmit={submit}
          className={`space-y-4 transition-all duration-500 ${isVisible && isClosing ? 'opacity-100' : 'opacity-0'}`}
          noValidate
        >
          {!reviewMode ? (
            <>
              <div className="rounded-lg border border-border-light bg-bg-soft p-3">
                <p className="text-sm font-semibold text-text-primary">¿Cuánto dinero hay en caja?</p>
                <p className="mt-1 text-xs text-text-muted">Introduce el efectivo contado físicamente en caja.</p>
              </div>
              <Field
                label="Efectivo contado"
                type="number"
                min="0"
                step="0.01"
                value={closingCash}
                onChange={(event) => setClosingCash(event.target.value)}
                error={localError || error || undefined}
              />
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border-light bg-bg-soft p-3 text-sm">
                <p className="font-semibold text-text-primary">Revisión del cierre</p>
                <p className="mt-1 text-text-secondary">Comprueba el importe y firma para confirmar.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border-light bg-white p-3">
                  <p className="text-xs text-text-muted">Esperado</p>
                  <p className="mt-1 font-semibold text-text-primary">{formatCurrency(estimatedCash)}</p>
                </div>
                <div className="rounded-lg border border-border-light bg-white p-3">
                  <p className="text-xs text-text-muted">Contado</p>
                  <p className="mt-1 font-semibold text-text-primary">{formatCurrency(closingCash)}</p>
                </div>
                <div className={`rounded-lg border p-3 ${difference !== null && difference !== 0 ? 'border-amber-200 bg-amber-50' : 'border-border-light bg-white'}`}>
                  <p className="text-xs text-text-muted">Diferencia</p>
                  <p className={`mt-1 font-semibold ${difference !== null && difference !== 0 ? (difference > 0 ? 'text-amber-700' : 'text-red-700') : 'text-text-primary'}`}>{formatCurrency(difference)}</p>
                </div>
              </div>
              {difference !== null && difference !== 0 ? (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Motivo del descuadre</label>
                  <textarea
                    value={discrepancyReason}
                    onChange={(e) => setDiscrepancyReason(e.target.value)}
                    placeholder="Explica brevemente el motivo de la diferencia..."
                    rows={2}
                    className="w-full rounded-lg border border-border-light px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              ) : null}
              <SignaturePad onSignatureChange={setSignature} />
              {localError || error ? (
                <p className="text-sm text-red-700">{localError || error}</p>
              ) : null}
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
