const CACHE_NAME = "quiz-app-v8";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./games/games.css",
  "./games/games.js",
  "./questions.json",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon/start.png",
  "./icon/bibliothek.png",
  "./icon/gemerkt.png",
  "./icon/stats.png",
  "./icon/search.png",
  "./icon/arena.svg",
  "./avatars/avatar0.png",
  "./avatars/avatar1.png",
  "./avatars/avatar2.png",
  "./avatars/avatar3.png",
  "./avatars/avatar4.png",
  "./avatars/avatar5.png",
  "./avatars/avatar6.png",
  "./avatars/avatar7.png",
  "./avatars/avatar8.png",
  "./avatars/avatar9.png",
  "./avatars/avatar10.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .catch(error => console.warn("Cache install fehlgeschlagen:", error))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copy);
        });

        return response;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true })
          .then(cached => cached || caches.match("./index.html", { ignoreSearch: true }))
      )
  );
});
