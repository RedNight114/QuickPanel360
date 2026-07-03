const CACHE_VERSION = 'v3';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const MEMBER_CACHE = `member-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/member/login',
  '/member/home',
  '/member/card',
  '/branding/q-badge.svg',
  '/favicon.svg',
  '/icon.svg',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {}),
    ),
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'QuickPanel360', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'QuickPanel360', {
      body: payload.body ?? '',
      icon: '/icon.svg',
      badge: '/branding/q-badge.svg',
      data: { url: payload.url ?? '/member/home' },
      tag: payload.tag ?? 'default',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/member/home';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(url));
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      }),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept API calls or cross-origin
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // API port (3000) — skip
  if (url.port === '3000') return;

  const isMemberRoute = url.pathname.startsWith('/member/');
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/branding/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp');

  // Static assets — cache-first
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Member portal navigations — network-first, fallback to cache
  if (isMemberRoute && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(MEMBER_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/member/home')),
        ),
    );
    return;
  }

  // Other navigations — network-first, fallback shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match('/')),
      ),
    );
    return;
  }
});
