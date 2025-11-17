// service-worker.js - VERSÃO COM REDIRECIONAMENTO E CACHE BÁSICO

const GITHUB_PAGES_URL = 'https://cleytonLuis.github.io/sistema-vendas-pwa/';
const CACHE_NAME = 'gk-supl-v2'; // Incrementamos a versão do cache
const ASSETS_TO_CACHE = [ // Arquivos estáticos que serão cacheados
    // Adicione AQUI TODOS OS ARQUIVOS ESTÁTICOS necessários para a página rodar offline
    GITHUB_PAGES_URL, // Raiz
    GITHUB_PAGES_URL + 'index.html',
    GITHUB_PAGES_URL + 'acompanhamento-vendas.js',
    GITHUB_PAGES_URL + 'styles.css',
    GITHUB_PAGES_URL + 'manifest.json',
    GITHUB_PAGES_URL + 'icons/icon-192.png',
    GITHUB_PAGES_URL + 'icons/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] instalado - Iniciando cache...');
    // Armazena os arquivos estáticos no cache
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Ativa imediatamente
    );
});

self.addEventListener('activate', event => {
  console.log('[SW] ativado - Limpando caches antigos...');
    // Limpa caches antigos (se a versão do CACHE_NAME mudou)
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
    
    // 1. Lógica de Redirecionamento para Requisição de Navegação (Abre o PWA)
    if (event.request.mode === 'navigate') {
        // Intercepta a abertura do PWA (que pode vir do link Cloudflared) e força o carregamento 
        // da URL estável do GitHub.
        console.log('[SW] Requisição de navegação interceptada. Redirecionando para:', GITHUB_PAGES_URL);
        
        event.respondWith(
            fetch(GITHUB_PAGES_URL)
                .catch(() => caches.match(GITHUB_PAGES_URL)) // Se a rede falhar, retorna a versão cacheada
        );
        return;
    }

    // 2. Cache-First (Para Assets Estáticos)
    // Se não for uma requisição de API e for um recurso do nosso domínio (ou um asset que queremos cachear)
    if (!isApiRequest && (ASSETS_TO_CACHE.includes(requestURL.href) || requestURL.origin === location.origin)) {
        event.respondWith(
            caches.match(event.request).then(response => {
                // Retorna do cache se existir, senão busca na rede
                return response || fetch(event.request);
            })
        );
        return;
    }

    // 3. Network-Only (Para as APIs)
    // Deixa todas as outras requisições (principalmente as de API) irem diretamente para a rede
    // para garantir dados frescos.
    event.respondWith(fetch(event.request));
});
