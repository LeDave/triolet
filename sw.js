// Service worker Triominos : garde le jeu en mémoire pour l'ouvrir rapidement, même hors ligne.
// Les fichiers du site passent d'abord par le réseau (les mises à jour arrivent tout de suite) ;
// la copie locale ne sert que sans connexion.
const CACHE = 'triominos-v1';
const CORE = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // la base de données en direct ne passe jamais par le cache
  if (/firebasedatabase\.app$|firebaseio\.com$/.test(url.hostname)) return;
  const save = res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; };
  if (url.origin === location.origin) {
    // réseau d'abord, copie locale si hors ligne
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
  } else if (/(^|\.)gstatic\.com$|(^|\.)googleapis\.com$/.test(url.hostname)) {
    // SDK Firebase et polices : versions figées, la copie locale suffit
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(save)));
  }
});
