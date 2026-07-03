'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

type PosMobileBottomBarProps = {
  cartCount: number;
  total: number;
  hasOpenSession: boolean;
  hasSelectedMember: boolean;
  hasPendingScaleVerification: boolean;
  activeTab: 'member' | 'products' | 'cart';
  submitting: boolean;
  onOpenCash: () => void;
  onSelectMember: () => void;
  onOpenCart: () => void;
  onCheckout: () => void;
};

export function PosMobileBottomBar({
  cartCount,
  total,
  hasOpenSession,
  hasSelectedMember,
  hasPendingScaleVerification,
  activeTab,
  submitting,
  onOpenCash,
  onSelectMember,
  onOpenCart,
  onCheckout,
}: PosMobileBottomBarProps) {
  if (cartCount === 0 && hasOpenSession && hasSelectedMember) {
    return null;
  }

  const label = !hasOpenSession
    ? 'Abrir caja'
    : !hasSelectedMember
      ? 'Seleccionar socio'
      : cartCount === 0
        ? 'Añade productos'
        : hasPendingScaleVerification
          ? 'Verificar peso'
          : activeTab === 'cart'
            ? 'Registrar aportación'
            : 'Ver selección';

  const action = !hasOpenSession
    ? onOpenCash
    : !hasSelectedMember
      ? onSelectMember
      : cartCount === 0
        ? undefined
        : hasPendingScaleVerification
          ? onCheckout
          : activeTab === 'cart'
            ? onCheckout
            : onOpenCart;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-light bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="safe-area-bottom mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
        {/* Cart summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className="relative">
              <ShoppingCart size={16} />
              {cartCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-primary px-0.5 text-[9px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </div>
            <span>{cartCount} producto{cartCount === 1 ? '' : 's'}</span>
          </div>
          <p className="mt-0.5 text-xl font-bold text-brand-primary">{formatCurrency(total)}</p>
        </div>

        {/* Action button */}
        <Button
          className="min-w-[160px] bg-brand-primary py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary disabled:bg-gray-300 disabled:text-gray-600 disabled:shadow-none"
          size="md"
          disabled={!action || submitting}
          onClick={action}
        >
          {submitting ? 'Registrando...' : label}
        </Button>
      </div>
    </div>
  );
}
