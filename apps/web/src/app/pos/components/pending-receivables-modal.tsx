'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Receivable } from '@/lib/types';

export type ReceivableCharge = {
  receivable: Receivable;
  amount: number;
};

type PendingReceivablesModalProps = {
  open: boolean;
  receivables: Receivable[];
  selectedCharges: ReceivableCharge[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onApply: (charges: ReceivableCharge[]) => void;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PendingReceivablesModal({
  open,
  receivables,
  selectedCharges,
  loading,
  error,
  onClose,
  onApply,
}: PendingReceivablesModalProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setFormError(null);
    setAmounts(
      Object.fromEntries(
        selectedCharges.map((charge) => [
          charge.receivable.id,
          String(charge.amount),
        ]),
      ),
    );
  }, [open, selectedCharges]);

  const selectedTotal = useMemo(
    () =>
      receivables.reduce((sum, receivable) => {
        const amount = toNumber(amounts[receivable.id]);
        return sum + amount;
      }, 0),
    [amounts, receivables],
  );

  function setFullAmount(receivable: Receivable) {
    setAmounts((current) => ({
      ...current,
      [receivable.id]: String(toNumber(receivable.outstandingAmount)),
    }));
  }

  function clearAmount(receivableId: string) {
    setAmounts((current) => ({
      ...current,
      [receivableId]: '',
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const charges: ReceivableCharge[] = [];

    for (const receivable of receivables) {
      const amount = Math.round(toNumber(amounts[receivable.id]) * 100) / 100;
      const outstanding = toNumber(receivable.outstandingAmount);

      if (amount < 0) {
        setFormError('Los importes no pueden ser negativos.');
        return;
      }

      if (amount > outstanding) {
        setFormError('No puedes registrar más del pendiente de una cuenta.');
        return;
      }

      if (amount > 0) {
        charges.push({ receivable, amount });
      }
    }

    onApply(charges);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cuentas pendientes del socio</DialogTitle>
          <DialogDescription>
            Elige cuántos créditos quieres registrar ahora. Puede ser el total o una aportación parcial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <HandCoins size={18} />
              <span className="text-sm font-semibold">
                Seleccionado: {formatCurrency(selectedTotal)}
              </span>
            </div>
            <Badge variant={receivables.length ? 'warning' : 'success'}>
              {receivables.length} pendientes
            </Badge>
          </div>

          {loading ? (
            <p className="rounded-xl border border-border-light bg-white p-4 shadow-card text-sm text-text-muted">
              Consultando pendientes...
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && receivables.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[#15140F]">
              Este socio no tiene importes pendientes.
            </p>
          ) : null}

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {receivables.map((receivable) => {
              const outstanding = toNumber(receivable.outstandingAmount);
              const current = toNumber(amounts[receivable.id]);

              return (
                <div key={receivable.id} className="rounded-xl border border-border-light bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary">
                        {formatCurrency(outstanding)} pendientes
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
                        {receivable.reason ?? 'Pendiente de aportación'} · {formatDate(receivable.createdAt)}
                      </p>
                    </div>
                    <Badge variant={receivable.status === 'OVERDUE' ? 'danger' : 'warning'}>
                      {receivable.status === 'PAID'
                        ? 'Regularizada'
                        : receivable.status === 'PARTIALLY_PAID'
                          ? 'Parcialmente regularizada'
                          : receivable.status === 'CANCELLED'
                            ? 'Cancelada'
                            : 'Pendiente de aportación'}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <label className="block text-xs font-medium text-text-primary">
                      Créditos a registrar
                      <Input
                        className="mt-1"
                        type="number"
                        min="0"
                        max={outstanding}
                        step="0.01"
                        value={amounts[receivable.id] ?? ''}
                        onChange={(event) =>
                          setAmounts((currentAmounts) => ({
                            ...currentAmounts,
                            [receivable.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <Button type="button" variant="outline" onClick={() => setFullAmount(receivable)}>
                      Registrar resto
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => clearAmount(receivable.id)}>
                      Quitar
                    </Button>
                  </div>

                  {current > 0 ? (
                    <p className="mt-2 text-xs text-text-muted">
                      Pendiente restante: {formatCurrency(Math.max(outstanding - current, 0))}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Añadir al registro de aportación</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
