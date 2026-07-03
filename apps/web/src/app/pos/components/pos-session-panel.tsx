'use client';

import { FormEvent, useState } from 'react';
import { Banknote, Clock, Hash, Lock, Power, ReceiptText, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { formatCurrency, formatDate } from '@/lib/format';
import type { PosSession } from '@/lib/types';
import { getSessionMetrics } from './pos-metrics';

type PosSessionPanelProps = {
  session: PosSession | null;
  loading: boolean;
  error: string | null;
  onOpenSession: (openingCash: number) => Promise<void>;
  onRequestClose: () => void;
};

export function PosSessionPanel({
  session,
  loading,
  error,
  onOpenSession,
  onRequestClose,
}: PosSessionPanelProps) {
  const [openingCash, setOpeningCash] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onOpenSession(Number(openingCash));
    } finally {
      setSubmitting(false);
    }
  }

  const metrics = getSessionMetrics(session);

  return (
    <Card className="h-fit p-3 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-lighter text-brand-primary">
          {session ? <Unlock size={17} /> : <Lock size={17} />}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Caja
          </p>
          <h3 className="font-semibold text-text-primary">
            {session ? <Badge variant="success">ABIERTA</Badge> : <Badge variant="danger">CERRADA</Badge>}
          </h3>
        </div>
      </div>

      {loading ? <p className="py-4 text-sm text-text-muted">Consultando caja...</p> : null}

      {session ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-100 bg-brand-lighter p-3">
            <p className="text-xs font-medium text-text-secondary">Efectivo esperado ahora</p>
            <p className="mt-1 text-2xl font-bold text-brand-primary">{formatCurrency(metrics.expectedCash)}</p>
            <p className="mt-1 text-[11px] leading-4 text-[#15140F]">
              Estimación según registros de aportación en efectivo.
            </p>
            {!metrics.hasPaymentDetails ? (
              <p className="mt-1 text-[11px] text-amber-700">Se confirmará al cerrar caja.</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-sm">
            <div className="rounded-lg bg-bg-soft p-2">
              <p className="text-xs text-text-muted">Inicial</p>
              <p className="font-semibold text-text-primary">{formatCurrency(metrics.openingCash)}</p>
            </div>
            <div className="rounded-lg bg-bg-soft p-2">
              <p className="text-xs text-text-muted">Total registrado</p>
              <p className="font-semibold text-text-primary">{formatCurrency(metrics.totalSold)}</p>
            </div>
            <div className="rounded-lg bg-bg-soft p-2">
              <p className="text-xs text-text-muted">Efectivo</p>
              <p className="font-semibold text-text-primary">{formatCurrency(metrics.cashSales)}</p>
            </div>
            <div className="rounded-lg bg-bg-soft p-2">
              <p className="text-xs text-text-muted">Operaciones</p>
              <p className="font-semibold text-text-primary">{metrics.salesCount}</p>
            </div>
          </div>

          <div className="grid gap-1.5 text-xs">
            <div className="flex items-center gap-2 rounded-lg bg-bg-soft p-2">
              <Hash size={15} className="text-text-muted" />
              <span className="text-text-muted">Sesión</span>
              <span className="ml-auto font-mono text-text-primary">{session.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-bg-soft p-2">
              <Clock size={15} className="text-text-muted" />
              <span className="text-text-muted">Apertura</span>
              <span className="ml-auto text-right text-text-primary">{formatDate(session.openedAt)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-bg-soft p-2">
              <ReceiptText size={15} className="text-text-muted" />
              <span className="text-text-muted">Media por dispensación</span>
              <span className="ml-auto font-semibold text-text-primary">{formatCurrency(metrics.averageTicket)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border-light p-2">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-medium text-text-primary">Últimas dispensaciones</p>
              <Badge size="sm">{session.sales?.length ?? 0}</Badge>
            </div>
            <div className="max-h-24 space-y-1 overflow-y-auto">
              {session.sales?.length ? (
                session.sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">#{sale.id.slice(0, 8)}</span>
                    <span className="font-semibold text-brand-primary">{formatCurrency(sale.total)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">Sin dispensaciones en esta sesión.</p>
              )}
            </div>
            <p className="mt-3 border-t border-border-light pt-3 text-sm font-semibold text-text-primary">
              Total registrado: {formatCurrency(metrics.totalSold)}
            </p>
          </div>

          <Button variant="danger" className="w-full" size="sm" onClick={onRequestClose}>
            <Power size={16} className="mr-2" />
            Cerrar caja
          </Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Field
            label="Efectivo inicial"
            type="number"
            min="0"
            step="0.01"
            value={openingCash}
            onChange={(event) => setOpeningCash(event.target.value)}
            required
          />
          {error ? (
            <div className="rounded-lg border border-status-warning/20 bg-amber-50 p-3">
              <p className="text-sm text-status-warning">{error}</p>
            </div>
          ) : null}
          <Button type="submit" className="w-full" size="md" disabled={loading || submitting}>
            <Banknote size={16} className="mr-2" />
            {submitting ? 'Abriendo...' : 'Abrir caja'}
          </Button>
        </form>
      )}
    </Card>
  );
}
