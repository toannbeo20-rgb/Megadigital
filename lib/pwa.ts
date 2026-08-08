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

// Xin quyền push + subscribe (gọi khi user đồng ý)
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    // Phase 1: dùng applicationServerKey placeholder (thay bằng VAPID key thật khi có backend)
    // Hiện tại chỉ đăng ký SW để test, chưa gửi push thật
    const sub = await reg.pushManager.getSubscription();
    return sub;
  } catch (err) {
    console.warn("[PWA] Push subscribe failed:", err);
    return null;
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
