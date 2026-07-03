import { Skeleton } from './skeleton';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <div className="mb-4 flex gap-2">
        <div className="h-2 w-2 animate-bounce rounded-full bg-brand-primary" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-brand-primary" style={{ animationDelay: '0.2s' }} />
        <div className="h-2 w-2 animate-bounce rounded-full bg-brand-primary" style={{ animationDelay: '0.4s' }} />
      </div>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

/** Skeleton para una fila de tarjeta genérica */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border-light bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/** Grid de skeletons para secciones de tarjetas */
export function CardGridSkeleton({ count = 6, cols = 'md:grid-cols-2 xl:grid-cols-3' }: { count?: number; cols?: string }) {
  return (
    <div className={`grid gap-4 ${cols}`} aria-busy="true" aria-label="Cargando contenido">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton para lista de filas */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border-light bg-white p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton inline para una sección con título */
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-4 shadow-sm space-y-3">
      <Skeleton className="h-4 w-1/4" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}
