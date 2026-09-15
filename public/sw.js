self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MEW Laundry", body: event.data ? event.data.text() : "มีการอัปเดตสถานะเครื่องซักผ้า" };
  }

  const title = data.title || "MEW Laundry";
  const options = {
    body: data.body || "มีการอัปเดตสถานะเครื่องซักผ้า",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "mew-laundry",
    renotify: true,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  })());
});
