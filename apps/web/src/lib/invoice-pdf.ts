import { formatCredits, formatDate } from './format';

type InvoiceData = {
  number: string;
  amount: number | string;
  description?: string | null;
  status: string;
  issuedAt?: string;
  dueAt?: string | null;
  paidAt?: string | null;
  tenant: {
    name: string;
    legalName?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    country?: string | null;
  };
  payments?: Array<{
    amount: number | string;
    method?: string | null;
    reference?: string | null;
    paidAt: string;
  }>;
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Emitida',
  PAID: 'Cobrada',
  VOID: 'Anulada',
};

export function downloadInvoicePdf(invoice: InvoiceData) {
  const totalPaid = (invoice.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const pending = Number(invoice.amount) - totalPaid;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoice.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #15140F; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 24px; font-weight: 700; color: #166534; }
    .brand-sub { font-size: 12px; color: #8A8478; margin-top: 4px; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: 700; }
    .invoice-status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; background: ${invoice.status === 'PAID' ? '#DCFCE7' : invoice.status === 'VOID' ? '#FEE2E2' : '#FEF3C7'}; color: ${invoice.status === 'PAID' ? '#166534' : invoice.status === 'VOID' ? '#DC2626' : '#6B6200'}; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #8A8478; margin-bottom: 12px; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
    .client-grid .label { color: #8A8478; }
    .client-grid .value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #D9D4C7; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #8A8478; }
    td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
    .text-right { text-align: right; }
    .total-row { border-top: 2px solid #15140F; }
    .total-row td { font-weight: 700; font-size: 18px; padding-top: 16px; }
    .payments { margin-top: 24px; }
    .payment-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #D9D4C7; font-size: 11px; color: #94A3B8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">QuickPanel360</div>
      <div class="brand-sub">Plataforma de gestion</div>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">${invoice.number}</div>
      <div class="invoice-status">${statusLabels[invoice.status] ?? invoice.status}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Empresa</div>
    <div class="client-grid">
      <div><span class="label">Nombre:</span></div><div class="value">${invoice.tenant.name}</div>
      ${invoice.tenant.legalName ? `<div><span class="label">Razon social:</span></div><div class="value">${invoice.tenant.legalName}</div>` : ''}
      ${invoice.tenant.taxId ? `<div><span class="label">CIF/NIF:</span></div><div class="value">${invoice.tenant.taxId}</div>` : ''}
      ${invoice.tenant.email ? `<div><span class="label">Email:</span></div><div class="value">${invoice.tenant.email}</div>` : ''}
      ${invoice.tenant.city ? `<div><span class="label">Ciudad:</span></div><div class="value">${invoice.tenant.city}</div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalle</div>
    <table>
      <thead>
        <tr>
          <th>Concepto</th>
          <th>Fecha emision</th>
          <th>Vencimiento</th>
          <th class="text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.description || 'Suscripcion mensual'}</td>
          <td>${invoice.issuedAt ? formatDate(invoice.issuedAt) : '-'}</td>
          <td>${invoice.dueAt ? formatDate(invoice.dueAt) : '-'}</td>
          <td class="text-right">${formatCredits(invoice.amount)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td class="text-right">${formatCredits(invoice.amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${(invoice.payments ?? []).length > 0 ? `
  <div class="section payments">
    <div class="section-title">Aportaciones recibidas</div>
    ${(invoice.payments ?? []).map(p => `
      <div class="payment-item">
        <span>${p.method || 'Sin metodo'} ${p.reference ? `(${p.reference})` : ''} - ${formatDate(p.paidAt)}</span>
        <strong>${formatCredits(p.amount)}</strong>
      </div>
    `).join('')}
    <div class="payment-item" style="border-top: 2px solid #15140F; font-weight: 700; padding-top: 12px;">
      <span>Pendiente</span>
      <span>${formatCredits(Math.max(0, pending))}</span>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Generado automaticamente por QuickPanel360 · ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 300);
    };
  }
}


