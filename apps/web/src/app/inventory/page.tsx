'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

function InventoryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'inventario');

    const productId = searchParams.get('productId');
    const action = searchParams.get('action');
    if (productId) params.set('productId', productId);
    if (action) params.set('action', action);

    router.replace(`/products?${params.toString()}`);
  }, [router, searchParams]);

  return null;
}

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryRedirect />
    </Suspense>
  );
}
