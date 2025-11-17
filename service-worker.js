// service-worker.js - VERSÃO SOMENTE CACHE (Para não interferir no redirecionamento)

const CACHE_NAME = 'gk-supl-v4'; // Versão de cache atualizada
const GITHUB_PAGES_BASE = 'https://cleytonLuis.github.io/sistema-vendas-pwa/';

// Liste AQUI TODOS OS ARQUIVOS ESTÁTICOS necessários para a página rodar offline
const ASSETS_TO_CACHE = [ 
    GITHUB_PAGES_BASE, 
    GITHUB_PAGES_BASE + 'index.html',
    GITHUB_PAGES_BASE + 'acompanhamento-vendas.js',
    GITHUB_PAGES_BASE + 'styles.css',
    GITHUB_PAGES_BASE + 'manifest.json',
    GITHUB_PAGES_BASE + 'icons/icon-192.png',
    GITHUB_PAGES_BASE + 'icons/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] instalado - Iniciando cache...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Tenta adicionar todos os assets, ignora se algum falhar
                return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                    console.error('[SW] Falha ao cachear um ou mais assets:', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
  console.log('[SW] ativado - Limpando caches antigos...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const requestURL = new URL(event.request.url);
    const isApiRequest = requestURL.pathname.startsWith('/api/');
    
    // Deixa as requisições de API passarem direto para a rede (Network-Only)
    if (isApiRequest) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Estratégia Cache-First para todos os outros assets (HTML, JS, CSS, Imagens)
    event.respondWith(
        caches.match(event.request).then(response => {
            // Retorna do cache se existir, senão busca na rede
            return response || fetch(event.request);
        })
    );
});
