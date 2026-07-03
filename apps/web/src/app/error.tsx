'use client';

import { GlobalErrorScreen } from '@/components/errors/global-error-screen';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <GlobalErrorScreen
      title="No se pudo abrir esta pantalla"
      message="Se produjo un error inesperado en esta sección. Inténtalo de nuevo."
      onRetry={reset}
      showTechnicalDetails={process.env.NODE_ENV !== 'production'}
      technicalDetails={error.stack ?? error.message}
    />
  );
}
