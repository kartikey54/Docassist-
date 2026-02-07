/* TinyHumanMD Service Worker — offline-first caching */
var CACHE_NAME = 'tinyhumanmd-v2';
var ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/shared/design.css',
  '/shared/nav.js',
  '/shared/lms.js',
  '/shared/storage.js',
  '/shared/chart-helpers.js',
  '/shared/analytics.js',
  '/shared/seo.js',
  '/growth/index.html',
  '/growth/growth.js',
  '/growth/growth.css',
  '/bili/index.html',
  '/bili/bili.js',
  '/bili/bili.css',
  '/ga-calc/index.html',
  '/ga-calc/ga-calc.js',
  '/ga-calc/ga-calc.css',
  '/catch-up/index.html',
  '/catch-up/catch-up.js',
  '/catch-up/catch-up.css',
  '/dosing/index.html',
  '/dosing/dosing.js',
  '/dosing/dosing.css',
  '/data/who-lms.json',
  '/data/cdc-lms.json',
  '/data/fenton-2025-lms.json',
  '/data/bili-thresholds.json',
  '/data/dosing-reference.json',
  '/data/cdsi-antigens.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function () {
        /* offline fallback — return cached index if available */
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
