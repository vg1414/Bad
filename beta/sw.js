// Beta-versionen är nu live på huvudadressen. Den här service workern
// ersätter den gamla beta-workern och tar bort sig själv direkt.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
