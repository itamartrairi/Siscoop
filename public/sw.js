// Service Worker para habilitar instalação PWA e atalho nativo na Área de Trabalho
const CACHE_NAME = 'siscoop-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through de requisições de rede para garantir funcionamento em tempo real
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
