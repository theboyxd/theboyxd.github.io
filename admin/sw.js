// Service worker da Central: só mostra os avisos do Painel Amazon (estoque, resumo do dia) com a Central fechada.
// Não guarda páginas em cache: a Central sempre mostra os dados atuais. Só é instalado quando você ativa os avisos.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// O painel manda o endereço das telas dele ("/#/logistica?aba=estoque"); na Central elas ficam em #/amazon/….
function destino(url) {
  let u;
  try { u = new URL(url || '/#/', 'https://x.invalid'); } catch { return new URL('./#/amazon', self.registration.scope).href; }
  const rota = u.hash.startsWith('#/') ? u.hash.slice(2) : '';
  return new URL('./#/amazon' + (rota ? '/' + rota : ''), self.registration.scope).href;
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Star-net', {
    body: data.body || 'Você tem um aviso novo.',
    icon: 'icone.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: destino(data.url) },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || new URL('./', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        await w.focus();
        if ('navigate' in w) await w.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
