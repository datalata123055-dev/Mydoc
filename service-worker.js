var CACHE_NAME = "edocument-offline-v8";
var APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./compat.js",
  "./app.js",
  "./offline-indicator.js",
  "./firebase-sync.js",
  "./manifest.json",
  "./libs/jspdf.umd.min.js",
  "./libs/jspdf.plugin.autotable.min.js",
  "./assets/fonts/inter.css",
  "./assets/fonts/inter-latin-variable.woff2",
  "./assets/fonts/inter-latin.woff2",
  "./assets/logo.png",
  "./assets/company-stamp.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

function isFreshAsset(request) {
  var url = new URL(request.url);
  return url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/firebase-sync.js") ||
    url.pathname.endsWith("/offline-indicator.js") ||
    url.pathname.endsWith("/styles.css");
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
        return Promise.resolve(false);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put("./index.html", copy);
        });
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  if (isFreshAsset(request)) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (!response || !response.ok || response.type !== "basic") return response;
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, copy);
        });
        return response;
      }).catch(function () {
        return caches.match(request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (!response || !response.ok || response.type !== "basic") return response;
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, copy);
        });
        return response;
      });
    })
  );
});
