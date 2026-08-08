"use client";

// Hook đăng ký Service Worker + Web Push
// Dùng trong layout hoặc component gốc

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function usePWA() {
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    if (!("serviceWorker" in navigator)) return;

    // Đăng ký service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[PWA] SW registered, scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] SW registration failed:", err);
      });

    // Lắng nghe message từ SW (navigate khi click notification)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "NAVIGATE") {
        router.push(event.data.url);
      }
    });
  }, [router]);
}

// Chuyển VAPID public key (base64url) → Uint8Array cho applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

// Xin quyền push + subscribe thật (VAPID) + lưu subscription lên server.
// Gọi khi user bấm "Bật thông báo".
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[PWA] Thiếu NEXT_PUBLIC_VAPID_PUBLIC_KEY — chỉ dùng local notification.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    // Lưu subscription lên server để gửi push kể cả khi app đóng
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    }).catch(() => {});
    return sub;
  } catch (err) {
    console.warn("[PWA] Push subscribe failed:", err);
    return null;
  }
}

// Gửi push tới các user khác (server sẽ tra subscription + đẩy + lưu notification).
// notiText: chữ hiển thị ở chuông (mặc định = body).
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  url = "/",
  notiText?: string
) {
  if (userIds.length === 0) return;
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, title, body, url, notiText }),
    });
  } catch {
    // Không chặn UX nếu push lỗi
  }
}

// Gửi local notification (không cần server, dùng trong Phase 1)
export async function sendLocalNotification(title: string, body: string, url = "/") {
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker.ready;
  const options: NotificationOptions & { vibrate?: number[], data?: { url: string } } = {
    body,
    icon: "/logo.jpg",
    badge: "/logo.jpg",
    data: { url },
    tag: url,
    vibrate: [100, 50, 100],
  };
  await reg.showNotification(title, options);
}
