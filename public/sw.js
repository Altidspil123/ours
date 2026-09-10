/* ours. — service worker
   Delivers chat + signal notifications.
   If the app is already open & visible, it forwards the payload to the page
   (which shows an in-app banner + chime) instead of an OS notification. */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "ours.",
    body: "Something is waiting for you",
    url: "/chat",
    kind: "text",
    tag: "ours-text",
  };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    /* keep defaults */
  }

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const visible = windowClients.find((c) => c.visibilityState === "visible");
      if (visible) {
        // App is open & visible: let the page handle it (banner + chime).
        visible.postMessage({ type: "ours:push", payload });
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        renotify: true,
        icon: "/icon.png",
        badge: "/icon.png",
        data: { url: payload.url },
        vibrate:
          payload.kind === "signal"
            ? [120, 60, 120, 60, 240]
            : [80, 40, 80],
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/chat";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windowClients.find((c) => "focus" in c);
      if (existing) {
        await existing.focus();
        existing.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
