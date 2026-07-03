import { useCallback, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

interface UsePushSubscriptionOptions {
  mode: 'member' | 'admin';
  getAuthHeaders: () => Record<string, string>;
  enabled?: boolean;
}

export function usePushSubscription({ mode, getAuthHeaders, enabled = true }: UsePushSubscriptionOptions) {
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (subscribedRef.current) return;

    try {
      const keyRes = await fetch(`${API}/push/vapid-public-key`);
      if (!keyRes.ok) return;
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        subscribedRef.current = true;
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const headers = getAuthHeaders();
      await fetch(`${API}/push/${mode}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ subscription }),
      });

      subscribedRef.current = true;
    } catch {
      // Non-fatal — push is optional
    }
  }, [enabled, mode, getAuthHeaders]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(subscribe, 3000); // delay to avoid blocking page load
    return () => clearTimeout(timer);
  }, [enabled, subscribe]);
}
