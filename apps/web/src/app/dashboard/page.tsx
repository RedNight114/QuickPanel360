'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CircleCheck,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  GripVertical,
  HandCoins,
  PackagePlus,
  Plus,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MeasuredChart } from '@/components/common/measured-chart';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { SectionErrorBoundary } from '@/components/errors/section-error-boundary';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useCashCurrentSummary, useCashMovements } from '@/hooks/useCash';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useInventory, useInventoryMovements } from '@/hooks/useInventory';
import { useReceivables, useReceivablesSummary } from '@/hooks/useReceivables';
import { useEmergencyStatus } from '@/hooks/useSecurity';
import { useThirdPartyPayments } from '@/hooks/useThirdPartyPayments';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CashMovement, InventoryItem, InventoryMovement, Receivable, ThirdPartyPayment } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type ChartRange = 7 | 30;

const EMPTY_SALES: Array<Record<string, unknown>> = [];
const EMPTY_CASH_MOVEMENTS: CashMovement[] = [];
const EMPTY_RECEIVABLES: Receivable[] = [];
const EMPTY_INVENTORY: InventoryItem[] = [];
const EMPTY_INVENTORY_MOVEMENTS: InventoryMovement[] = [];
const EMPTY_THIRD_PARTY_PAYMENTS: ThirdPartyPayment[] = [];

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function shortId(value: unknown) {
  return String(value ?? '').slice(0, 8);
}

function saleMemberName(sale: Record<string, unknown>) {
  const member = sale.member as { firstName?: string; lastName?: string; memberNumber?: string } | undefined;
  const name = `${member?.firstName ?? ''} ${member?.lastName ?? ''}`.trim();
  return name || member?.memberNumber || 'Socio';
}

function buildSalesSeries(sales: Array<Record<string, unknown>> = [], range: ChartRange) {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
  const today = new Date();

  return Array.from({ length: range }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (range - 1 - index));
    date.setHours(0, 0, 0, 0);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);

    const total = sales.reduce((sum, sale) => {
      const createdAt = new Date(String(sale.createdAt ?? 0));
      if (createdAt >= date && createdAt < next) {
        return sum + toNumber(sale.total);
      }
      return sum;
    }, 0);

    return {
      label: formatter.format(date),
      total,
    };
  });
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-text-primary">{title}</h2>
      {action}
    </div>
  );
}

function ActivityItem({
  title,
  meta,
  amount,
  negative,
}: {
  title: string;
  meta?: string;
  amount?: React.ReactNode;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-light px-3 py-2.5 transition hover:bg-bg-soft/50">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{title}</p>
        {meta ? <p className="text-[11px] text-text-muted">{meta}</p> : null}
      </div>
      {amount ? (
        <p className={`shrink-0 text-sm font-bold ${negative ? 'text-red-600' : 'text-amber-700'}`}>
          {amount}
        </p>
      ) : null}
    </div>
  );
}

type DashboardSectionId = 'kpis' | 'alerts' | 'today' | 'activity' | 'pending' | 'quickActions';

const ALL_SECTIONS: Array<{ id: DashboardSectionId; label: string }> = [
  { id: 'kpis', label: 'Indicadores KPI' },
  { id: 'alerts', label: 'Atencion requerida' },
  { id: 'today', label: 'Resumen del dia y grafico' },
  { id: 'activity', label: 'Actividad reciente' },
  { id: 'pending', label: 'Operaciones pendientes' },
  { id: 'quickActions', label: 'Acciones rapidas' },
];

const DEFAULT_ORDER: DashboardSectionId[] = ['kpis', 'alerts', 'today', 'activity', 'pending', 'quickActions'];
const STORAGE_KEY = 'pref:dashboardSections';

function loadDashboardPrefs(): { order: DashboardSectionId[]; hidden: Set<DashboardSectionId> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        order: parsed.order ?? DEFAULT_ORDER,
        hidden: new Set(parsed.hidden ?? []),
      };
    }
  } catch {}
  return { order: DEFAULT_ORDER, hidden: new Set() };
}

