'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minimize } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThirdPartyPaymentModal } from '@/components/third-party-payments/ThirdPartyPaymentModal';
import { KioskChatWidget } from './components/kiosk-chat-widget';
import { useMemberReceivables, usePayReceivable } from '@/hooks/useReceivables';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { ApiError, apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { QK } from '@/lib/query-keys';
import { formatCurrency, formatDate } from '@/lib/format';
import { playSound } from '@/hooks/useSound';
import { getMemberDisplayName } from '@/lib/members';
import type { CartItem, Member, MemberClassBenefit, PosSession, Product, SaleResponse } from '@/lib/types';
import {
  amountToKg,
  gramsToKg,
  isKgProduct,
  kgToAmount,
  kgToGrams,
  roundKg,
  roundMoney as roundWeightMoney,
  type AddCartInput,
} from '@/lib/weight';
import { useAuth } from '@/providers/auth-provider';
import { useSettings } from '@/hooks/useSettings';
import { useMemberClasses } from '@/hooks/useMemberClasses';
import { CartPanel } from './components/cart-panel';
import { CashStatusBar } from './components/cash-status-bar';
import { CashDetailsModal } from './components/cash-details-modal';
import { MemberSelector } from './components/member-selector';
import { getProductStock, roundMoney, toNumber } from './components/pos-metrics';
import { ProductGrid } from './components/product-grid';
import { SaleReceiptModal } from './components/sale-receipt-modal';
import { OpenCashModal } from './components/open-cash-modal';
type MobilePosTab = 'member' | 'products' | 'cart';

import { ScaleVerificationModal } from './components/scale-verification-modal';
import { PosMobileBottomBar } from './components/pos-mobile-bottom-bar';

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PosPage() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<PosSession | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [creditReason, setCreditReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null);
  const [lastPaymentAmount, setLastPaymentAmount] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [openCashError, setOpenCashError] = useState<string | null>(null);
  const [showCashDetails, setShowCashDetails] = useState(false);
  const [closeCashResult, setCloseCashResult] = useState<PosSession | null>(null);
  const [closingCash, setClosingCash] = useState(false);
  const [closeCashError, setCloseCashError] = useState<string | null>(null);
  const [showScaleVerification, setShowScaleVerification] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobilePosTab>('products');
  const [memberBenefits, setMemberBenefits] = useState<MemberClassBenefit[]>([]);
  const [kioskMode, setKioskMode] = useState(false);
  const { data: settingsData } = useSettings();
  const scaleSettings = settingsData?.settings;
  const { data: memberClassConfigs } = useMemberClasses();

  const loadSession = useCallback(async () => {
    setSessionLoading(true);

    try {
      const currentSession = await apiFetch<PosSession>('/pos/sessions/current');
      setSession(currentSession);
    } catch {
      setSession(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const searchMembers = useCallback(async (query = '') => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      const response = await apiFetch<Member[]>(
        `/members/search?q=${encodeURIComponent(query)}`,
      );
      setMembers(response);
    } catch (error) {
      setMembers([]);
      setMembersError(
        error instanceof ApiError && error.status === 403
          ? 'Tu usuario no tiene permiso para buscar socios.'
          : getErrorMessage(error, 'No se pudieron cargar los socios.'),
      );
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);

    try {
      const response = await apiFetch<Product[]>('/products');
      setProducts(response);
    } catch (error) {
      setProducts([]);
      setProductsError(getErrorMessage(error, 'No se pudieron cargar los productos.'));
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSession(), searchMembers(''), loadProducts()]);
  }, [loadProducts, loadSession, searchMembers]);

  useEffect(() => {
    apiFetch<MemberClassBenefit[]>('/members/benefits/config')
      .then(setMemberBenefits)
      .catch(() => {
        // Beneficios opcionales — no bloquea el POS si falla
      });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      searchMembers(memberQuery);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [memberQuery, searchMembers]);

  const selectedMemberName = selectedMember
    ? `${selectedMember.memberNumber ? `${selectedMember.memberNumber} - ` : ''}${getMemberDisplayName(selectedMember)}`.trim()
    : null;

  const subtotal = useMemo(
    () =>
      roundMoney(
        cart.reduce(
          (sum, item) => sum + (item.total ?? toNumber(item.product.price) * item.quantity),
          0,
        ),
      ),
    [cart],
  );

  const discountAmount = Math.max(0, toNumber(discount));
  const total = Math.max(0, roundMoney(subtotal - discountAmount));
  const bulkCartItems = useMemo(
    () => cart.filter((item) => isKgProduct(item.product.unitType)),
    [cart],
  );
  const scaleVerificationEnabled = Boolean(scaleSettings?.scaleVerificationEnabled ?? true);
  const requireScaleVerification = Boolean(scaleSettings?.requireScaleVerification ?? true);
  const hasPendingScaleVerification =
    scaleVerificationEnabled &&
    bulkCartItems.some((item) => !item.scaleVerified || !item.actualWeightGrams);

  useEffect(() => {
    setPaymentAmount(String(total));
  }, [total]);

  async function openSession(openingCash: number) {
    setOpenCashError(null);
    setMessage(null);

    try {
      const openedSession = await apiFetch<PosSession>('/pos/sessions/open', {
        method: 'POST',
        body: { openingCash },
      });
      setSession(openedSession);
      setShowOpenCash(false);
      toast.success('Caja abierta correctamente.');
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
    } catch (error) {
      setOpenCashError(getErrorMessage(error, 'No se pudo abrir la caja.'));
    }
  }

  function showOpenCashModal() {
    setShowOpenCash(true);
    setOpenCashError(null);
  }

  function showCashDetailsModal() {
    setShowCashDetails(true);
  }

  function selectMember(member: Member) {
    setSelectedMember(member);
    setMobileTab('products');

    const classConfig = memberClassConfigs?.find((c) => c.memberClass === (member.memberClass ?? 'STANDARD'));
    if (classConfig && classConfig.suggestedBonification > 0) {
      setDiscount(String(classConfig.suggestedBonification));
    }
  }

  function getCartQuantity(productId: string) {
    return cart.find((item) => item.product.id === productId)?.quantity ?? 0;
  }

  function normalizeCartInput(product: Product, input: AddCartInput = 1) {
    const price = toNumber(product.price);

    if (isKgProduct(product.unitType)) {
      const nextInput = typeof input === 'number' ? { quantityKg: input } : input;

      if (nextInput.amountEuros !== undefined) {
        const amount = roundWeightMoney(Math.max(0, nextInput.amountEuros));
        const quantity = amountToKg(amount, price);

        return {
          quantity,
          total: amount,
          pricingMode: 'BY_AMOUNT' as const,
          requestedAmount: amount,
        };
      }

      const quantity =
        nextInput.quantityKg ??
        (nextInput.quantityGrams === undefined ? undefined : gramsToKg(nextInput.quantityGrams)) ??
        nextInput.quantityUnits ??
        0;

      return {
        quantity: roundKg(quantity),
        total: kgToAmount(quantity, price),
        pricingMode: 'BY_WEIGHT' as const,
        requestedAmount: undefined,
      };
    }

    const quantity = typeof input === 'number' ? input : input.quantityUnits ?? 1;

    return {
      quantity,
      total: roundWeightMoney(price * quantity),
      pricingMode: 'BY_UNIT' as const,
      requestedAmount: undefined,
    };
  }

  function addToCart(product: Product, input: AddCartInput = 1) {
    setCheckoutError(null);
    setMessage(null);

    const stock = getProductStock(product);
    const normalized = normalizeCartInput(product, input);

    if (stock <= 0) {
      setCheckoutError(`No hay stock disponible para ${product.name}.`);
      return;
    }

    if (normalized.quantity <= 0) {
      setCheckoutError(`Introduce una cantidad válida para ${product.name}.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (existing) {
        const nextQuantity = isKgProduct(product.unitType)
          ? roundKg(existing.quantity + normalized.quantity)
          : roundMoney(existing.quantity + normalized.quantity);

        if (nextQuantity > stock) {
          setCheckoutError(`Stock insuficiente para ${product.name}. Disponible: ${stock}`);
          return current;
        }

        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: nextQuantity,
                total: roundWeightMoney((item.total ?? 0) + normalized.total),
                pricingMode: normalized.pricingMode,
                requestedAmount:
                  normalized.requestedAmount === undefined
                    ? item.requestedAmount
                    : roundWeightMoney((item.requestedAmount ?? 0) + normalized.requestedAmount),
                actualWeightGrams: undefined,
                scaleVerified: false,
                scaleToleranceExceeded: false,
                scaleOverrideReason: undefined,
              }
            : item,
        );
      }

      const quantity = Math.min(normalized.quantity, stock);
      return [
        ...current,
        {
          product,
          quantity,
          pricingMode: normalized.pricingMode,
          requestedAmount: normalized.requestedAmount,
          total:
            quantity === normalized.quantity
              ? normalized.total
              : kgToAmount(quantity, toNumber(product.price)),
          actualWeightGrams: undefined,
          scaleVerified: !isKgProduct(product.unitType) || !scaleVerificationEnabled,
        },
      ];
    });
  }

  function changeQuantity(productId: string, quantity: number) {
    setCheckoutError(null);

    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          const stock = getProductStock(item.product);
          const minQuantity = isKgProduct(item.product.unitType) ? 0.000001 : 1;
          const nextQuantity = Math.min(Math.max(minQuantity, quantity || minQuantity), stock);

          if (quantity > stock) {
            setCheckoutError(
              `Stock insuficiente para ${item.product.name}. Disponible: ${stock}`,
            );
          }

          return {
            ...item,
            quantity: nextQuantity,
            pricingMode: isKgProduct(item.product.unitType) ? 'BY_WEIGHT' : item.pricingMode,
            requestedAmount: undefined,
            total: kgToAmount(nextQuantity, toNumber(item.product.price)),
            actualWeightGrams: undefined,
            scaleVerified: false,
            scaleToleranceExceeded: false,
            scaleOverrideReason: undefined,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  }

  function updateScaleWeight(productId: string, weightGrams: number) {
    const maxWasteGrams = scaleSettings?.maxWastePerLineGrams ?? 0.05;
    const maxWastePercent = scaleSettings?.maxWastePercent ?? 5;

    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        const requestedGrams = kgToGrams(item.quantity);
        const diff = weightGrams - requestedGrams;
        const maxAllowed = Math.max(maxWasteGrams, requestedGrams * (maxWastePercent / 100));

        return {
          ...item,
          actualWeightGrams: weightGrams > 0 ? weightGrams : undefined,
          scaleVerified: weightGrams > 0,
          scaleToleranceExceeded: diff > maxAllowed,
        };
      }),
    );
  }

  function updateScaleOverrideReason(productId: string, reason: string) {
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              scaleOverrideReason: reason,
            }
          : item,
      ),
    );
  }

  function confirmScaleWeights() {
    setShowScaleVerification(false);
    setCheckoutError(null);
    toast.success('Pesos verificados.');
  }

  async function checkout() {
    setCheckoutError(null);
    setMessage(null);

    if (!session) {
      setCheckoutError('Abre caja antes de registrar la aportación.');
      return;
    }

    if (!selectedMember) {
      setCheckoutError('Selecciona un socio activo antes de registrar la aportación.');
      return;
    }

    if (selectedMember.status !== 'ACTIVE') {
      setCheckoutError('Solo puedes dispensar a socios activos.');
      return;
    }

    if (cart.length === 0) {
      setCheckoutError('Añade al menos un producto a la selección.');
      return;
    }

    if (discountAmount > subtotal) {
      setCheckoutError('La bonificacion no puede superar el subtotal.');
      return;
    }

    const payment = roundMoney(toNumber(paymentAmount));
    const pending = roundMoney(Math.max(total - payment, 0));

    if (payment < 0) {
      setCheckoutError('El efectivo cobrado no puede ser negativo.');
      return;
    }

    if (pending > 0 && !creditReason.trim()) {
      setCheckoutError('Indica un motivo para dejar importe pendiente.');
      return;
    }

    const itemWithInsufficientStock = cart.find(
      (item) => item.quantity > getProductStock(item.product),
    );

    if (itemWithInsufficientStock) {
      setCheckoutError(
        `Stock insuficiente para ${itemWithInsufficientStock.product.name}.`,
      );
      return;
    }

    if (scaleVerificationEnabled && requireScaleVerification && hasPendingScaleVerification) {
      setShowScaleVerification(true);
      return;
    }

    setSubmittingSale(true);
    const toastId = toast.loading('Validando socio...');

    try {
      await wait(250);
      toast.loading('Registrando dispensación...', { id: toastId });

      const saleRequest = apiFetch<SaleResponse>('/pos/sales', {
        method: 'POST',
        body: {
          memberId: selectedMember.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            ...(isKgProduct(item.product.unitType)
              ? item.pricingMode === 'BY_AMOUNT' && item.requestedAmount
                ? {
                    amountEuros: item.requestedAmount,
                    pricingMode: 'BY_AMOUNT',
                    actualWeightGrams: item.actualWeightGrams,
                    scaleVerified: Boolean(item.scaleVerified),
                    scaleOverrideReason: item.scaleOverrideReason,
                  }
                : {
                    quantityKg: item.quantity,
                    pricingMode: 'BY_WEIGHT',
                    actualWeightGrams: item.actualWeightGrams,
                    scaleVerified: Boolean(item.scaleVerified),
                    scaleOverrideReason: item.scaleOverrideReason,
                  }
              : { quantity: item.quantity }),
          })),
          discount: discountAmount,
          cashReceived: payment,
          creditReason: pending > 0 ? creditReason.trim() : undefined,
          dueDate: pending > 0 && dueDate ? dueDate : undefined,
        },
      });

      await wait(300);
      toast.loading('Actualizando stock...', { id: toastId });
      await wait(300);
      toast.loading('Guardando auditoría...', { id: toastId });

      const sale = await saleRequest;

      setCart([]);
      setSelectedMember(null);
      setMemberQuery('');
      setDiscount('0');
      setPaymentAmount('0');
      setCreditReason('');
      setDueDate('');
      setMessage('Dispensación registrada correctamente.');
      setLastSale(sale);
      setLastPaymentAmount(payment);
      setShowReceipt(true);
      playSound('sale');
      toast.success('Dispensación completada correctamente.', { id: toastId });
      queryClient.invalidateQueries({ queryKey: QK.products.all });
      queryClient.invalidateQueries({ queryKey: QK.inventory.all });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
      queryClient.invalidateQueries({ queryKey: QK.members.all });
      queryClient.invalidateQueries({ queryKey: QK.receivables.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all });
      await Promise.all([loadProducts(), loadSession()]);
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'No se pudo registrar la dispensación.');
      setCheckoutError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setSubmittingSale(false);
    }
  }

  async function closeCurrentSession(closingCashAmount: number, signature?: string, reason?: string) {
    if (!session) {
      setCloseCashError('No hay una caja abierta para cerrar.');
      return;
    }

    setClosingCash(true);
    setCloseCashError(null);
    const toastId = toast.loading('Calculando efectivo esperado...');

    try {
      await wait(250);
      toast.loading('Validando cierre...', { id: toastId });

      const closeRequest = apiFetch<PosSession>(
        `/pos/sessions/${session.id}/close`,
        {
          method: 'POST',
          body: {
            closingCash: closingCashAmount,
            ...(signature ? { closingSignature: signature } : {}),
            ...(reason ? { discrepancyReason: reason } : {}),
          },
        },
      );

      await wait(250);
      toast.loading('Guardando auditoría...', { id: toastId });

      const result = await closeRequest;

      setCloseCashResult(result);
      setSession(null);
      setCart([]);
      setSelectedMember(null);
      setMemberQuery('');
      setDiscount('0');
      setPaymentAmount('0');
      setCreditReason('');
      setDueDate('');
      toast.success('Caja cerrada correctamente.', { id: toastId });
      queryClient.invalidateQueries({ queryKey: QK.pos.currentSession });
      queryClient.invalidateQueries({ queryKey: QK.cash.all });
      queryClient.invalidateQueries({ queryKey: QK.dashboard.all });
      queryClient.invalidateQueries({ queryKey: QK.analytics.all });
      await loadProducts();
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'No se pudo cerrar la caja.');
      setCloseCashError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setClosingCash(false);
    }
  }

  function dismissCloseCashModal() {
    setShowCashDetails(false);
    setCloseCashResult(null);
    setCloseCashError(null);
  }

  function closeReceiptForNewSale() {
    setShowReceipt(false);
    setLastSale(null);
      setLastPaymentAmount(null);
      setCreditReason('');
      setDueDate('');
      setMessage(null);
  }

  function toggleKioskMode() {
    if (!kioskMode) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setKioskMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setKioskMode(false);
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setKioskMode(false);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const [kioskThirdPartyOpen, setKioskThirdPartyOpen] = useState(false);
  const [kioskReceivablesOpen, setKioskReceivablesOpen] = useState(false);
  const [kioskChatOpen, setKioskChatOpen] = useState(false);

  const kioskTheme = useMemo(() => {
    const pc = settingsData?.settings?.primaryColor;
    const ac = settingsData?.settings?.accentColor;
    if (!pc && !ac) return {};
    const hex = (v?: string | null) => {
      const n = v?.trim().replace('#', '');
      if (!n || !/^[0-9a-fA-F]{6}$/.test(n)) return null;
      return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)] as const;
    };
    const rgb = (c: readonly [number, number, number]) => c.join(' ');
    const light = (c: readonly [number, number, number], a: number) => c.map(ch => Math.round(ch + (255 - ch) * a)) as [number, number, number];
    const dark = (c: readonly [number, number, number], a: number) => c.map(ch => Math.round(ch * (1 - a))) as [number, number, number];
    const bp = hex(pc) ?? [21, 20, 15] as const;
    const bh = hex(ac) ?? dark(bp, 0.15);
    return {
      '--primary': pc || '#FFE600',
      '--ring': pc || '#FFE600',
      '--brand-primary-rgb': rgb(bp),
      '--brand-hover-rgb': rgb(bh),
      '--brand-light-rgb': rgb(light(bp, 0.65)),
      '--brand-lighter-rgb': rgb(light(bp, 0.88)),
    } as React.CSSProperties;
  }, [settingsData?.settings?.primaryColor, settingsData?.settings?.accentColor]);

  if (kioskMode) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#F2EFE6] overflow-hidden" style={kioskTheme}>
        {/* ── Top bar ─────────────────────────────────────── */}
        <header className="flex items-center gap-2 border-b border-border-light bg-white px-2 py-1.5 sm:px-3">
          <img src="/branding/q-badge.svg" alt="" className="h-6 w-6 rounded-md shrink-0" />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${session ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className="text-[11px] text-text-secondary truncate">
              {session ? (
                <><strong className="text-text-primary">{formatCurrency(Number(session.cashSummary?.expectedCash ?? session.openingCash ?? 0))}</strong> · {session.sales?.length ?? 0} ops</>
              ) : 'Caja cerrada'}
            </span>
          </div>

          {/* Action icons — subtle, right-aligned */}
          <div className="flex items-center shrink-0">
            {session ? (
              <>
                <button type="button" onClick={() => setKioskReceivablesOpen(true)} title="Cobrar pendientes"
                  className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[#FFE600]/10 hover:text-[#15140F]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </button>
                <button type="button" onClick={() => setKioskThirdPartyOpen(true)} title="Pago a tercero"
                  className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[#FFE600]/10 hover:text-[#15140F]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                </button>
                <button type="button" onClick={() => setKioskChatOpen(!kioskChatOpen)} title="Chat interno"
                  className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${kioskChatOpen ? 'bg-[#FFE600]/15 text-[#15140F]' : 'text-text-muted hover:bg-[#FFE600]/10 hover:text-[#15140F]'}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </button>
                <div className="mx-1 h-4 w-px bg-border-light" />
                <button type="button" onClick={showCashDetailsModal} title="Ver caja"
                  className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-[#FFE600]/10 hover:text-[#15140F]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </button>
              </>
            ) : (
              <Button size="sm" onClick={showOpenCashModal} className="h-7 text-[11px] px-2.5">Abrir caja</Button>
            )}
            <button type="button" onClick={toggleKioskMode} title="Salir de pantalla completa"
              className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-500">
              <Minimize size={14} />
            </button>
          </div>
        </header>

        {/* ── Mobile tabs ─────────────────────────────────── */}
        <div className="flex gap-1 border-b border-border-light bg-white px-2 py-1 md:hidden" role="tablist">
          {(['member', 'products', 'cart'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={mobileTab === t}
              onClick={() => setMobileTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${mobileTab === t ? 'bg-[#FFE600]/15 text-[#15140F]' : 'text-text-muted'}`}
            >
              {t === 'member' ? 'Socio' : t === 'products' ? 'Productos' : `Carrito (${cart.length})`}
            </button>
          ))}
        </div>

        {/* ── Main layout ─────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* 3-column POS grid */}
          <div className="flex-1 overflow-hidden">
            <div className="grid h-full grid-cols-1 gap-1.5 p-1.5 md:grid-cols-[220px_minmax(0,1fr)_300px] lg:grid-cols-[260px_minmax(0,1fr)_360px]">
              <div className={`overflow-y-auto rounded-xl border border-border-light bg-white ${mobileTab === 'member' ? 'block' : 'hidden'} md:block`}>
                <MemberSelector
                  members={members} query={memberQuery} selectedMember={selectedMember}
                  loading={membersLoading} error={membersError} benefits={memberBenefits}
                  onQueryChange={setMemberQuery} onSelectMember={selectMember}
                  onClearMember={() => { setSelectedMember(null); setDiscount('0'); }}
                />
              </div>
              <div className={`overflow-y-auto ${mobileTab === 'products' ? 'block' : 'hidden'} md:block`}>
                <ProductGrid products={products} loading={productsLoading} error={productsError} onAddProduct={addToCart} getCartQuantity={getCartQuantity} />
              </div>
              <div className={`overflow-y-auto rounded-xl border border-border-light bg-white ${mobileTab === 'cart' ? 'block' : 'hidden'} md:block`}>
                <CartPanel
                  cart={cart} selectedMemberName={selectedMemberName} selectedMemberStatus={selectedMember?.status}
                  hasOpenSession={Boolean(session)} discount={discount} paymentAmount={paymentAmount}
                  creditReason={creditReason} dueDate={dueDate} subtotal={subtotal} total={total}
                  message={message} error={checkoutError} submitting={submittingSale}
                  onDiscountChange={setDiscount} onPaymentAmountChange={setPaymentAmount}
                  onCreditReasonChange={setCreditReason} onDueDateChange={setDueDate}
                  onQuantityChange={changeQuantity} onRemoveItem={removeItem} onCheckout={checkout}
                  hasPendingScaleVerification={scaleVerificationEnabled && requireScaleVerification && hasPendingScaleVerification}
                />
              </div>
            </div>
          </div>

          {/* ── Chat widget panel ─────────────────────────── */}
          {kioskChatOpen ? (
            <div className="hidden w-[320px] shrink-0 border-l border-border-light bg-white md:flex md:flex-col">
              <KioskChatWidget onClose={() => setKioskChatOpen(false)} />
            </div>
          ) : null}
        </div>

        {/* ── Mobile bottom bar ───────────────────────────── */}
        <div className="border-t border-border-light bg-white px-3 py-1.5 md:hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-[11px] text-text-muted">{selectedMember ? getMemberDisplayName(selectedMember) : 'Sin socio'}</p>
              <p className="text-base font-bold text-[#15140F]">{formatCurrency(total)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {session ? (
                <>
                  <button type="button" onClick={() => setKioskReceivablesOpen(true)} aria-label="Cobros"
                    className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-[#FFE600]/10 hover:text-[#15140F]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </button>
                  <button type="button" onClick={() => setKioskThirdPartyOpen(true)} aria-label="Terceros"
                    className="grid h-8 w-8 place-items-center rounded-lg text-text-muted hover:bg-[#FFE600]/10 hover:text-[#15140F]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                  </button>
                </>
              ) : null}
              <Button size="sm" disabled={!session || cart.length === 0 || submittingSale} onClick={checkout}
                className="h-8 bg-[#15140F] text-[11px] text-white hover:bg-[#2A2820]">
                {submittingSale ? '...' : 'Dispensar'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Branding strip ──────────────────────────────── */}
        <div className="hidden items-center justify-between bg-[#15140F] px-3 py-0.5 md:flex">
          <div className="flex items-center gap-1.5">
            <img src="/branding/q-badge.svg" alt="" className="h-2.5 w-2.5 rounded-[2px]" />
            <span className="text-[8px] text-white/30">QuickPanel360</span>
          </div>
          <span className="text-[8px] text-white/20">Powered by QuickAgence</span>
        </div>

        {/* ── Modals ──────────────────────────────────────── */}
        <OpenCashModal open={showOpenCash} loading={sessionLoading} error={openCashError} onClose={() => setShowOpenCash(false)} onConfirm={openSession} />
        {session ? <CashDetailsModal open={showCashDetails} session={session} result={closeCashResult} closing={closingCash} error={closeCashError} onClose={dismissCloseCashModal} onCloseCash={closeCurrentSession} /> : null}
        {lastSale && showReceipt ? <SaleReceiptModal sale={lastSale} cashReceived={lastPaymentAmount ?? undefined} employeeName={user?.name} onClose={() => setShowReceipt(false)} onNewSale={closeReceiptForNewSale} /> : null}
        <ScaleVerificationModal open={showScaleVerification} items={bulkCartItems} settings={scaleSettings} canOverride={hasPermission('pos.scale.override')} onClose={() => setShowScaleVerification(false)} onWeightChange={updateScaleWeight} onOverrideReasonChange={updateScaleOverrideReason} onConfirm={confirmScaleWeights} />
        {session ? <ThirdPartyPaymentModal open={kioskThirdPartyOpen} onOpenChange={setKioskThirdPartyOpen} canCreateThirdParty={hasPermission('third_party_payment.create')} /> : null}
        {kioskReceivablesOpen ? (
          <KioskReceivablesDialog
            open={kioskReceivablesOpen}
            memberId={selectedMember?.id}
            memberName={selectedMember ? getMemberDisplayName(selectedMember) : undefined}
            onClose={() => setKioskReceivablesOpen(false)}
            onSelectMember={() => { setKioskReceivablesOpen(false); setMobileTab('member'); }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <ProtectedLayout>
      <div className="flex min-h-[100dvh] flex-col bg-[#FAF8F2]">
        {/* Status Bar */}
        <CashStatusBar
          session={session}
          loading={sessionLoading}
          onOpenCash={showOpenCashModal}
          onViewCash={showCashDetailsModal}
          onToggleKiosk={toggleKioskMode}
        />

        {/* Mobile Tab Switcher */}
        <div className="border-b border-border-light bg-white px-3 py-2 lg:hidden">
          <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                ['member', 'Socio', null],
                ['products', 'Productos', null],
                ['cart', 'Selección', cart.length || null],
              ] as const
            ).map(([id, label, badge]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mobileTab === id}
                onClick={() => setMobileTab(id as MobilePosTab)}
                className={`relative flex h-10 items-center justify-center gap-1 rounded-lg text-sm font-semibold transition-all ${
                  mobileTab === id
                    ? 'bg-white text-brand-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
                {badge ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Mobile context strip */}
          <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {selectedMember
                  ? getMemberDisplayName(selectedMember)
                  : 'Sin socio seleccionado'}
              </p>
              <p className="text-xs text-text-muted">
                {session ? 'Caja abierta' : 'Caja cerrada'}
              </p>
            </div>
            <p className="shrink-0 text-lg font-bold text-brand-primary">{formatCurrency(total)}</p>
          </div>
        </div>

        {/* Main 3-column Layout */}
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-0 xl:overflow-hidden">
          <div className="grid min-h-0 grid-cols-1 gap-3 p-2 sm:p-3 lg:grid-cols-[minmax(230px,260px)_minmax(0,1fr)] xl:h-[calc(100dvh-5rem)] xl:grid-cols-[260px_minmax(0,1fr)_340px]">
            {/* Left: Member Selector */}
            <div className={`min-w-0 flex-col overflow-visible lg:flex lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto ${mobileTab === 'member' ? 'flex' : 'hidden'}`}>
              <MemberSelector
                members={members}
                query={memberQuery}
                selectedMember={selectedMember}
                loading={membersLoading}
                error={membersError}
                benefits={memberBenefits}
                onQueryChange={setMemberQuery}
                onSelectMember={selectMember}
                onClearMember={() => { setSelectedMember(null); setDiscount('0'); }}
              />
            </div>

            {/* Center: Product Grid */}
            <div className={`min-w-0 overflow-visible lg:block xl:overflow-y-auto ${mobileTab === 'products' ? 'block' : 'hidden'}`}>
              <ProductGrid
                products={products}
                loading={productsLoading}
                error={productsError}
                onAddProduct={addToCart}
                getCartQuantity={getCartQuantity}
              />
            </div>

            {/* Right: Cart Panel */}
            <div className={`min-w-0 overflow-visible lg:col-span-2 lg:block xl:sticky xl:top-0 xl:col-span-1 xl:h-full xl:overflow-y-auto ${mobileTab === 'cart' ? 'block' : 'hidden'}`}>
              <CartPanel
                cart={cart}
                selectedMemberName={selectedMemberName}
                selectedMemberStatus={selectedMember?.status}
                hasOpenSession={Boolean(session)}
                discount={discount}
                paymentAmount={paymentAmount}
                creditReason={creditReason}
                dueDate={dueDate}
                subtotal={subtotal}
                total={total}
                message={message}
                error={checkoutError}
                submitting={submittingSale}
                onDiscountChange={setDiscount}
                onPaymentAmountChange={setPaymentAmount}
                onCreditReasonChange={setCreditReason}
                onDueDateChange={setDueDate}
                onQuantityChange={changeQuantity}
                onRemoveItem={removeItem}
                onCheckout={checkout}
                hasPendingScaleVerification={
                  scaleVerificationEnabled && requireScaleVerification && hasPendingScaleVerification
                }
              />
            </div>
          </div>
        </div>
      </div>

      <PosMobileBottomBar
        cartCount={cart.length}
        total={total}
        hasOpenSession={Boolean(session)}
        hasSelectedMember={Boolean(selectedMember)}
        hasPendingScaleVerification={
          scaleVerificationEnabled && requireScaleVerification && hasPendingScaleVerification
        }
        activeTab={mobileTab}
        submitting={submittingSale}
        onOpenCash={showOpenCashModal}
        onSelectMember={() => setMobileTab('member')}
        onOpenCart={() => setMobileTab('cart')}
        onCheckout={checkout}
      />

      {/* Open Cash Modal */}
      <OpenCashModal
        open={showOpenCash}
        loading={sessionLoading}
        error={openCashError}
        onClose={() => setShowOpenCash(false)}
        onConfirm={openSession}
      />

      {/* Cash Details Modal */}
      {session ? (
        <CashDetailsModal
          open={showCashDetails}
          session={session}
          result={closeCashResult}
          closing={closingCash}
          error={closeCashError}
          onClose={dismissCloseCashModal}
          onCloseCash={closeCurrentSession}
        />
      ) : null}

      {/* Sale Receipt Modal */}
      {lastSale && showReceipt ? (
        <SaleReceiptModal
          sale={lastSale}
          cashReceived={lastPaymentAmount ?? undefined}
          employeeName={user?.name}
          onClose={() => setShowReceipt(false)}
          onNewSale={closeReceiptForNewSale}
        />
      ) : null}

      <ScaleVerificationModal
        open={showScaleVerification}
        items={bulkCartItems}
        settings={scaleSettings}
        canOverride={hasPermission('pos.scale.override')}
        onClose={() => setShowScaleVerification(false)}
        onWeightChange={updateScaleWeight}
        onOverrideReasonChange={updateScaleOverrideReason}
        onConfirm={confirmScaleWeights}
      />
    </ProtectedLayout>
  );
}

function KioskReceivablesDialog({
  open,
  memberId,
  memberName,
  onClose,
  onSelectMember,
}: {
  open: boolean;
  memberId?: string;
  memberName?: string;
  onClose: () => void;
  onSelectMember: () => void;
}) {
  const receivablesQuery = useMemberReceivables(memberId, open && Boolean(memberId));
  const payMutation = usePayReceivable();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const receivables = (receivablesQuery.data?.receivables ?? []).filter(
    (r) => r.status === 'OPEN' || r.status === 'PARTIALLY_PAID' || r.status === 'OVERDUE',
  );

  async function handlePay() {
    if (!payingId || !payAmount) return;
    try {
      await payMutation.mutateAsync({ id: payingId, body: { amount: Number(payAmount) } });
      toast.success('Aportacion registrada');
      setPayingId(null);
      setPayAmount('');
    } catch {
      toast.error('No se pudo registrar la aportacion');
    }
  }

  if (!memberId) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrar pendientes</DialogTitle>
            <DialogDescription>Selecciona un socio primero para ver sus cuentas pendientes.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onSelectMember}>Seleccionar socio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cuentas pendientes</DialogTitle>
          <DialogDescription>{memberName ?? 'Socio'} - {receivables.length} pendiente{receivables.length !== 1 ? 's' : ''}</DialogDescription>
        </DialogHeader>

        {receivablesQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-text-muted">Cargando...</p>
        ) : receivables.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-text-primary">Sin cuentas pendientes</p>
            <p className="mt-1 text-xs text-text-muted">Este socio no tiene aportaciones pendientes de cobro.</p>
          </div>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {receivables.map((r) => {
              const outstanding = Number(r.outstandingAmount);
              const isPaying = payingId === r.id;
              return (
                <div key={r.id} className="rounded-xl border border-border-light p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">{formatCurrency(outstanding)} pendiente</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        Original: {formatCurrency(r.originalAmount)} · Pagado: {formatCurrency(r.paidAmount)}
                        {r.reason ? ` · ${r.reason}` : ''}
                      </p>
                      {r.dueDate ? <p className="text-[10px] text-amber-600">Vence: {formatDate(r.dueDate)}</p> : null}
                    </div>
                    {!isPaying ? (
                      <Button size="sm" variant="outline" onClick={() => { setPayingId(r.id); setPayAmount(String(outstanding)); }} className="shrink-0 text-[11px]">
                        Cobrar
                      </Button>
                    ) : null}
                  </div>
                  {isPaying ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="0.01"
                        max={outstanding}
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-border-light bg-white px-2 text-sm text-text-primary outline-none focus:border-[#15140F]"
                        autoFocus
                      />
                      <Button size="sm" onClick={handlePay} disabled={payMutation.isPending || !payAmount || Number(payAmount) <= 0} className="h-8 text-[11px]">
                        {payMutation.isPending ? '...' : 'Confirmar'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPayingId(null); setPayAmount(''); }} className="h-8 text-[11px]">
                        Cancelar
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
