// service-worker.js - VERSÃO CORRIGIDA COM REDIRECIONAMENTO

const GITHUB_PAGES_URL = 'https://cleytonLuis.github.io/sistema-vendas-pwa/';

self.addEventListener('install', event => {
  console.log('[SW] instalado');
  self.skipWaiting(); // Garante ativação imediata
});

self.addEventListener('activate', event => {
  console.log('[SW] ativado');
  event.waitUntil(self.clients.claim()); // Assume o controle imediatamente
});

self.addEventListener('fetch', event => {
    // 1. Obtém a URL da requisição
    const requestURL = new URL(event.request.url);

    // 2. Verifica se a requisição veio da origem do Cloudflared
    // Isso é útil para requisições de assets, mas a principal é a requisição de navegação
    // (A requisição de navegação é a que carrega a página ao abrir o PWA)

    // 3. Intercepta a requisição de navegação e redireciona para a URL estável
    if (event.request.mode === 'navigate') {
        // Responder com uma requisição que aponta para a URL estável
        event.respondWith(
            fetch(GITHUB_PAGES_URL)
        );
        return;
    }

    // Comportamento padrão: apenas passthrough (pode adicionar caching aqui)
    event.respondWith(fetch(event.request));
});
