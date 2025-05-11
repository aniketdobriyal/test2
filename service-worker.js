self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('game-cache-v1').then(cache => {
      return cache.addAll([
        'index.html',
        'manifest.json',
        'icon-192.png',
        'icon-512.png',
        'script.js'
        // add other assets like audio, CSS, etc.
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
