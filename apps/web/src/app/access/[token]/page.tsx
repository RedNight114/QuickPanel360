'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, ShieldX } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type ValidateResponse = {
  valid: boolean;
  tenant: {
    id: string;
    name: string;
    accessStatus: string;
  };
};

export default function AccessPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { setAccessLinkToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  useEffect(() => {
    async function validate() {
      try {
        const response = await apiFetch<ValidateResponse>(
          `/security/access-link/validate/${params.token}`,
          { token: null },
        );

        setAccessLinkToken(params.token);
        setTenantName(response.tenant.name);
        window.setTimeout(() => router.replace('/login'), 650);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Link de acceso inválido');
      }
    }

    validate();
  }, [params.token, router, setAccessLinkToken]);

  return (
    <main className="grid min-h-screen place-items-center px-4 bg-bg-base">
      <Card className="w-full max-w-md text-center shadow-card">
        {error ? (
          <>
            <ShieldX className="mx-auto text-status-danger" size={44} />
            <h1 className="mt-5 text-2xl font-bold text-text-primary">Acceso no disponible</h1>
            <p className="mt-3 text-sm text-text-muted">{error}</p>
            <Button className="mt-6 w-full" variant="outline" onClick={() => router.push('/login')}>
              Ir al login
            </Button>
          </>
        ) : (
          <>
            <ShieldCheck className="mx-auto text-brand-primary" size={44} />
            <h1 className="mt-5 text-2xl font-bold text-text-primary">Acceso verificado</h1>
            <p className="mt-3 text-sm text-text-muted">
              {tenantName ? `Preparando login para ${tenantName}` : 'Validando link seguro...'}
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
