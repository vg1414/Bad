// Enkel service worker: cachar bara "app-skalet" (HTML/CSS/JS/ikoner),
// INTE väderdatan — den ska alltid vara färsk. Det gör att sidan går
// att installera och öppna snabbt, men väder hämtas alltid på nytt.
const CACHE_NAME = "badapp-shell-v2";
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

  // Sidans egna filer hämtas med "no-cache": webbläsaren måste fråga servern
  // om filen ändrats istället för att visa en sparad kopia. Annars kan en ny
  // version av appen dröja upp till 10 minuter (GitHub Pages cachetid).
  const sameOrigin = new URL(url).origin === self.location.origin;
  const request = sameOrigin && event.request.method === "GET"
    ? new Request(url, { cache: "no-cache", credentials: "same-origin" })
    : event.request;

  // Försök nätet först, fall tillbaka på cache (t.ex. utan täckning).
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
