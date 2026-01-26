const CACHE_NAME = 'qtdapp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});

// Lógica de Sincronização em Segundo Plano (Background Sync)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-stock-movements') {
    event.waitUntil(syncStockMovements());
  }
});

function syncStockMovements() {
  // Esta função simula a lógica de sincronização de dados offline.
  // Na implementação real, ela leria do IndexedDB (ou similar)
  // e enviaria os dados para o servidor (Firebase).
  console.log('[Service Worker] Sincronizando movimentos de estoque pendentes...');
  
  // Simulação de leitura de dados pendentes
  const pendingMovements = JSON.parse(localStorage.getItem('pending_stock_movements') || '[]');
  
  if (pendingMovements.length === 0) {
    console.log('[Service Worker] Nenhuma movimentação pendente.');
    return Promise.resolve();
  }

  console.log(`[Service Worker] Tentando sincronizar ${pendingMovements.length} movimentos.`);

  // Simulação de envio para o servidor (Firebase)
  // Na prática, você chamaria a API do Firebase aqui.
  const syncPromises = pendingMovements.map(movement => {
    // Simulação de sucesso no envio
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`[Service Worker] Movimento sincronizado: ${movement.id}`);
        resolve(movement.id);
      }, 500);
    });
  });

  return Promise.all(syncPromises)
    .then(syncedIds => {
      // Remover movimentos sincronizados do armazenamento local
      const remainingMovements = pendingMovements.filter(m => !syncedIds.includes(m.id));
      localStorage.setItem('pending_stock_movements', JSON.stringify(remainingMovements));
      console.log('[Service Worker] Sincronização concluída. Movimentos restantes:', remainingMovements.length);
    })
    .catch(error => {
      console.error('[Service Worker] Erro durante a sincronização:', error);
      // O erro fará com que o Service Worker tente novamente mais tarde.
      return Promise.reject(error);
    });
}
