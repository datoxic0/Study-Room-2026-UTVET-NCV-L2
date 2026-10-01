const CACHE_NAME = "studyroom-shell-v5";
const SHELL = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "favicon.svg",
  "manifest.webmanifest",
  "js/data/exams.js",
  "js/data/sources.js",
  "js/data/notebooks.js",
  "js/data/study_guides.js",
  "js/data/paper_shelf.js",
  "js/core/dates.js",
  "js/core/storage.js",
  "js/core/search.js",
  "js/core/math_notation.js",
  "js/ui/dashboard.js",
  "js/ui/papers.js",
  "js/ui/notebooks.js",
  "js/ui/guides.js",
  "js/ui/paper_reader.js",
  "js/ui/tutor.js",
  "js/ui/timer.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});
