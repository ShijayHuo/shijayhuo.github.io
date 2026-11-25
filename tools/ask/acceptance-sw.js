/* Local acceptance worker. Replaces Chirpy's cache-first sw.min.js for this origin only.
   The installed worker keeps serving the first visit until this script's bytes change. */
self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.headers.has("range")) return;
  event.respondWith(fetch(event.request));
});
