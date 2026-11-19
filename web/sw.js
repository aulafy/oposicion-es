// Cuando el lanzador está cerrado, explica cómo recuperar la ventana instalada.
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate' && new URL(e.request.url).origin === location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response(
      '<html lang="es"><meta charset="utf-8"><title>Plaza</title><h1>Abre el lanzador de Plaza</h1><p>Inicia Plaza en tu ordenador y vuelve a cargar esta ventana.</p><button onclick="location.reload()">Volver a intentar</button></html>',
      {headers:{'Content-Type':'text/html; charset=utf-8'}})));
  }
});
