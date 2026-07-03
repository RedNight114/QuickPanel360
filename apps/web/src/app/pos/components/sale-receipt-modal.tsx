'use client';

import { Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/format';
import type { SaleResponse } from '@/lib/types';
import { formatPricePerGram, formatWeightKg, kgToGrams } from '@/lib/weight';

type SaleReceiptModalProps = {
  sale: SaleResponse;
  cashReceived?: number;
  employeeName?: string;
  onClose: () => void;
  onNewSale: () => void;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function itemQuantityLabel(item: NonNullable<SaleResponse['items']>[number]) {
  if (item.pricingMode === 'BY_WEIGHT' || item.pricingMode === 'BY_AMOUNT') {
    return formatWeightKg(item.quantity);
  }

  return Number(item.quantity).toLocaleString('es-ES', {
    maximumFractionDigits: 3,
  });
}

function itemUnitPriceLabel(item: NonNullable<SaleResponse['items']>[number]) {
  if (item.pricingMode === 'BY_WEIGHT' || item.pricingMode === 'BY_AMOUNT') {
    return formatPricePerGram(item.unitPrice);
  }

  return formatCurrency(item.unitPrice);
}

function itemModeLabel(item: NonNullable<SaleResponse['items']>[number]) {
  if (item.pricingMode === 'BY_AMOUNT') {
    return `Dispensación por importe${item.requestedAmount ? ` · ${formatCurrency(item.requestedAmount)}` : ''}`;
  }

  if (item.pricingMode === 'BY_WEIGHT') {
    return 'Dispensación por peso';
  }

  return 'Dispensación por unidad';
}

function itemScaleLabel(item: NonNullable<SaleResponse['items']>[number]) {
  if (!item.scaleVerified || !item.actualWeight) {
    return null;
  }

  const actualGrams = kgToGrams(toNumber(item.actualWeight));
  const wasteGrams = kgToGrams(toNumber(item.wasteQuantity));

  return `Peso real dispensado: ${actualGrams.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g${
    wasteGrams > 0
      ? ` · Merma: ${wasteGrams.toLocaleString('es-ES', { maximumFractionDigits: 3 })} g`
      : ''
  }`;
}

export function printSaleReceipt(sale: SaleResponse, employeeName?: string) {
  const items = (sale.items ?? []).map(item => {
    const qty = item.pricingMode === 'BY_WEIGHT' || item.pricingMode === 'BY_AMOUNT'
      ? formatWeightKg(item.quantity) : Number(item.quantity).toLocaleString('es-ES', { maximumFractionDigits: 3 });
    return `<tr><td>${item.productNameSnapshot}</td><td style="text-align:right">${qty}</td><td style="text-align:right">${formatCurrency(item.unitPrice)}</td><td style="text-align:right"><strong>${formatCurrency(item.total)}</strong></td></tr>`;
  }).join('');

  const payments = (sale.payments ?? []).map(p =>
    `<div style="display:flex;justify-content:space-between"><span>${p.method}</span><span>${formatCurrency(p.amount)}</span></div>`
  ).join('');

  const memberName = [sale.member?.memberNumber, sale.member?.firstName, sale.member?.lastName].filter(Boolean).join(' - ') || '-';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante #${sale.id.slice(0, 8)}</title>
<style>@page{size:80mm auto;margin:5mm}body{font-family:monospace;font-size:12px;margin:0;padding:8px;color:#000}
h1{font-size:16px;text-align:center;margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{padding:3px 2px;text-align:left;border-bottom:1px dotted #ccc}
th{font-size:10px;text-transform:uppercase}.total{font-size:16px;font-weight:bold;text-align:center;padding:8px 0;border-top:2px solid #000}
.info{font-size:11px;margin:4px 0}.footer{text-align:center;font-size:10px;margin-top:12px;color:#666}</style></head>
<body><h1>Comprobante</h1>
<div class="info"><strong>#${sale.id.slice(0, 8)}</strong> - ${formatDate(sale.createdAt)}</div>
<div class="info">Socio: ${memberName}</div>
${employeeName ? `<div class="info">Colaborador: ${employeeName}</div>` : ''}
<table><thead><tr><th>Producto</th><th style="text-align:right">Cant</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead><tbody>${items}</tbody></table>
<div style="margin-top:8px;border-top:1px solid #000;padding-top:4px">
<div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
${toNumber(sale.discount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Bonificacion</span><span>-${formatCurrency(sale.discount)}</span></div>` : ''}
</div><div class="total">${formatCurrency(sale.total)}</div>
${payments ? `<div style="margin-top:4px;font-size:11px"><strong>Aportaciones:</strong>${payments}</div>` : ''}
<div class="footer">QuickPanel360</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 300); };
  }
}

export function SaleReceiptModal({
  sale,
  cashReceived,
  employeeName,
  onClose,
  onNewSale,
}: SaleReceiptModalProps) {
  const paid = toNumber(
    sale.amountPaid ??
      cashReceived ??
      sale.payments?.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
  );
  const pending = toNumber(sale.amountPending);
  const received = cashReceived ?? paid;
  const change = Math.max(0, toNumber(sale.changeDue) || received - toNumber(sale.total));

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Comprobante"
      description={`Comprobante #${sale.id.slice(0, 8)}`}
      size="lg"
      actions={
        <div className="flex flex-wrap gap-3">
          <Button onClick={onNewSale}>Nueva dispensacion</Button>
          <Button variant="outline" onClick={() => printSaleReceipt(sale, employeeName)}>
            <Printer size={16} className="mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 rounded-lg bg-bg-soft p-4 text-sm md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">ID dispensación</p>
          <p className="mt-1 font-mono font-medium text-text-primary">#{sale.id.slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Fecha</p>
          <p className="mt-1 font-medium text-text-primary">{formatDate(sale.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Socio</p>
          <p className="mt-1 font-medium text-text-primary">
            {[sale.member?.memberNumber, sale.member?.firstName, sale.member?.lastName].filter(Boolean).join(' · ') || '-'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Estado</p>
          <p className="mt-1">
            <Badge variant={pending > 0 ? 'warning' : 'success'}>
              {sale.settlementStatus ?? sale.status}
            </Badge>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Colaborador</p>
          <p className="mt-1 font-medium text-text-primary">{employeeName ?? '-'}</p>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-3 font-semibold text-text-primary">Productos</h3>
        <div className="space-y-2">
          {sale.items?.map((item) => (
            <div key={item.id} className="rounded-lg border border-border-light p-3 md:flex md:justify-between">
              <div>
                <p className="font-medium text-text-primary">{item.productNameSnapshot}</p>
                <p className="text-sm text-text-muted">
                  {itemQuantityLabel(item)} x {itemUnitPriceLabel(item)}
                </p>
                <p className="mt-1 text-xs text-text-muted">{itemModeLabel(item)}</p>
                {itemScaleLabel(item) ? (
                  <p className="mt-1 text-xs font-medium text-amber-700">{itemScaleLabel(item)}</p>
                ) : null}
              </div>
              <p className="mt-2 font-semibold text-brand-primary md:mt-0">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 space-y-2 rounded-lg border border-border-light bg-brand-lighter p-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Subtotal</span>
          <span className="font-medium text-text-primary">{formatCurrency(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Bonificación</span>
          <span className="font-medium text-text-primary">{formatCurrency(sale.discount)}</span>
        </div>
        <div className="flex justify-between border-t border-brand-primary/20 pt-3">
          <span className="font-semibold text-brand-primary">Total</span>
          <strong className="text-xl text-brand-primary">{formatCurrency(sale.total)}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Aportación recibida</span>
          <span className="font-medium text-text-primary">{formatCurrency(received)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Aportación aplicada</span>
          <span className="font-medium text-text-primary">{formatCurrency(paid)}</span>
        </div>
        {change > 0 ? (
          <div className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm">
            <span className="font-medium text-[#15140F]">Cambio</span>
            <span className="font-semibold text-[#15140F]">{formatCurrency(change)}</span>
          </div>
        ) : null}
        {pending > 0 ? (
          <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
            <span className="font-medium text-amber-700">Pendiente</span>
            <span className="font-semibold text-amber-700">{formatCurrency(pending)}</span>
          </div>
        ) : null}
        {sale.creditReason ? (
          <p className="rounded-lg bg-white px-3 py-2 text-sm text-amber-700">
            Motivo: {sale.creditReason}
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-text-primary">Aportaciones</h3>
        <div className="space-y-2">
          {sale.payments?.map((payment) => (
            <div key={payment.id} className="flex justify-between rounded-lg border border-border-light p-3">
              <span className="text-text-secondary">{payment.method}</span>
              <span className="font-semibold text-text-primary">{formatCurrency(payment.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