function saveDashboardPrefs(order: DashboardSectionId[], hidden: Set<DashboardSectionId>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden: Array.from(hidden) }));
}

export default function DashboardPage() {
  const router = useRouter();
  const { hasPermission, hasRole, user } = useAuth();
  const [chartRange, setChartRange] = useState<ChartRange>(7);
  const [configOpen, setConfigOpen] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<DashboardSectionId[]>(DEFAULT_ORDER);
  const [hiddenSections, setHiddenSections] = useState<Set<DashboardSectionId>>(new Set());

  useEffect(() => {
    const prefs = loadDashboardPrefs();
    setSectionOrder(prefs.order);
    setHiddenSections(prefs.hidden);
  }, []);

  const isEmployee = user?.role === 'EMPLOYEE';
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const isOwnerOrManager = hasRole('OWNER') || hasRole('MANAGER');

  useEffect(() => {
    if (isSuperadmin) { router.replace('/platform'); return; }
    if (isEmployee) { router.replace('/pos'); return; }
    const startPage = typeof window !== 'undefined' ? (localStorage.getItem('pref:startPage') ?? '/dashboard') : '/dashboard';
    if (startPage !== '/dashboard') router.replace(startPage);
  }, [isEmployee, isSuperadmin, router]);

  const summaryQuery = useDashboardSummary({ enabled: isOwnerOrManager && hasPermission('dashboard.view') });
  const cashQuery = useCashCurrentSummary({ enabled: isOwnerOrManager && hasPermission('cash.summary.view') });
  const cashMovementsQuery = useCashMovements({ take: 8 }, { enabled: isOwnerOrManager && hasPermission('cash.movements.view') });
  const receivablesSummaryQuery = useReceivablesSummary({ enabled: isOwnerOrManager && hasPermission('credit.view') });
  const receivablesQuery = useReceivables({ take: 8 }, { enabled: isOwnerOrManager && hasPermission('credit.view') });
  const inventoryQuery = useInventory({ enabled: isOwnerOrManager && hasPermission('stock.read_basic') });
  const inventoryMovementsQuery = useInventoryMovements({ enabled: isOwnerOrManager && hasPermission('stock.movements.read') });
  const thirdPartyPaymentsQuery = useThirdPartyPayments({ take: 8 }, { enabled: isOwnerOrManager && hasPermission('third_party_payment.view') });
  const securityQuery = useEmergencyStatus({ enabled: isOwnerOrManager && hasPermission('audit.read') });

  const summary = summaryQuery.data;
  const cashSummary = cashQuery.data?.summary;
  const cashMovements = cashMovementsQuery.data ?? cashQuery.data?.recentMovements ?? EMPTY_CASH_MOVEMENTS;
  const receivables = receivablesQuery.data ?? EMPTY_RECEIVABLES;
  const inventory = inventoryQuery.data ?? EMPTY_INVENTORY;
  const inventoryMovements = inventoryMovementsQuery.data ?? EMPTY_INVENTORY_MOVEMENTS;
  const thirdPartyPayments = thirdPartyPaymentsQuery.data ?? EMPTY_THIRD_PARTY_PAYMENTS;

  const lowStockItems = useMemo(
    () => inventory.filter((item) => toNumber(item.currentQuantity) <= toNumber(item.minimumQuantity)),
    [inventory],
  );
  const outOfStockItems = useMemo(
    () => inventory.filter((item) => toNumber(item.currentQuantity) <= 0),
    [inventory],
  );
  const thirdPartyToday = useMemo(
    () =>
      thirdPartyPayments
        .filter((payment) => payment.status !== 'CANCELLED' && isToday(payment.createdAt))
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    [thirdPartyPayments],
  );

  const receivablesOverdue = useMemo(
    () =>
      receivables.filter((receivable) => {
        if (receivable.status === 'OVERDUE') return true;
        if (!receivable.dueDate || ['PAID', 'CANCELLED'].includes(receivable.status)) return false;
        return new Date(receivable.dueDate).getTime() < Date.now();
      }).length,
    [receivables],
  );

  const salesSeries = useMemo(
    () => buildSalesSeries(summary?.lastSales ?? EMPTY_SALES, chartRange),
    [chartRange, summary?.lastSales],
  );

  const netCash =
    toNumber(cashSummary?.saleCashIn) +
    toNumber(cashSummary?.receivableCashIn) -
    toNumber(cashSummary?.thirdPartyCashOut) -
    toNumber(cashSummary?.expenses) -
    toNumber(cashSummary?.withdrawals);

  const alerts = useMemo(
    () =>
      [
        outOfStockItems.length
          ? {
              title: 'Productos sin disponibilidad',
              description: `${outOfStockItems.length} productos necesitan reposicion.`,
              href: '/inventory',
              icon: AlertTriangle,
              tone: 'danger',
            }
          : null,
        lowStockItems.length
          ? {
              title: 'Inventario bajo',
              description: `${lowStockItems.length} productos estan en minimo o por debajo.`,
              href: '/inventory',
              icon: Boxes,
              tone: 'warning',
            }
          : null,
        receivablesOverdue
          ? {
              title: 'Pendientes vencidos',
              description: `${receivablesOverdue} cuentas requieren revision.`,
              href: '/receivables',
              icon: HandCoins,
              tone: 'warning',
            }
          : null,
        securityQuery.data?.accessStatus === 'EMERGENCY_LOCKED'
          ? {
              title: 'Emergencia activa',
              description: 'Los accesos publicos estan bloqueados.',
              href: '/security',
              icon: ShieldAlert,
              tone: 'danger',
            }
          : null,
        summary?.openCashSessions
          ? {
              title: 'Caja abierta',
              description: `${summary.openCashSessions} sesin activa pendiente de cierre.`,
              href: '/cash',
              icon: Wallet,
              tone: 'neutral',
            }
          : null,
      ].filter(Boolean) as Array<{
        title: string;
        description: string;
        href: string;
        icon: typeof AlertTriangle;
        tone: string;
      }>,
    [
      lowStockItems.length,
      outOfStockItems.length,
      receivablesOverdue,
      securityQuery.data?.accessStatus,
      summary?.openCashSessions,
    ],
  );

  const quickActions = useMemo(
    () =>
      [
        { label: 'Ir al Punto de dispensacin', href: '/pos', icon: ShoppingCart, show: hasPermission('pos.sell') },
        { label: 'Abrir caja', href: '/pos', icon: Wallet, show: hasPermission('cash.open') },
        { label: 'Nuevo socio', href: '/members', icon: UserPlus, show: hasPermission('members.create') },
        { label: 'Nuevo producto', href: '/products', icon: Plus, show: hasPermission('products.create') },
        { label: 'Aadir stock', href: '/inventory', icon: PackagePlus, show: hasPermission('stock.add') },
        { label: 'Cuentas pendientes', href: '/receivables', icon: HandCoins, show: hasPermission('credit.view') },
        { label: 'Aportacin a tercero', href: '/third-party-payments', icon: ReceiptText, show: hasPermission('third_party_payment.create') },
        { label: 'Auditora', href: '/audit', icon: Clock, show: hasPermission('audit.read') },
      ].filter((action) => action.show),
    [hasPermission],
  );

  if (isEmployee || isSuperadmin) {
    return (
      <ProtectedLayout>
        <Card>
          <p className="text-sm text-text-muted">Redirigiendo al Punto de dispensacin...</p>
        </Card>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Resumen de actividad y estado general del club."
          action={(
            <>
            <Button
              variant="outline"
              onClick={() => {
                void Promise.all([
                  summaryQuery.refetch(),
                  cashQuery.refetch(),
                  cashMovementsQuery.refetch(),
                  receivablesSummaryQuery.refetch(),
                  receivablesQuery.refetch(),
                  inventoryQuery.refetch(),
                  inventoryMovementsQuery.refetch(),
                  thirdPartyPaymentsQuery.refetch(),
                  securityQuery.refetch(),
                ]);
              }}
            >
              <RefreshCw size={16} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfigOpen(!configOpen)}
            >
              <Settings2 size={16} />
              Personalizar
            </Button>
            </>
          )}
        />

        {configOpen ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Secciones del dashboard</h3>
              <Button variant="ghost" size="xs" onClick={() => { setSectionOrder(DEFAULT_ORDER); setHiddenSections(new Set()); saveDashboardPrefs(DEFAULT_ORDER, new Set()); }}>
                Restablecer
              </Button>
            </div>
            <div className="space-y-1">
              {sectionOrder.map((id) => {
                const section = ALL_SECTIONS.find(s => s.id === id);
                if (!section) return null;
                const isHidden = hiddenSections.has(id);
                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = e.dataTransfer.getData('text/plain') as DashboardSectionId;
                      if (from === id) return;
                      const next = [...sectionOrder];
                      const fromIdx = next.indexOf(from);
                      const toIdx = next.indexOf(id);
                      if (fromIdx === -1 || toIdx === -1) return;
                      next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, from);
                      setSectionOrder(next);
                      saveDashboardPrefs(next, hiddenSections);
                    }}
                    className={`flex items-center gap-3 rounded-lg border border-border-light px-3 py-2 cursor-grab active:cursor-grabbing ${isHidden ? 'opacity-50' : ''}`}
                  >
                    <GripVertical size={14} className="text-text-muted shrink-0" />
                    <span className="flex-1 text-sm text-text-primary">{section.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(hiddenSections);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        setHiddenSections(next);
                        saveDashboardPrefs(sectionOrder, next);
                      }}
                      className="rounded p-1 text-text-muted transition-colors hover:text-text-primary"
                    >
                      {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {sectionOrder.filter((id) => !hiddenSections.has(id)).map((sectionId) => {
          const sectionContent: Record<DashboardSectionId, React.ReactNode> = {
            kpis: (
              <SectionErrorBoundary title="No se pudieron cargar los indicadores" message="Vuelve a intentarlo para revisar el resumen del club.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Dispensaciones de hoy" value={formatCurrency(summary?.todaySalesTotal)} description={`${summary?.todaySalesCount ?? 0} operaciones`} icon={<TrendingUp size={20} />} tone="blue" />
                <StatCard title="Caja esperada" value={formatCurrency(cashSummary?.expectedCash)} description={`${cashSummary?.operationsCount ?? 0} movimientos`} icon={<Wallet size={20} />} tone="green" />
                <StatCard title="Pendiente de aportación" value={formatCurrency(receivablesSummaryQuery.data?.totalOutstanding)} description={`${receivablesSummaryQuery.data?.openCount ?? 0} abiertas`} icon={<HandCoins size={20} />} tone="amber" />
                <StatCard title="Aportaciones a terceros hoy" value={formatCurrency(thirdPartyToday)} description="Salidas registradas" icon={<TrendingDown size={20} />} tone="red" />
                <StatCard title="Inventario bajo" value={lowStockItems.length || summary?.lowStockProducts || 0} description={`${outOfStockItems.length} sin disponibilidad`} icon={<AlertTriangle size={20} />} tone="amber" />
                <StatCard title="Socios atendidos" value={summary?.activeMembers ?? 0} description={`${summary?.totalMembers ?? 0} totales`} icon={<Users size={20} />} tone="green" />
                <StatCard title="Cajas abiertas" value={summary?.openCashSessions ?? 0} description="Sesiones actuales" icon={<Banknote size={20} />} tone="neutral" />
                <StatCard title="Aportaciones registradas hoy" value={formatCurrency(receivablesSummaryQuery.data?.collectedToday)} description="Abonos recibidos" icon={<CreditCard size={20} />} tone="blue" />
              </div>
              </SectionErrorBoundary>
            ),
            alerts: (
              <SectionErrorBoundary title="No se pudo cargar la atención requerida" message="Recarga esta sección para revisar las incidencias actuales.">
              <Card>
                <SectionTitle title="Atención requerida" />
                {alerts.length ? (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {alerts.map((alert) => {
                      const Icon = alert.icon;
                      const bg = alert.tone === 'danger' ? 'bg-red-50 border-red-200 hover:bg-red-100/50' : alert.tone === 'warning' ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/50' : 'bg-slate-50 border-border-light hover:bg-slate-100/50';
                      const iconColor = alert.tone === 'danger' ? 'text-red-500' : alert.tone === 'warning' ? 'text-amber-500' : 'text-text-muted';
                      return (
                        <Link key={alert.title} href={alert.href} className={`flex items-center gap-3 rounded-xl border p-3 transition ${bg}`}>
                          <Icon className={iconColor} size={18} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-primary">{alert.title}</p>
                            <p className="text-xs text-text-muted">{alert.description}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[#15140F]">
                    <CircleCheck size={16} />
                    <p className="text-sm font-medium">Todo en orden — sin incidencias</p>
                  </div>
                )}
              </Card>
              </SectionErrorBoundary>
            ),
            today: (
              <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <SectionErrorBoundary title="No se pudo cargar el resumen diario" message="Inténtalo de nuevo para consultar los movimientos del día.">
                <Card>
                  <SectionTitle title="Hoy" />
                  <div className="space-y-3">
                    <ActivityItem title="Dispensaciones registradas en efectivo" amount={formatCurrency(cashSummary?.saleCashIn)} />
                    <ActivityItem title="Registro de aportaciones de cuentas pendientes" amount={formatCurrency(cashSummary?.receivableCashIn)} />
                    <ActivityItem title="Aportaciones a terceros" amount={`-${formatCurrency(cashSummary?.thirdPartyCashOut ?? thirdPartyToday)}`} negative />
                    <ActivityItem title="Gastos y retiros" amount={`-${formatCurrency(toNumber(cashSummary?.expenses) + toNumber(cashSummary?.withdrawals))}`} negative />
                    <div className="mt-1 rounded-xl bg-gradient-to-r from-green-600 to-green-700 p-4 text-white">
                      <p className="text-xs font-medium text-white/70">Efectivo neto estimado</p>
                      <p className="mt-0.5 text-2xl font-bold">{formatCurrency(netCash)}</p>
                    </div>
                  </div>
                </Card>
                </SectionErrorBoundary>
                <SectionErrorBoundary title="No se pudo cargar la actividad por día" message="La gráfica no está disponible en este momento.">
                <Card>
                  <SectionTitle title="Dispensaciones por día" action={<div className="flex rounded-lg border border-border-light bg-bg-soft p-1">{[7, 30].map((range) => (<button key={range} className={`rounded-md px-3 py-1.5 text-sm font-medium ${chartRange === range ? 'bg-white text-text-primary shadow-sm' : 'text-text-muted'}`} onClick={() => setChartRange(range as ChartRange)}>{range} días</button>))}</div>} />
                  {salesSeries.some((item) => item.total > 0) ? (
                    <MeasuredChart className="h-72" minHeight={240}>
                      {({ width, height }) => (
                        <BarChart width={width} height={height} data={salesSeries}>
                          <CartesianGrid stroke="#E5E7EB" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `${value} CR`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
                          <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      )}
                    </MeasuredChart>
                  ) : (
                    <EmptyState title="Aún no hay suficientes dispensaciones para generar la gráfica." />
                  )}
                </Card>
                </SectionErrorBoundary>
              </div>
            ),
            activity: (
              <SectionErrorBoundary title="No se pudo cargar la actividad reciente" message="Recarga esta sección para consultar las últimas operaciones.">
              <Card>
                <SectionTitle title="Actividad reciente" action={<Badge variant="secondary">Dispensaciones y caja</Badge>} />
                <div className="space-y-2">
                  {(summary?.lastSales ?? []).slice(0, 4).map((sale) => (
                    <ActivityItem key={String(sale.id)} title={`Dispensación #${shortId(sale.id)} · ${saleMemberName(sale)}`} meta={formatDate(sale.createdAt)} amount={formatCurrency(sale.total)} />
                  ))}
                  {cashMovements.slice(0, 4).map((movement: CashMovement) => (
                    <ActivityItem key={movement.id} title={movement.type === 'RECEIVABLE_CASH_IN' ? 'Registro de aportación pendiente' : movement.type === 'THIRD_PARTY_CASH_OUT' ? 'Aportación a tercero' : movement.type} meta={formatDate(movement.createdAt)} amount={`${['THIRD_PARTY_CASH_OUT', 'EXPENSE', 'WITHDRAWAL', 'CASH_OUT', 'CORRECTION_OUT'].includes(movement.type) ? '-' : ''}${formatCurrency(movement.amount)}`} negative={['THIRD_PARTY_CASH_OUT', 'EXPENSE', 'WITHDRAWAL', 'CASH_OUT', 'CORRECTION_OUT'].includes(movement.type)} />
                  ))}
                  {!summary?.lastSales?.length && !cashMovements.length ? <EmptyState title="Sin actividad reciente" /> : null}
                </div>
              </Card>
              </SectionErrorBoundary>
            ),
            pending: (
              <SectionErrorBoundary title="No se pudieron cargar las operaciones pendientes" message="Recarga esta sección para revisar inventario y aportaciones.">
              <Card>
                <SectionTitle title="Operaciones pendientes" action={<Badge variant="secondary">Inventario y aportaciones</Badge>} />
                <div className="space-y-2">
                  {receivables.slice(0, 4).map((receivable: Receivable) => (
                    <ActivityItem key={receivable.id} title={`Cuenta pendiente · ${`${receivable.member?.firstName ?? 'Socio'} ${receivable.member?.lastName ?? ''}`.trim()}`} meta={formatDate(receivable.createdAt)} amount={formatCurrency(receivable.outstandingAmount)} />
                  ))}
                  {inventoryMovements.slice(0, 4).map((movement: InventoryMovement) => (
                    <ActivityItem key={movement.id} title={`${movement.type === 'WASTE' ? 'Merma registrada' : movement.type} · ${movement.product?.name ?? 'Producto'}`} meta={formatDate(movement.createdAt)} amount={String(movement.quantity)} negative={['WASTE', 'LOSS', 'DAMAGED', 'SALE'].includes(movement.type)} />
                  ))}
                  {!receivables.length && !inventoryMovements.length ? <EmptyState title="Sin operaciones pendientes" /> : null}
                </div>
              </Card>
              </SectionErrorBoundary>
            ),
            quickActions: (
              <SectionErrorBoundary title="No se pudieron cargar las acciones rápidas" message="Recarga esta sección para volver a intentarlo.">
              <Card>
                <SectionTitle title="Acciones rápidas" />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.label} href={action.href} className="flex items-center gap-3 rounded-xl border border-border-light bg-white p-3 text-sm font-medium text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-lighter/30 hover:text-brand-primary">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-lighter text-brand-primary">
                          <Icon size={16} />
                        </div>
                        {action.label}
                      </Link>
                    );
                  })}
                </div>
              </Card>
              </SectionErrorBoundary>
            ),
          };

          const content = sectionContent[sectionId];
          if (!content) return null;

          return (
            <div
              key={sectionId}
              draggable={configOpen}
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', sectionId); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData('text/plain') as DashboardSectionId;
                if (from === sectionId) return;
                const next = [...sectionOrder];
                const fromIdx = next.indexOf(from);
                const toIdx = next.indexOf(sectionId);
                if (fromIdx === -1 || toIdx === -1) return;
                next.splice(fromIdx, 1);
                next.splice(toIdx, 0, from);
                setSectionOrder(next);
                saveDashboardPrefs(next, hiddenSections);
              }}
              className={configOpen ? 'rounded-xl ring-2 ring-dashed ring-border-light transition-shadow hover:ring-brand-primary/40' : ''}
            >
              {content}
            </div>
          );
        })}
      </div>
    </ProtectedLayout>
  );
}

