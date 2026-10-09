const CACHE = 'horizoncine-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // On ne touche pas aux appels externes (Supabase, vidéos, images TMDB...)
  if (new URL(req.url).origin !== location.origin) return;

  // Pages : réseau d'abord, copie en cache si on est hors-ligne
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          const copie = res.clone();
          caches.open(CACHE).then(c => c.put(req, copie));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/site/accueil.html')))
    );
  }
});
