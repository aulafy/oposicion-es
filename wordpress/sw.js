// La lista de recursos y su versión se generan al empaquetar el tema.
const cacheNombre = 'plaza-wordpress-' + self.registration.scope + '-' + VERSION;
const prefijo = 'plaza-wordpress-' + self.registration.scope + '-';
const recursos = new Set(RECURSOS.map(ruta => new URL(ruta, self.registration.scope).href));
const portada = new URL('./', self.registration.scope).href;

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(cacheNombre).then(cache =>
    cache.addAll([...recursos].map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(caches.keys().then(claves => Promise.all(claves
    .filter(clave => clave.startsWith(prefijo) && clave !== cacheNombre)
    .map(clave => caches.delete(clave)))));
});

self.addEventListener('fetch', evento => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const destino = request.mode === 'navigate' && url.origin === location.origin &&
    (url.pathname === new URL(portada).pathname || url.pathname === new URL('index.html', portada).pathname)
    ? portada : url.href;
  if (!recursos.has(destino)) return;
  evento.respondWith(caches.open(cacheNombre).then(async cache =>
    await cache.match(destino) || fetch(request)));
});
