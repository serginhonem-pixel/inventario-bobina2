/* ───────────────────────────────────────────────────────────
   QtdApp Service Worker — stale-while-revalidate
   ─────────────────────────────────────────────────────────── */

const CACHE_VERSION = 2;
const CACHE_NAME = `qtdapp-v${CACHE_VERSION}`;
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

/* ── Install ────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

/* ── Activate — limpa caches antigos ────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('qtdapp-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* ── Fetch — stale-while-revalidate ─────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Navegação: network-first com fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Ignora requisições que não são GET ou que são de APIs externas (Firebase, etc.)
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes('fonts.googleapis.com') &&
    !url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // Stale-while-revalidate: responde com cache imediato, atualiza em background
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached); // Offline: retorna cache se houver

        // Se tem cache → retorna imediatamente (stale), atualiza em background
        // Se não tem cache → espera a rede
        return cached || networkFetch;
      }),
    ),
  );
});

/* ── Background Sync — movimentações offline ────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stock-movements') {
    event.waitUntil(syncStockMovements());
  }
});

async function syncStockMovements() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_STOCK_MOVEMENTS' });
  });
}
