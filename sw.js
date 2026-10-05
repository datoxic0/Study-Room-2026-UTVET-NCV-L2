const CACHE_NAME = "studyroom-shell-v12";
const SHELL = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "favicon.svg",
  "manifest.webmanifest",
  "js/data/exams.js",
  "js/data/timetable.js",
  "js/data/sources.js",
  "js/data/notebooks.js",
  "js/data/study_guides.js",
  "js/data/paper_shelf.js",
  "js/data/figure_map.js",
  "js/core/dates.js",
  "js/core/storage.js",
  "js/core/search.js",
  "js/core/math_notation.js",
  "js/core/dialog_lock.js",
  "js/core/assessment.js",
  "js/core/ai_client.js",
  "js/ui/dashboard.js",
  "js/ui/papers.js",
  "js/ui/notebooks.js",
  "js/ui/guides.js",
  "js/ui/paper_reader.js",
  "js/ui/practice.js",
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

let netOk = true;
function setNet(ok) {
  if (ok === netOk) return;
  netOk = ok;
  const type = ok ? "net-ok" : "net-fallback";
  self.clients.matchAll().then((clients) => {
    for (const client of clients) client.postMessage({ type, ts: Date.now() });
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          setNet(true);
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          setNet(false);
          return cached || caches.match("index.html");
        });
      if (cached) return cached;
      return refresh;
    })
  );
});
