'use client';

import { GlobalErrorScreen } from '@/components/errors/global-error-screen';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <GlobalErrorScreen
          title="La aplicación encontró un problema"
          message="No se pudo completar la carga. Inténtalo de nuevo o vuelve al panel."
          onRetry={reset}
          showTechnicalDetails={process.env.NODE_ENV !== 'production'}
          technicalDetails={error.stack ?? error.message}
        />
      </body>
    </html>
  );
}
