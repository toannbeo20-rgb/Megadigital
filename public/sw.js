// Service Worker — Mega Digital Agency App
// Chức năng:
//  1. Cache offline (App Shell caching)
//  2. Nhận Web Push notifications
//  3. Click notification → mở app đúng trang

const CACHE_NAME = "mega-digital-v1";
const APP_SHELL = [
  "/",
  "/cong-viec",
  "/nhan-su",
  "/khach",
  "/logo.jpg",
  "/manifest.webmanifest",
];

// ---- Install: cache app shell ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: xoá cache cũ ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: network-first với fallback cache ----
self.addEventListener("fetch", (event) => {
  // Chỉ cache GET requests cùng origin
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Lưu vào cache nếu thành công
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        // Offline fallback
        caches.match(event.request).then((cached) => cached ?? caches.match("/"))
      )
  );
});

// ---- Push: nhận thông báo ----
self.addEventListener("push", (event) => {
  let data = { title: "Mega Digital", body: "Bạn có thông báo mới.", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo.jpg",
      badge: "/logo.jpg",
      tag: data.url, // deduplicate: cùng URL = gộp thành 1 noti
      data: { url: data.url },
      actions: [
        { action: "open", title: "Xem ngay" },
        { action: "close", title: "Bỏ qua" },
      ],
      vibrate: [100, 50, 100],
    })
  );
});

// ---- Notification click: mở đúng trang ----
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // Nếu app đang mở → focus + navigate
      for (const win of wins) {
        if (win.url.includes(self.location.origin)) {
          win.focus();
          win.postMessage({ type: "NAVIGATE", url: targetUrl });
          return;
        }
      }
      // App chưa mở → mở tab mới
      return clients.openWindow(targetUrl);
    })
  );
});
