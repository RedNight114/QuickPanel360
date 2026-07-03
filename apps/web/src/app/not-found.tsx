import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg-base px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Página no encontrada</p>
        <h1 className="mt-3 text-3xl font-semibold text-text-primary">No se encontró la ruta solicitada</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Vuelve al panel principal para continuar con la operativa del club.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
