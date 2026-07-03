'use client';

import { Wrench } from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
  estimatedEnd?: string;
  onRetry?: () => void;
}

function formatEstimatedEnd(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MaintenancePage({ message, estimatedEnd, onRetry }: MaintenancePageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 shadow-lg">
            <Wrench size={32} className="text-white" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">QuickPanel</span>
            <span className="text-2xl font-bold tracking-tight text-amber-500">360</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            by QuickAgence
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-3 text-xl font-semibold text-gray-900">
            Mantenimiento temporal
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            {message ||
              'QuickPanel360 está en mantenimiento temporal. Estamos realizando mejoras en el sistema. Por favor, inténtelo de nuevo en unos minutos.'}
          </p>

          {estimatedEnd && (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Estimamos volver antes de las{' '}
              <span className="font-semibold">{formatEstimatedEnd(estimatedEnd)}</span>
            </div>
          )}

          <button
            onClick={onRetry ?? (() => window.location.reload())}
            className="mt-6 w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          >
            Reintentar
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Si el problema persiste, contacta con soporte en{' '}
          <span className="font-medium text-amber-500">soporte@quickagence.com</span>
        </p>
      </div>
    </div>
  );
}
