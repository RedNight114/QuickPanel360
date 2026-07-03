'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { formatCurrency } from '@/lib/format';
import type { InventoryItem } from '@/lib/types';
import { gramsToKg, isKgProduct, kgToGrams } from '@/lib/weight';
import { quantityLabel, toNumber } from './inventory-utils';

export type StockActionMode = 'add' | 'adjust' | 'waste';

const wasteReasons = [
  'Pérdida por manipulación',
  'Diferencia de pesaje',
  'Producto dañado',
  'Muestra interna',
  'Corrección de recuento',
  'Otro',
];

export type StockActionPayload = {
  quantity?: number;
  quantityKg?: number;
  quantityGrams?: number;
  reason?: string;
  notes?: string;
  unitCost?: number;
  batchCode?: string;
};

export function StockActionModal({
  open,
  mode,
  item,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: StockActionMode;
  item: InventoryItem | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: StockActionPayload) => Promise<void>;
}) {
  // Input is always in GRAMS for KG products, raw units otherwise
  const [quantityStr, setQuantityStr] = useState('0');
  const [unitCost, setUnitCost] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isKg = isKgProduct(item?.product?.unitType);
  const currentKg = toNumber(item?.currentQuantity);
  const currentGrams = isKg ? kgToGrams(currentKg) : currentKg;

  useEffect(() => {
    if (open) {
      setQuantityStr(mode === 'adjust' ? String(currentGrams) : '0');
      setUnitCost('');
      setBatchCode('');
      setReason(mode === 'add' ? 'Entrada de inventario' : '');
      setNotes('');
      setLocalError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.productId, mode, open]);

  const inputGrams = toNumber(quantityStr);
  // Internal quantity always in kg for KG products (what the DB stores)
  const quantityKg = isKg ? gramsToKg(inputGrams) : 0;
  const quantityValue = isKg ? quantityKg : inputGrams;

  const unitCostValue = unitCost ? toNumber(unitCost) : undefined;

  const nextKg =
    mode === 'adjust' ? quantityValue : mode === 'waste' ? currentKg - quantityValue : currentKg + quantityValue;

  // difference in kg (for internal logic), shown via quantityLabel which now always returns grams
  const difference = useMemo(
    () =>
      mode === 'adjust' ? quantityValue - currentKg : mode === 'waste' ? -quantityValue : quantityValue,
    [currentKg, mode, quantityValue],
  );

  const totalCost = unitCostValue === undefined ? null : unitCostValue * quantityValue;
  const largeAdjustment =
    mode === 'adjust' && Math.abs(difference) >= Math.max(isKg ? gramsToKg(100) : 10, currentKg * 0.5);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (quantityValue < 0 || (mode !== 'adjust' && quantityValue <= 0)) {
      setLocalError('Introduce una cantidad válida.');
      return;
    }

    if ((mode === 'adjust' || mode === 'waste') && !reason.trim()) {
      setLocalError('El motivo es obligatorio.');
      return;
    }

    if (mode === 'waste' && quantityValue > currentKg) {
      setLocalError('La merma no puede superar el stock actual.');
      return;
    }

    await onSubmit({
      // Omit 'quantity' for KG products to avoid API @Min(0.001) rejecting sub-gram values
      quantity: isKg ? undefined : quantityValue,
      quantityKg: isKg ? quantityValue : undefined,
      quantityGrams: isKg ? inputGrams : undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      unitCost: unitCostValue,
      batchCode: batchCode.trim() || undefined,
    });
  }

  if (!item) return null;

  const title =
    mode === 'add' ? 'Añadir stock' : mode === 'adjust' ? 'Ajustar inventario' : 'Registrar merma';

  const fieldLabel = isKg
    ? mode === 'add'
      ? 'Cantidad a añadir (g)'
      : mode === 'adjust'
        ? 'Nueva cantidad exacta (g)'
        : 'Cantidad perdida (g)'
    : mode === 'add'
      ? 'Cantidad a añadir'
      : mode === 'adjust'
        ? 'Nueva cantidad exacta'
        : 'Cantidad perdida';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{item.product?.name ?? item.productId}</DialogDescription>
        </DialogHeader>

        <form id="stock-action-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="rounded-lg border border-border-light bg-bg-soft p-3 text-sm">
            <p className="font-semibold text-text-primary">
              Inventario disponible:{' '}
              <span className="text-brand-primary">
                {quantityLabel(item.currentQuantity, item.product?.unitType)}
              </span>
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {mode === 'add'
                ? 'Esta acción aumentará el stock disponible y quedará registrada en auditoría.'
                : mode === 'adjust'
                  ? 'Usa ajustes solo para recuentos físicos o correcciones.'
                  : 'La merma reducirá el stock disponible y quedará registrada.'}
            </p>
          </div>

          <Field
            label={fieldLabel}
            type="number"
            min="0"
            step={isKg ? '0.001' : '0.000001'}
            value={quantityStr}
            onChange={(event) => setQuantityStr(event.target.value)}
          />

          {mode === 'add' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Coste interno unitario (opcional)"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
              />
              <Field
                label="Lote / código (opcional)"
                value={batchCode}
                onChange={(event) => setBatchCode(event.target.value)}
              />
            </div>
          ) : null}

          {mode === 'waste' ? (
            <label className="grid gap-1.5 text-sm font-medium text-text-primary">
              Motivo
              <select
                className="h-11 rounded-lg border border-border-light bg-white px-3 text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                <option value="">Seleccionar motivo</option>
                {wasteReasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          ) : (
            <Field
              label="Motivo"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={mode === 'add' ? 'Entrada de inventario' : 'Recuento físico'}
            />
          )}

          <Field
            label="Notas"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Detalle opcional"
          />

          {/* Preview current → new — quantityLabel now always returns grams for KG products */}
          <div className="rounded-lg border border-border-light bg-white p-3 text-sm">
            <p className="text-text-secondary">
              {quantityLabel(currentKg, item.product?.unitType)}
              {' → '}
              {quantityLabel(Math.max(0, nextKg), item.product?.unitType)}
            </p>
            <p className={`mt-1 font-semibold ${difference < 0 ? 'text-red-700' : 'text-[#15140F]'}`}>
              Diferencia: {difference >= 0 ? '+' : ''}
              {quantityLabel(difference, item.product?.unitType)}
            </p>
            {totalCost !== null ? (
              <p className="mt-1 text-xs text-text-muted">
                Coste interno total: {formatCurrency(totalCost)}
              </p>
            ) : null}
          </div>

          {largeAdjustment ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Este ajuste modifica significativamente el inventario.
            </div>
          ) : null}

          {localError || error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {localError ?? error}
            </div>
          ) : null}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="stock-action-form" disabled={saving}>
            {saving ? 'Guardando...' : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
