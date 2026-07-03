'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { EmergencyLockedScreen } from '@/components/security/EmergencyLockedScreen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useAuth } from '@/providers/auth-provider';
import { AppShell } from './app-shell';

const routeModules: Array<{ prefix: string; moduleKey: string }> = [
  { prefix: '/dashboard', moduleKey: 'dashboard' },
  { prefix: '/pos', moduleKey: 'pos' },
  { prefix: '/cash', moduleKey: 'cash' },
  { prefix: '/members', moduleKey: 'members' },
  { prefix: '/products', moduleKey: 'products' },
  { prefix: '/inventory', moduleKey: 'inventory' },
  { prefix: '/receivables', moduleKey: 'receivables' },
  { prefix: '/third-party-payments', moduleKey: 'third_party_payments' },
  { prefix: '/users', moduleKey: 'users' },
  { prefix: '/notifications', moduleKey: 'dashboard' },
  { prefix: '/audit', moduleKey: 'audit' },
  { prefix: '/security', moduleKey: 'security' },
  { prefix: '/settings', moduleKey: 'settings' },
];

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrated, isAuthenticated, tenant, hasRole } = useAuth();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) {
    return (
      <main className="grid min-h-screen place-items-center">
        <LoadingState label="Preparando sesión..." />
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (tenant?.accessStatus === 'EMERGENCY_LOCKED' && !hasRole('SUPERADMIN')) {
    return <EmergencyLockedScreen />;
  }

  const routeModule = routeModules.find((item) => pathname.startsWith(item.prefix));
  const enabledModules = tenant?.enabledModules;
  const moduleDisabled =
    Boolean(routeModule) &&
    !hasRole('SUPERADMIN') &&
    Boolean(enabledModules) &&
    !enabledModules?.includes(routeModule!.moduleKey);

  if (moduleDisabled) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-xl p-6">
          <ErrorState
            title="Módulo no disponible"
            message="Este módulo no está habilitado para tu empresa. Contacta con soporte o revisa el plan asignado desde Plataforma."
            action={
              <Button onClick={() => router.replace('/dashboard')}>
                Volver al panel
              </Button>
            }
          />
        </Card>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
