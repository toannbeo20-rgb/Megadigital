"use client";

import { useEffect, useState } from "react";
import { usePWA, sendLocalNotification } from "@/lib/pwa";
import Image from "next/image";

// BeforeInstallPromptEvent không có trong TS stdlib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  usePWA(); // đăng ký SW

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);

  useEffect(() => {
    // Kiểm tra push permission hiện tại
    if ("Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }

    // Bắt sự kiện install prompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Chỉ show banner nếu chưa cài
      const installed = window.matchMedia("(display-mode: standalone)").matches;
      if (!installed) setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari: không có beforeinstallprompt → hiện hướng dẫn thủ công
    const isIOS =
      /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) &&
      !(navigator.userAgent.includes("CriOS") || navigator.userAgent.includes("FxiOS"));
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = sessionStorage.getItem("pwa-ios-dismissed");
    if (isIOS && !isStandalone && !dismissed) {
      setTimeout(() => setShowBanner(true), 2000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setShowBanner(false);
      setInstallPrompt(null);
    } else {
      // iOS: show instructions
      setShowBanner(false);
      sessionStorage.setItem("pwa-ios-dismissed", "1");
      alert(
        'Để cài app:\n1. Nhấn nút Chia sẻ (□↑) ở Safari\n2. Chọn "Thêm vào Màn hình chính"\n3. Bấm Thêm'
      );
    }
  }

  async function enableNotifications() {
    const perm = await Notification.requestPermission();
    setPushGranted(perm === "granted");
    if (perm === "granted") {
      await sendLocalNotification(
        "Mega Digital 🟢",
        "Thông báo đã bật! Bạn sẽ nhận thông báo khi được giao task.",
        "/"
      );
    }
  }

  const isIOSPrompt = !installPrompt && showBanner;

  return (
    <>
      {children}

      {/* Banner cài PWA */}
      {showBanner && (
        <div
          className="fixed bottom-0 inset-x-0 z-[100] animate-in"
          style={{
            background: "var(--surface)",
            borderTop: "1px solid var(--border)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3 p-4">
            <div
              className="h-11 w-11 shrink-0 overflow-hidden rounded-xl"
              style={{ border: "1px solid rgba(170,237,42,0.3)" }}
            >
              <Image src="/logo.jpg" alt="Mega Digital" width={44} height={44} className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">Cài app Mega Digital</p>
              <p className="text-xs text-[var(--text-faint)] truncate">
                {isIOSPrompt
                  ? "Nhấn Chia sẻ → Thêm vào Màn hình chính"
                  : "Truy cập nhanh từ màn hình chính điện thoại"}
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="btn-accent shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
            >
              Cài
            </button>
            <button
              onClick={() => {
                setShowBanner(false);
                sessionStorage.setItem("pwa-ios-dismissed", "1");
              }}
              className="shrink-0 text-[var(--text-faint)] hover:text-[var(--text)] transition-colors text-lg leading-none"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Banner bật thông báo (hiện 1 lần nếu chưa grant) */}
      {!pushGranted && !showBanner && (
        <PushBanner onEnable={enableNotifications} />
      )}
    </>
  );
}

function PushBanner({ onEnable }: { onEnable: () => void }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (sessionStorage.getItem("push-dismissed")) return;
    // Hiện sau 5s để không chặn UX ngay khi vào
    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[99] w-72 animate-slide-in rounded-2xl shadow-[var(--shadow-lg)]"
      style={{
        background: "var(--surface-2)",
        border: "1px solid rgba(170,237,42,0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(170,237,42,0.1)",
      }}
    >
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--text)]">🔔 Bật thông báo</p>
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem("push-dismissed", "1");
            }}
            className="text-[var(--text-faint)] hover:text-[var(--text)] text-lg leading-none"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-[var(--text-muted)] leading-relaxed">
          Nhận thông báo ngay khi được giao task mới hoặc tới lượt handoff.
        </p>
        <button
          onClick={() => {
            onEnable();
            setDismissed(true);
          }}
          className="btn-accent w-full rounded-xl py-2.5 text-sm font-bold"
        >
          Bật thông báo
        </button>
      </div>
    </div>
  );
}
