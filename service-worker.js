// service-worker.js - VERSÃO COM REDIRECIONAMENTO E CACHE BÁSICO

const GITHUB_PAGES_URL = 'https://cleytonLuis.github.io/sistema-vendas-pwa/';
const CACHE_NAME = 'gk-supl-v1'; // Nome do cache
const ASSETS_TO_CACHE = [ // Arquivos estáticos que serão cacheados
    GITHUB_PAGES_URL, // A página principal
    GITHUB_PAGES_URL + 'index.html',
    GITHUB_PAGES_URL + 'acompanhamento-vendas.js',
    GITHUB_PAGES_URL + 'styles.css',
    GITHUB_PAGES_URL + 'icons/icon-192.png',
    GITHUB_PAGES_URL + 'icons/icon-512.png'
    // Adicione aqui todos os outros arquivos estáticos (CSS, JS, Ícones, etc.)
];

self.addEventListener('install', event => {
  console.log('[SW] instalado');
    // Armazena os arquivos estáticos no cache
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache aberto, adicionando assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Ativa imediatamente
    );
});

self.addEventListener('activate', event => {
  console.log('[SW] ativado');
    // Limpa caches antigos (se houver)
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const requestURL = new URL(event.request.url);

    // 1. Lógica de Redirecionamento (Prioridade Máxima)
    if (event.request.mode === 'navigate') {
        console.log('[SW] Requisição de navegação interceptada, redirecionando para:', GITHUB_PAGES_URL);
        event.respondWith(
            fetch(GITHUB_PAGES_URL)
                .catch(() => caches.match(GITHUB_PAGES_URL)) // Se o fetch falhar, tenta cache
        );
        return;
    }

    // 2. Cache-First (Para Assets Estáticos)
    // Se a URL estiver na nossa lista de assets ou for um recurso estático
    if (ASSETS_TO_CACHE.includes(requestURL.href) || requestURL.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then(response => {
                // Retorna do cache ou faz um fetch na rede
                return response || fetch(event.request);
            })
        );
        return;
    }

    // 3. Network-Only (Para as APIs de Vendas/Produtos)
    // Se a requisição for para a sua API local (Cloudflared/localhost:3000)
    // Deixamos a requisição passar direto para a rede (Network-Only)
    // Isso garante que os dados da API sejam sempre frescos.
    event.respondWith(fetch(event.request));
});
