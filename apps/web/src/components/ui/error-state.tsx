import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export function ErrorState({
  title = 'No se pudo cargar la información',
  message,
  description,
  onRetry,
  retryLabel = 'Reintentar',
  action,
}: {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
}) {
  const text = message ?? description ?? 'Inténtalo de nuevo dentro de unos segundos.';

  return (
    <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-4" role="alert">
      <div className="flex gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100" aria-hidden="true">
          <AlertCircle size={18} className="text-red-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-red-800">{title}</h3>
          <p className="mt-1 text-[13px] text-red-700/80 leading-relaxed">{text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw size={13} />
                {retryLabel}
              </Button>
            ) : null}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
