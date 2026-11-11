// Service Worker do Siscoop: habilita a instalação como app (PWA) e mantém a
// tela inicial disponível quando a rede do celular oscila.
//
// O que ele NÃO faz (de propósito):
// - não intercepta requisições de outros domínios (Firestore, Firebase Auth,
//   APIs do Google, Nuvem Fiscal...). Antes, todas passavam por aqui, inclusive
//   a conexão contínua do Firestore, o que só adicionava atraso e pontos de
//   falha no Android;
// - não intercepta POST/PUT/DELETE nem a API do próprio servidor (/api/...).
const CACHE_NAME = 'siscoop-cache-v2';
const PAGINA_INICIAL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(PAGINA_INICIAL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) return;

  // Navegação (abrir o app / recarregar): rede primeiro, sempre com a versão
  // mais nova; sem rede, usa a última página inicial salva em vez de tela branca.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(PAGINA_INICIAL, copia)).catch(() => undefined);
          }
          return resp;
        })
        .catch(() => caches.match(PAGINA_INICIAL).then((r) => r || Response.error()))
    );
    return;
  }

  // Arquivos do build com hash no nome (/assets/...) nunca mudam: cache primeiro.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((emCache) => emCache || fetch(req).then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia)).catch(() => undefined);
        }
        return resp;
      }))
    );
  }
  // Demais requisições: segue direto para a rede, sem passar pelo SW.
});
