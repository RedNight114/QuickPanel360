'use client';

import { AlertTriangle, Scale, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { formatCurrency } from '@/lib/format';
import type { CartItem, TenantSettings } from '@/lib/types';
import { formatWeightKg, kgToGrams } from '@/lib/weight';
import { getProductStock, toNumber } from './pos-metrics';

type ScaleVerificationModalProps = {
  open: boolean;
  items: CartItem[];
  settings?: TenantSettings;
  canOverride?: boolean;
  onClose: () => void;
  onWeightChange: (productId: string, weightGrams: number) => void;
  onOverrideReasonChange: (productId: string, reason: string) => void;
  onConfirm: () => void;
};

function roundGrams(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function ScaleVerificationModal({
  open,
  items,
  settings,
  canOverride = false,
  onClose,
  onWeightChange,
  onOverrideReasonChange,
  onConfirm,
}: ScaleVerificationModalProps) {
  if (!open) return null;

  const maxWasteGrams = settings?.maxWastePerLineGrams ?? 0.05;
  const maxWastePercent = settings?.maxWastePercent ?? 5;
  const allowUnderWeight = Boolean(settings?.allowUnderWeight);
  const action = settings?.scaleToleranceAction ?? 'BLOCK';

  const validations = items.map((item) => {
    const requestedGrams = kgToGrams(item.quantity);
    const actualGrams = item.actualWeightGrams ?? 0;
    const diff = roundGrams(actualGrams - requestedGrams);
    const maxAllowed = Math.max(maxWasteGrams, requestedGrams * (maxWastePercent / 100));
    const missing = actualGrams <= 0;
    const under = diff < 0;
    const exceeded = diff > maxAllowed;
    const stockExceeded = actualGrams > kgToGrams(getProductStock(item.product));

    return { item, requestedGrams, actualGrams, diff, missing, under, exceeded, stockExceeded };
  });

  const blocked = validations.some((entry) => {
    const requiresOverride = entry.exceeded && action === 'REQUIRE_MANAGER_CONFIRMATION';
    return (
      entry.missing ||
      entry.stockExceeded ||
      (entry.under && !allowUnderWeight) ||
      (entry.exceeded && action === 'BLOCK') ||
      (requiresOverride && (!canOverride || !entry.item.scaleOverrideReason?.trim()))
    );
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 sm:place-items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border-light bg-white shadow-xl sm:max-w-3xl sm:rounded-2xl">
        <div className="overflow-y-auto p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-lighter text-brand-primary">
                <Scale size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Verificar peso real dispensado</h2>
                <p className="text-sm text-text-muted">
                  El socio aporta sobre lo solicitado y el inventario descuenta lo pesado.
                </p>
              </div>
            </div>
            <button className="rounded-lg p-2 text-text-muted hover:bg-bg-soft" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {validations.map(({ item, requestedGrams, actualGrams, diff, missing, under, exceeded, stockExceeded }) => {
              const status =
                missing
                  ? 'Peso pendiente'
                  : stockExceeded
                    ? 'Supera stock'
                    : under
                      ? allowUnderWeight
                        ? 'Peso inferior permitido'
                        : 'Peso inferior bloqueado'
                      : exceeded
                        ? action === 'ALLOW_WITH_WARNING'
                          ? 'Diferencia positiva supera límite'
                          : action === 'REQUIRE_MANAGER_CONFIRMATION'
                            ? canOverride
                              ? 'Requiere motivo'
                              : 'Requiere manager'
                            : 'Diferencia positiva bloqueada'
                        : diff > 0
                          ? 'Diferencia positiva ✓'
                          : 'Correcto';

              const blockedByTolerance =
                exceeded &&
                (action === 'BLOCK' ||
                  (action === 'REQUIRE_MANAGER_CONFIRMATION' &&
                    (!canOverride || !item.scaleOverrideReason?.trim())));

              const tone =
                missing || stockExceeded || (under && !allowUnderWeight) || blockedByTolerance
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : exceeded || under
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-amber-200 bg-amber-50 text-[#15140F]';

              return (
                <div key={item.product.id} className="rounded-xl border border-border-light bg-bg-soft p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-text-primary">{item.product.name}</p>
                      <p className="text-xs text-text-muted">
                        Solicitado: {requestedGrams.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g
                        {' · '}
                        Total: {formatCurrency(item.total ?? 0)}
                        {' · '}
                        Stock: {formatWeightKg(getProductStock(item.product))}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <Field
                      label="Peso real dispensado (g)"
                      type="number"
                      min="0.001"
                      step={String(settings?.scalePrecisionGrams ?? 0.01)}
                      value={actualGrams || ''}
                      onChange={(event) => onWeightChange(item.product.id, toNumber(event.target.value))}
                      placeholder="1,02"
                    />
                    <div className="rounded-lg border border-border-light bg-white px-3 py-2 text-sm">
                      <p className="text-xs text-text-muted">Diferencia registrada</p>
                      <p className={diff === 0 ? 'font-semibold text-[#15140F]' : 'font-semibold text-amber-700'}>
                        {missing ? '-' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g`}
                      </p>
                    </div>
                  </div>
                  {exceeded && action === 'REQUIRE_MANAGER_CONFIRMATION' ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <Field
                        label="Motivo de autorización"
                        value={item.scaleOverrideReason ?? ''}
                        onChange={(event) => onOverrideReasonChange(item.product.id, event.target.value)}
                        placeholder={
                          canOverride
                            ? 'Ej. Diferencia validada por responsable'
                            : 'Necesitas permiso de responsable'
                        }
                        disabled={!canOverride}
                        error={
                          canOverride && !item.scaleOverrideReason?.trim()
                            ? 'Indica un motivo para autorizar esta merma.'
                            : undefined
                        }
                      />
                      {!canOverride ? (
                        <p className="mt-2 text-xs text-amber-700">
                          Tu usuario no tiene permiso para autorizar tolerancias de báscula.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {blocked ? (
            <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>Revisa los pesos antes de continuar. El backend volverá a validar stock, tolerancia y peso inferior.</p>
            </div>
          ) : null}
        </div>
        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border-light bg-white p-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Volver a la selección</Button>
          <Button className="bg-brand-primary text-white hover:bg-brand-secondary" onClick={onConfirm} disabled={blocked}>Confirmar pesos</Button>
        </div>
      </div>
    </div>
  );
}
