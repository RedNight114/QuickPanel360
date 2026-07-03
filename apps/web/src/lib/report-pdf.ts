import { formatCredits, formatDate } from './format';

type ReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown) => string;
};

type ReportConfig = {
  title: string;
  subtitle?: string;
  clubName?: string;
  date?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: Array<{ label: string; value: string }>;
  footer?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReportHtml(config: ReportConfig): string {
  const now = config.date || new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const summaryHtml = config.summary?.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px">
        ${config.summary.map(s => `<div style="background:#FAF8F2;border:1px solid #D9D4C7;border-radius:8px;padding:12px">
          <div style="font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(s.label)}</div>
          <div style="font-size:20px;font-weight:700;color:#15140F;margin-top:4px">${escapeHtml(s.value)}</div>
        </div>`).join('')}
      </div>`
    : '';

  const tableHtml = config.rows.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:2px solid #D9D4C7">
            ${config.columns.map(c => `<th style="padding:8px 10px;text-align:${c.align || 'left'};font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#8A8478;font-weight:600">${escapeHtml(c.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${config.rows.map((row, i) => `<tr style="border-bottom:1px solid #F2EFE6;${i % 2 === 1 ? 'background:#F2EFE6' : ''}">
            ${config.columns.map(c => {
              const raw = row[c.key];
              const formatted = c.format ? c.format(raw) : escapeHtml(raw);
              return `<td style="padding:7px 10px;text-align:${c.align || 'left'};color:#15140F">${formatted}</td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>`
    : '<p style="text-align:center;color:#8A8478;padding:32px">Sin datos para mostrar</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(config.title)}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #15140F; margin: 0; padding: 0; background: #FAF8F2; }
</style>
</head>
<body style="padding:24px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #166534">
    <div>
      <h1 style="margin:0;font-size:22px;color:#15140F">${escapeHtml(config.title)}</h1>
      ${config.subtitle ? `<p style="margin:4px 0 0;font-size:13px;color:#8A8478">${escapeHtml(config.subtitle)}</p>` : ''}
    </div>
    <div style="text-align:right">
      ${config.clubName ? `<p style="margin:0;font-size:14px;font-weight:600;color:#15140F">${escapeHtml(config.clubName)}</p>` : ''}
      <p style="margin:2px 0 0;font-size:11px;color:#8A8478">${escapeHtml(now)}</p>
    </div>
  </div>
  ${summaryHtml}
  ${tableHtml}
  ${config.footer ? `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #D9D4C7;font-size:11px;color:#8A8478;text-align:center">${escapeHtml(config.footer)}</div>` : ''}
  <div style="margin-top:16px;font-size:9px;color:#7A7770;text-align:center">Generado por QuickPanel360 · Powered by QuickAgence · ${escapeHtml(now)}</div>
</body>
</html>`;
}

export function printReport(config: ReportConfig) {
  const html = buildReportHtml(config);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 400);
    };
  }
}

export function printCashCloseReport(session: {
  id: string;
  openingCash: number | string;
  closingCash?: number | string | null;
  expectedCash?: number | string | null;
  difference?: number | string | null;
  closingSignature?: string | null;
  discrepancyReason?: string | null;
  openedAt?: string;
  closedAt?: string | null;
  sales?: Array<{ id: string; total: number | string; status: string; createdAt: string; member?: { firstName?: string; lastName?: string; memberNumber?: string } | null }>;
}, clubName?: string) {
  const opening = Number(session.openingCash);
  const closing = Number(session.closingCash ?? 0);
  const expected = Number(session.expectedCash ?? 0);
  const diff = Number(session.difference ?? 0);
  const salesCount = session.sales?.length ?? 0;
  const totalSold = session.sales?.reduce((s, sale) => s + Number(sale.total), 0) ?? 0;

  const signatureHtml = session.closingSignature
    ? `<div style="margin-top:24px;border-top:1px solid #D9D4C7;padding-top:16px">
        <p style="font-size:11px;color:#8A8478;margin:0 0 8px">Firma del responsable:</p>
        <img src="${session.closingSignature}" style="max-height:60px;opacity:0.8" alt="Firma" />
      </div>`
    : '';

  const reasonHtml = session.discrepancyReason
    ? `<div style="margin-top:12px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:10px">
        <p style="font-size:11px;color:#15140F;margin:0"><strong>Motivo del descuadre:</strong> ${escapeHtml(session.discrepancyReason)}</p>
      </div>`
    : '';

  const html = buildReportHtml({
    title: 'Cierre de caja',
    subtitle: `Sesion ${session.id.slice(0, 8)} · ${session.closedAt ? formatDate(session.closedAt) : 'Sin cierre'}`,
    clubName,
    summary: [
      { label: 'Apertura', value: formatCredits(opening) },
      { label: 'Contado', value: formatCredits(closing) },
      { label: 'Esperado', value: formatCredits(expected) },
      { label: 'Diferencia', value: formatCredits(diff) },
      { label: 'Dispensaciones', value: String(salesCount) },
      { label: 'Total dispensado', value: formatCredits(totalSold) },
    ],
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'member', label: 'Socio' },
      { key: 'total', label: 'Total', align: 'right', format: (v) => formatCredits(v) },
      { key: 'status', label: 'Estado' },
      { key: 'createdAt', label: 'Hora', format: (v) => v ? new Date(String(v)).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '' },
    ],
    rows: (session.sales ?? []).map(s => ({
      id: s.id.slice(0, 8),
      member: s.member ? `${s.member.firstName ?? ''} ${s.member.lastName ?? ''}`.trim() || s.member.memberNumber : '-',
      total: s.total,
      status: s.status === 'COMPLETED' ? 'Completada' : s.status === 'CANCELLED' ? 'Cancelada' : s.status,
      createdAt: s.createdAt,
    })),
  });

  const fullHtml = html.replace('</body>', `${reasonHtml}${signatureHtml}</body>`);
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => { setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 400); };
  }
}

export function printInventoryReport(
  products: Array<{ name: string; currentStock: number; minimumStock: number; waste30d: number; stockStatus: string; category?: { name: string } | null }>,
  summary: { totalProducts: number; outOfStock: number; lowStock: number; totalWaste30d: number },
  clubName?: string,
) {
  printReport({
    title: 'Informe de inventario',
    subtitle: 'Estado actual del stock y mermas ultimos 30 dias',
    clubName,
    summary: [
      { label: 'Productos activos', value: String(summary.totalProducts) },
      { label: 'Sin stock', value: String(summary.outOfStock) },
      { label: 'Stock bajo', value: String(summary.lowStock) },
      { label: 'Mermas 30d', value: `${summary.totalWaste30d.toFixed(1)}g` },
    ],
    columns: [
      { key: 'name', label: 'Producto' },
      { key: 'category', label: 'Categoria' },
      { key: 'currentStock', label: 'Stock', align: 'right', format: (v) => `${Number(v).toFixed(1)}g` },
      { key: 'minimumStock', label: 'Minimo', align: 'right', format: (v) => `${Number(v).toFixed(1)}g` },
      { key: 'waste30d', label: 'Mermas', align: 'right', format: (v) => `${Number(v).toFixed(1)}g` },
      { key: 'status', label: 'Estado' },
    ],
    rows: products.map(p => ({
      name: p.name,
      category: p.category?.name ?? '-',
      currentStock: p.currentStock,
      minimumStock: p.minimumStock,
      waste30d: p.waste30d,
      status: p.stockStatus === 'OK' ? 'OK' : p.stockStatus === 'LOW' ? 'Bajo' : 'Agotado',
    })),
  });
}

export function printDailyCashReport(
  summary: {
    openingCash: number;
    totalSales: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalExpenses: number;
    expectedCash: number;
    closingCash?: number;
    difference?: number;
    sessionsCount: number;
    salesCount: number;
  },
  movements: Array<{ type: string; amount: number; reason?: string; createdAt: string }>,
  clubName?: string,
) {
  printReport({
    title: 'Resumen diario de caja',
    subtitle: new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    clubName,
    summary: [
      { label: 'Apertura', value: formatCredits(summary.openingCash) },
      { label: 'Dispensaciones', value: formatCredits(summary.totalSales) },
      { label: 'Entradas', value: formatCredits(summary.totalDeposits) },
      { label: 'Salidas', value: formatCredits(summary.totalWithdrawals + summary.totalExpenses) },
      { label: 'Esperado', value: formatCredits(summary.expectedCash) },
      { label: 'Sesiones', value: String(summary.sessionsCount) },
      { label: 'Operaciones', value: String(summary.salesCount) },
    ],
    columns: [
      { key: 'time', label: 'Hora' },
      { key: 'type', label: 'Tipo' },
      { key: 'amount', label: 'Importe', align: 'right', format: (v) => formatCredits(v) },
      { key: 'reason', label: 'Concepto' },
    ],
    rows: movements.map(m => ({
      time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
      type: m.type,
      amount: m.amount,
      reason: m.reason ?? '-',
    })),
  });
}

export function printAnalyticsSummaryReport(
  data: {
    totalDispensations: number;
    totalCredits: number;
    activeMembers: number;
    newMembers: number;
    pendingContributions: number;
    topProducts: Array<{ name: string; quantity: number; totalCredits: number }>;
    range: { dateFrom: string; dateTo: string };
  },
  clubName?: string,
) {
  printReport({
    title: 'Informe de analitica',
    subtitle: `Periodo: ${formatDate(data.range.dateFrom)} - ${formatDate(data.range.dateTo)}`,
    clubName,
    summary: [
      { label: 'Dispensaciones', value: String(data.totalDispensations) },
      { label: 'Ingresos', value: formatCredits(data.totalCredits) },
      { label: 'Socios activos', value: String(data.activeMembers) },
      { label: 'Nuevos socios', value: String(data.newMembers) },
      { label: 'Pendiente cobro', value: formatCredits(data.pendingContributions) },
    ],
    columns: [
      { key: 'name', label: 'Producto' },
      { key: 'quantity', label: 'Cantidad', align: 'right', format: (v) => Number(v).toFixed(1) },
      { key: 'totalCredits', label: 'Ingresos', align: 'right', format: (v) => formatCredits(v) },
    ],
    rows: data.topProducts,
    footer: 'Top productos por ingresos en el periodo seleccionado',
  });
}
