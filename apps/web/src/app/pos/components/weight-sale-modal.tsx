'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
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
import type { Product } from '@/lib/types';
import {
  amountToKg,
  formatPricePerGram,
  formatWeightKg,
  gramsToKg,
  kgToAmount,
  toNumber,
  type AddCartInput,
} from '@/lib/weight';
import { getProductStock } from './pos-metrics';

type WeightSaleMode = 'grams' | 'kg' | 'amount';

const modes: Array<{ value: WeightSaleMode; label: string }> = [
  { value: 'grams', label: 'Gramos' },
  { value: 'kg', label: 'Kg' },
  { value: 'amount', label: 'Créditos' },
];

export function WeightSaleModal({
  product,
  open,
  onClose,
  onAdd,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAdd: (product: Product, input: AddCartInput) => void;
}) {
  const [mode, setMode] = useState<WeightSaleMode>('grams');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode('grams');
      setValue('');
      setError(null);
    }
  }, [open, product?.id]);

  const preview = useMemo(() => {
    if (!product) return null;

    const numericValue = toNumber(value);
    const price = toNumber(product.price);
    const quantityKg =
      mode === 'amount'
        ? amountToKg(numericValue, price)
        : mode === 'grams'
          ? gramsToKg(numericValue)
          : numericValue;
    const amount = mode === 'amount' ? numericValue : kgToAmount(quantityKg, price);

    return {
      amount,
      quantityKg,
      stock: getProductStock(product),
    };
  }, [mode, product, value]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!product || !preview) return;

    const numericValue = toNumber(value);

    if (numericValue <= 0 || preview.quantityKg <= 0) {
      setError('Introduce una cantidad valida.');
      return;
    }

    if (preview.quantityKg > preview.stock) {
      setError(`Stock insuficiente. Disponible: ${formatWeightKg(preview.stock)}.`);
      return;
    }

    onAdd(
      product,
      mode === 'amount'
        ? { amountEuros: preview.amount, pricingMode: 'BY_AMOUNT' }
        : mode === 'grams'
          ? { quantityGrams: numericValue, pricingMode: 'BY_WEIGHT' }
          : { quantityKg: numericValue, pricingMode: 'BY_WEIGHT' },
    );
    onClose();
  }

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispensación por peso</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>

        <form id="weight-sale-form" className="space-y-4" onSubmit={submit} noValidate>
          <div className="flex items-center gap-3 rounded-lg border border-border-light bg-bg-soft p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-lighter text-brand-primary">
              <Scale size={18} />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-text-primary">{formatPricePerGram(product.price)}</p>
              <p className="text-xs text-text-muted">
                Stock disponible: {formatWeightKg(preview?.stock ?? 0)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border-light bg-white p-1">
            {modes.map((saleMode) => (
              <button
                key={saleMode.value}
                type="button"
                className={`h-9 rounded-md text-xs font-semibold transition ${
                  mode === saleMode.value
                    ? 'bg-brand-primary text-white'
                    : 'text-text-secondary hover:bg-bg-soft'
                }`}
                onClick={() => {
                  setMode(saleMode.value);
                  setError(null);
                }}
              >
                {saleMode.label}
              </button>
            ))}
          </div>

          <Field
            label={mode === 'amount' ? 'Créditos' : mode === 'grams' ? 'Cantidad en gramos' : 'Cantidad en kg'}
            type="number"
            inputMode="decimal"
            min="0"
            step={mode === 'amount' ? '0.01' : mode === 'grams' ? '0.001' : '0.000001'}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder={mode === 'amount' ? '10,00' : mode === 'grams' ? '1,5' : '0,0015'}
            error={error ?? undefined}
            autoFocus
          />

          <div className="rounded-lg border border-border-light bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Solicitado</span>
              <strong className="text-text-primary">{formatWeightKg(preview?.quantityKg ?? 0)}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-text-secondary">Total</span>
              <strong className="text-brand-primary">{formatCurrency(preview?.amount ?? 0)}</strong>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="weight-sale-form" className="bg-brand-primary text-white hover:bg-brand-secondary">
            Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
