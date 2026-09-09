/* Service worker for pages/judging.html — so the page RELOADS with no signal.
 *
 * Network-first, cache-fallback, for same-origin GETs only. Online, every
 * request goes to the network and refreshes the cache (so a fair-morning
 * push of js/judging-data.js is picked up on the next load); offline, the
 * last good copy is served. ?class=14 resolves to the cached page because
 * matches ignore the query string.
 *
 * Nothing here touches the POST to Apps Script — that is cross-origin and
 * passes straight through. Offline sends fail in the page, which keeps the
 * picks and shows "not sent yet". */
var CACHE = 'hf-judging-v1';
var CORE = ['./judging.html', '../css/heritage.css', '../css/judging.css', '../js/judging-data.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(CORE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || new Response('Offline and not cached yet. Open this page once with signal.',
                                   { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});
