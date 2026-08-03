// Enkel service worker: cachar bara "app-skalet" (HTML/CSS/JS/ikoner),
// INTE väderdatan — den ska alltid vara färsk. Det gör att sidan går
// att installera och öppna snabbt, men väder hämtas alltid på nytt.
const CACHE_NAME = "badapp-shell-v1";
const SHELL_FILES = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  // Väder-API:er ska ALLTID hämtas färska från nätet, aldrig cache.
  if (url.includes("open-meteo.com")) return;

  // Allt annat (sidans egna filer): försök nätet först, fall tillbaka på cache.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
