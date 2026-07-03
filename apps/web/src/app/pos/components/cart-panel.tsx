'use client';

import { CreditCard, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { HelpTip } from '@/components/help/help-tip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { formatCurrency } from '@/lib/format';
import type { CartItem } from '@/lib/types';
import { formatPricePerGram, formatWeightKg, isKgProduct, kgToGrams, gramsToKg } from '@/lib/weight';
import type { ReceivableCharge } from './pending-receivables-modal';

type CartPanelProps = {
  cart: CartItem[];
  receivableItems?: ReceivableCharge[];
  selectedMemberName: string | null;
  selectedMemberStatus?: string | null;
  hasOpenSession: boolean;
  discount: string;
  paymentAmount: string;
  creditReason: string;
  dueDate: string;
  subtotal: number;
  receivablesTotal?: number;
  total: number;
  allowCreditSales?: boolean;
  message: string | null;
  error: string | null;
  submitting: boolean;
  onDiscountChange: (value: string) => void;
  onPaymentAmountChange: (value: string) => void;
  onCreditReasonChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onRemoveReceivable?: (receivableId: string) => void;
  onCheckout: () => void;
  hasPendingScaleVerification?: boolean;
};

function getStock(item: CartItem) {
  return Number(item.product.inventory?.currentQuantity ?? 0);
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CartPanel({
  cart,
  receivableItems = [],
  selectedMemberName,
  selectedMemberStatus,
  hasOpenSession,
  discount,
  paymentAmount,
  creditReason,
  dueDate,
  subtotal,
  receivablesTotal = 0,
  total,
  allowCreditSales = true,
  message,
  error,
  submitting,
  onDiscountChange,
  onPaymentAmountChange,
  onCreditReasonChange,
  onDueDateChange,
  onQuantityChange,
  onRemoveItem,
  onRemoveReceivable,
  onCheckout,
  hasPendingScaleVerification = false,
}: CartPanelProps) {
  const payment = toNumber(paymentAmount);
  const change = Math.max(0, payment - total);
  const missing = Math.max(0, total - payment);
  const hasReceivableItems = receivableItems.length > 0;
  const hasStockIssue = cart.some((item) => item.quantity > getStock(item));
  const memberInactive = Boolean(selectedMemberStatus && selectedMemberStatus !== 'ACTIVE');
  const requiresCreditReason = allowCreditSales && missing > 0 && !hasReceivableItems;
  const hasCreditReason = creditReason.trim().length > 0;

  const buttonLabel = !hasOpenSession
    ? 'Abre caja para dispensar'
    : !selectedMemberName
      ? 'Selecciona un socio'
      : memberInactive
        ? 'Socio no activo'
        : cart.length === 0 && receivableItems.length === 0
          ? 'Añade productos'
          : missing > 0 && (!allowCreditSales || hasReceivableItems)
            ? 'Aportación insuficiente'
            : missing > 0 && payment > 0
              ? 'Registrar pendiente'
              : missing > 0
                ? 'Registrar pendiente de aportación'
                : hasPendingScaleVerification
                  ? 'Verificar peso antes de registrar aportación'
                  : 'Registrar aportación';

  const disabled =
    submitting ||
    !hasOpenSession ||
    !selectedMemberName ||
    memberInactive ||
    (cart.length === 0 && receivableItems.length === 0) ||
    hasStockIssue ||
    (missing > 0 && hasReceivableItems) ||
    (missing > 0 && !allowCreditSales) ||
    (requiresCreditReason && !hasCreditReason);

  return (
    <Card className="h-fit overflow-visible border border-border-light bg-white shadow-card xl:sticky xl:top-4">
      {/* Header */}
      <div className="border-b border-border-light px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-primary text-white">
            <CreditCard size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13px] font-bold text-text-primary">Registro de aportación</h3>
            <p className="truncate text-[11px] text-text-muted">
              {selectedMemberName ?? 'Sin socio'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-2.5">

      <div className="mb-2.5 max-h-[30vh] space-y-1 overflow-y-auto">
        {cart.length ? (
          cart.map((item) => {
            const stock = getStock(item);
            const kg = isKgProduct(item.product.unitType);
            const lineTotal = item.total ?? Number(item.product.price ?? 0) * item.quantity;
            const requestedGrams = kg ? kgToGrams(item.quantity) : 0;
            const actualGrams = item.actualWeightGrams ?? 0;
            const scaleDiff = actualGrams - requestedGrams;
            const scaleDiffLabel =
              scaleDiff > 0
                ? `Diferencia positiva: +${scaleDiff.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g`
                : scaleDiff < 0
                  ? `Diferencia negativa: −${Math.abs(scaleDiff).toLocaleString('es-ES', { maximumFractionDigits: 3 })} g`
                  : 'Sin diferencia';

            return (
              <div key={item.product.id} className="rounded-lg border border-border-light bg-bg-soft p-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px] font-semibold text-text-primary">{item.product.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {kg ? formatPricePerGram(item.product.price) : formatCurrency(item.product.price)}
                      {' · stock '}
                      {kg ? formatWeightKg(stock) : stock}
                      {item.pricingMode === 'BY_AMOUNT' && item.requestedAmount ? ` · ${formatCurrency(item.requestedAmount)}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-brand-primary">{formatCurrency(lineTotal)}</p>
                  <button
                    className="shrink-0 rounded-md p-1 text-text-muted transition hover:bg-red-100 hover:text-red-500"
                    onClick={() => onRemoveItem(item.product.id)}
                    aria-label="Quitar producto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-1">
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded border border-border-light text-text-muted transition hover:bg-gray-100"
                    onClick={() => onQuantityChange(item.product.id, item.quantity - (kg ? 0.001 : 1))}
                    aria-label="Reducir cantidad"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    className="h-6 w-12 rounded border border-border-light bg-white text-center text-[11px] font-medium text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
                    type="number"
                    min={kg ? '0.001' : '1'}
                    max={kg ? String(kgToGrams(stock)) : String(stock)}
                    step={kg ? '0.001' : '1'}
                    value={kg ? kgToGrams(item.quantity) : item.quantity}
                    onChange={(event) =>
                      onQuantityChange(
                        item.product.id,
                        kg ? gramsToKg(Number(event.target.value)) : Number(event.target.value),
                      )
                    }
                    aria-label={kg ? 'Gramos del producto' : 'Cantidad del producto'}
                  />
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded border border-border-light text-text-muted transition hover:bg-gray-100"
                    onClick={() => onQuantityChange(item.product.id, item.quantity + (kg ? 0.001 : 1))}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {kg ? (
                  <div className="mt-1 space-y-1 text-[11px]">
                    <p className="text-text-muted">
                      {formatWeightKg(item.quantity)}
                      {item.pricingMode === 'BY_AMOUNT' ? ' · dispensación por importe' : ' · dispensación por peso'}
                    </p>
                    {item.scaleVerified && item.actualWeightGrams ? (
                      <span className="flex flex-wrap items-center gap-1">
                        <span className={scaleDiff === 0 ? 'text-[#15140F]' : 'text-amber-700'}>
                          {`Peso real: ${item.actualWeightGrams.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g · ${scaleDiffLabel}`}
                        </span>
                        {item.scaleToleranceExceeded ? (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">⚠ Tolerancia superada</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-red-600">Pendiente de báscula</span>
                    )}
                  </div>
                ) : null}

                {item.quantity > stock ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
                    La cantidad supera el stock disponible.
                  </p>
                ) : null}
              </div>
            );
          })
        ) : receivableItems.length ? null : (
          <div className="rounded-lg border border-dashed border-border-light bg-bg-soft px-3 py-4 text-center">
            <p className="text-sm font-semibold text-text-primary">Selección vacía</p>
            <p className="mt-1 text-xs text-text-muted">Añade productos desde el catálogo.</p>
          </div>
        )}

        {receivableItems.map((receivable) => (
          <div key={receivable.receivable.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium text-text-primary">Aportación pendiente</p>
                <p className="text-[11px] text-amber-700">
                  {receivable.receivable.reason ?? 'Pendiente de registro de aportación'}
                </p>
              </div>
              {onRemoveReceivable ? (
                <button
                  className="rounded-md p-1 text-amber-700 transition hover:bg-amber-100"
                  onClick={() => onRemoveReceivable(receivable.receivable.id)}
                  aria-label="Quitar cuenta pendiente"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-amber-800">{formatCurrency(receivable.amount)}</p>
          </div>
        ))}
      </div>

      <div className="mb-2.5 space-y-1.5 border-t border-border-light pt-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Subtotal</span>
          <span className="font-medium text-text-primary">{formatCurrency(subtotal)}</span>
        </div>
        {receivablesTotal > 0 ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-700">Aportaciones pendientes</span>
            <span className="font-medium text-amber-800">{formatCurrency(receivablesTotal)}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            Bonificación
            <HelpTip title="Bonificación" text="Descuento aplicado al total. Se sugiere según la clase del socio (VIP, Preferente) o su cumpleaños." size={12} side="bottom" variant="info" />
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="h-7 w-24 rounded-md border border-border-light bg-white px-2 text-right text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
            value={discount}
            onChange={(event) => onDiscountChange(event.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-brand-lighter/60 px-2.5 py-2">
          <span className="text-sm font-medium text-text-secondary">Total</span>
          <strong className="text-xl text-brand-primary">{formatCurrency(total)}</strong>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            Aportación
            <HelpTip title="Aportación en efectivo" text="Cantidad que el socio aporta ahora. Si es menor que el total, la diferencia queda como cuenta pendiente." size={12} side="bottom" variant="info" />
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="h-7 w-24 rounded-md border border-border-light bg-white px-2 text-right text-xs text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20"
            value={paymentAmount}
            onChange={(event) => onPaymentAmountChange(event.target.value)}
          />
        </div>

        {paymentAmount ? (
          <div
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              change > 0
                ? 'border-green-100 bg-amber-50 text-[#15140F]'
                : missing > 0
                  ? 'border-amber-100 bg-amber-50 text-amber-700'
                  : 'border-border-light bg-bg-soft text-text-secondary'
            }`}
          >
            {change > 0
              ? `Cambio a devolver: ${formatCurrency(change)}`
              : missing > 0
                ? allowCreditSales
                  ? hasReceivableItems
                    ? `Falta por registrar aportación: ${formatCurrency(missing)}`
                    : `Pendiente de aportación del socio: ${formatCurrency(missing)}`
                  : `Falta por registrar aportación: ${formatCurrency(missing)}`
                : 'Aportación exacta.'}
          </div>
        ) : null}

        {requiresCreditReason ? (
          <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50 p-2">
            <Field
              label={payment > 0 ? 'Motivo del pendiente' : 'Motivo del pendiente de aportación'}
              value={creditReason}
              onChange={(event) => onCreditReasonChange(event.target.value)}
              placeholder="Ej. Pendiente de aportación autorizado"
              error={!hasCreditReason ? 'Indica un motivo para dejar importe pendiente.' : undefined}
            />
            <Field
              label="Fecha límite opcional"
              type="date"
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
            />
          </div>
        ) : null}

        {!allowCreditSales && missing > 0 ? (
          <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Las dispensaciones con pendiente están desactivadas en configuración.
          </p>
        ) : null}
      </div>

      {message ? (
        <div className="mb-2 rounded-md bg-amber-50 px-2.5 py-1.5">
          <p className="text-[11px] text-amber-700">{message}</p>
        </div>
      ) : null}
      {error ? (
        <div className="mb-2 rounded-md bg-red-50 px-2.5 py-1.5">
          <p className="text-[11px] text-red-600">{error}</p>
        </div>
      ) : null}

      <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] text-amber-700">
        <ShieldCheck size={12} className="shrink-0" />
        <span>Sesión segura · Auditoría · Stock sincronizado</span>
      </div>

      <Button
        className="w-full rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none"
        size="md"
        onClick={onCheckout}
        disabled={disabled}
      >
        {submitting ? 'Registrando...' : buttonLabel}
      </Button>
      </div>
    </Card>
  );
}
