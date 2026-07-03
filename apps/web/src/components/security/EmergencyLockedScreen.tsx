'use client';

import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clearAccessLinkToken, clearStoredAuth } from '@/lib/auth';

export function EmergencyLockedScreen() {
  function logout() {
    clearStoredAuth();
    clearAccessLinkToken();
    window.location.href = '/login';
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-bg-base px-4">
      <Card className="w-full max-w-lg border-red-200 bg-white p-6 text-center shadow-card">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-text-primary">Modo emergencia activo</h1>
        <p className="mt-3 text-sm text-text-muted">
          El acceso de esta empresa está temporalmente bloqueado por seguridad.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Contacta con soporte o con la administración de la plataforma para restaurar el acceso.
        </p>
        <Button className="mt-6 w-full" variant="outline" onClick={logout}>
          Cerrar sesión
        </Button>
      </Card>
    </main>
  );
}
