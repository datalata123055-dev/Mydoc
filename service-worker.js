const CACHE_NAME = "edocument-offline-v1";
const OFFLINE_URL = "index.html";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fQrPyDMnH41zhDqHnQTa6P.woff2",
  "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fQrO4AdzhM47mN0cWrEYlO.woff2",
  "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fQSO4AdzhM47mN6gg.woff2",
  "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fQROyDMnH41zhDqA.woff2"
];

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching assets for offline use...");\n      return cache.addAll([\n        "/",\n        "/index.html",\n        "/app.js",\n        "/styles.css"\n      ]).catch((error) => {\n        console.warn("[Service Worker] Some assets could not be cached:", error);\n        return Promise.resolve();\n      });\n    })\n  );\n  self.skipWaiting();\n});\n\nself.addEventListener("activate", (event) => {\n  console.log("[Service Worker] Activating...");\n  event.waitUntil(\n    caches.keys().then((cacheNames) => {\n      return Promise.all(\n        cacheNames\n          .filter((name) => name !== CACHE_NAME)\n          .map((name) => {\n            console.log("[Service Worker] Deleting old cache:", name);\n            return caches.delete(name);\n          })\n      );\n    })\n  );\n  self.clients.claim();\n});\n\nself.addEventListener("fetch", (event) => {\n  const { request } = event;\n  const { method, url } = request;\n\n  if (method !== "GET") {\n    return;\n  }\n\n  if (url.includes("/api/")) {\n    event.respondWith(\n      fetch(request)\n        .then((response) => {\n          if (response.ok) {\n            const cache = caches.open(CACHE_NAME);\n            cache.then((c) => c.put(request, response.clone()));\n          }\n          return response;\n        })\n        .catch(() => {\n          return caches.match(request);\n        })\n    );\n    return;\n  }\n\n  event.respondWith(\n    caches.match(request).then((cachedResponse) => {\n      if (cachedResponse) {\n        return cachedResponse;\n      }\n\n      return fetch(request)\n        .then((response) => {\n          if (!response || response.status !== 200 || response.type === "error") {\n            return response;\n          }\n\n          const cache = caches.open(CACHE_NAME);\n          cache.then((c) => c.put(request, response.clone()));\n          return response;\n        })\n        .catch(() => {\n          if (request.destination === "document") {\n            return caches.match(OFFLINE_URL);\n          }\n          return null;\n        });\n    })\n  );\n});\n\nconsole.log("[Service Worker] Service Worker script loaded");\nEOF
cat /tmp/service-worker.js