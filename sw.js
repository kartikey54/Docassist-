/* TinyHumanMD Service Worker — app-shell offline caching + locale network-first */
var CACHE_NAME = 'tinyhumanmd-v6';
var ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/shared/design.css',
  '/shared/nav.js',
  '/shared/analytics-config.js',
  '/shared/lms.js',
  '/shared/storage.js',
  '/shared/chart-helpers.js',
  '/shared/analytics.js',
  '/shared/seo.js',
  '/shared/i18n.js',
  '/calculators/calculators.css',
  '/calculators/common-calculator.js',
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
  '/categories/medication-safety-dosing/index.html',
  '/categories/pediatric-infectious-disease/index.html',
  '/categories/growth-preventive-care/index.html',
  '/categories/respiratory-asthma/index.html',
  '/categories/emergency-acute-care/index.html',
  '/calculators/pediatric-fever-calculator/index.html',
  '/calculators/pediatric-antibiotic-dosing/index.html',
  '/calculators/pediatric-sepsis-risk-score/index.html',
  '/calculators/pediatric-dehydration-management/index.html',
  '/calculators/pediatric-asthma-action-tool/index.html',
  '/calculators/otitis-media-treatment-pediatric/index.html',
  '/calculators/well-child-visit-checklist/index.html',
  '/calculators/medication-safety-dosing-engine-v2/index.html',
  '/data/who-lms.json',
  '/data/cdc-lms.json',
  '/data/fenton-2025-lms.json',
  '/data/bili-thresholds.json',
  '/data/dosing-reference.json',
  '/data/cdsi-antigens.json',
  '/data/calculators/registry.json',
  '/data/calculators/internal-links.json',
  '/data/calculators/seo-manifest.json',
  '/locales/en.json',
  '/locales/es.json'
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
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isLocaleCatalog = (
    url.origin === self.location.origin &&
    url.pathname.indexOf('/locales/') === 0 &&
    /\.json$/i.test(url.pathname)
  );

  if (isLocaleCatalog) {
    e.respondWith(
      fetch(req).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          return caches.match('/locales/en.json');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, clone);
          });
        }
        return response;
      }).catch(function () {
        /* offline fallback — return cached index if available */
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
