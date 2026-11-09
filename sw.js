// Hält die App-Dateien offline bereit. Termine kommen weiter live aus Firestore.
const CACHE = 'kalender-v4';
const FILES = ['./', 'index.html', 'styles.css?v=4', 'app.js?v=4', 'config.js?v=4', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Netz zuerst, damit Änderungen am Repo sofort ankommen; offline aus dem Speicher
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
