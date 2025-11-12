// service-worker.js - versão inicial simples
self.addEventListener('install', event => {
  console.log('[SW] instalado');
  // Skip waiting se quiser ativar imediatamente:
  // self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] ativado');
  // Claim para controlar clientes imediatamente:
  // event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Por enquanto, apenas passthrough.
  // Você pode implementar caching aqui.
});
