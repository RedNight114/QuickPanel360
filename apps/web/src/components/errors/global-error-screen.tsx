'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function GlobalErrorScreen({
  title = 'Ocurrió un error inesperado',
  message = 'La pantalla no pudo cargarse correctamente. Inténtalo de nuevo.',
  onRetry,
  showTechnicalDetails = false,
  technicalDetails,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showTechnicalDetails?: boolean;
  technicalDetails?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg-soft p-6">
      <Card className="w-full max-w-xl border border-border-light p-8 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">{message}</p>

        {showTechnicalDetails && technicalDetails ? (
          <pre className="mt-5 overflow-x-auto rounded-xl border border-border-light bg-bg-soft p-4 text-left text-xs text-text-secondary">
            {technicalDetails}
          </pre>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? (
            <Button onClick={onRetry}>
              <RefreshCw size={15} />
              Reintentar
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/dashboard">Volver al panel</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
