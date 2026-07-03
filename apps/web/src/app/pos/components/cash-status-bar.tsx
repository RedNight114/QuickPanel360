'use client';

import { DollarSign, Lock, Maximize, Minimize, TrendingUp, Unlock } from 'lucide-react';
import { HelpTip } from '@/components/help/help-tip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosSession } from '@/lib/types';

type CashStatusBarProps = {
  session: PosSession | null;
  loading: boolean;
  onOpenCash: () => void;
  onViewCash: () => void;
  kioskMode?: boolean;
  onToggleKiosk?: () => void;
};

export function CashStatusBar({
  session,
  loading,
  onOpenCash,
  onViewCash,
  kioskMode,
  onToggleKiosk,
}: CashStatusBarProps) {
  const sessionSalesTotal =
    session?.sales?.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0) ?? 0;
  const salesCount = session?.sales?.length ?? 0;
  const expectedCash = Number(session?.openingCash ?? 0) + sessionSalesTotal;

  if (loading) {
    return (
      <div className="border-b border-border-light bg-gradient-to-r from-slate-50 to-white px-5 py-3">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <div className="h-2 w-2 animate-pulse rounded-full bg-text-muted" />
          Consultando caja...
        </div>
      </div>
    );
  }

  return (
    <header className={`border-b px-3 py-2.5 transition-all sm:px-5 sm:py-3 ${
      session
        ? 'border-green-100 bg-gradient-to-r from-green-50/80 via-white to-white'
        : 'border-red-100 bg-gradient-to-r from-red-50/60 via-white to-white'
    }`}>
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm ${
          session
            ? 'bg-amber-100 text-amber-700'
            : 'bg-red-100 text-red-500'
        }`}>
          {session ? <Unlock size={18} /> : <Lock size={18} />}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={session ? 'success' : 'danger'}>
              {session ? 'Caja abierta' : 'Caja cerrada'}
            </Badge>
          </div>

          {session ? (
            <div className="hidden flex-wrap items-center gap-4 text-sm sm:flex">
              <span className="flex items-center gap-1.5 text-text-muted">
                <DollarSign size={13} className="text-green-500" />
                Esperado:
                <strong className="text-[#15140F]">{formatCurrency(expectedCash)}</strong>
                <HelpTip title="Esperado" text="Efectivo de apertura + aportaciones registradas en esta sesión." size={11} side="bottom" />
              </span>
              <span className="flex items-center gap-1.5 text-text-muted">
                <TrendingUp size={13} className="text-brand-primary" />
                Registrado:
                <strong className="text-brand-primary">{formatCurrency(sessionSalesTotal)}</strong>
                <HelpTip title="Registrado" text="Suma total de todas las dispensaciones completadas en la sesión actual." size={11} side="bottom" />
              </span>
              <span className="text-text-muted">
                <strong className="text-text-primary">{salesCount}</strong> operaciones
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {session ? (
            <Button size="sm" variant="outline" onClick={onViewCash}>
              Ver caja
            </Button>
          ) : (
            <Button size="sm" onClick={onOpenCash}>
              Abrir caja
            </Button>
          )}
          {onToggleKiosk ? (
            <button
              type="button"
              onClick={onToggleKiosk}
              aria-label={kioskMode ? 'Salir de pantalla completa' : 'Pantalla completa'}
              title={kioskMode ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border-light text-text-muted transition-colors hover:bg-bg-soft hover:text-text-primary"
            >
              {kioskMode ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
