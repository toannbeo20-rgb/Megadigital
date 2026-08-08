"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { IconBell } from "./icons";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { notifications, markAllNotisRead } = useStore();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;

  function handleOpen() {
    setOpen((o) => !o);
    if (!open) markAllNotisRead();
  }

  function handleNotiClick(taskId?: string) {
    setOpen(false);
    if (taskId) router.push(`/cong-viec/${taskId}`);
  }

  return (
    <div className="relative">
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
          open
            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        )}
        aria-label="Thông báo"
      >
        <IconBell />
        {unread > 0 && (
          <span
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black text-black animate-pulse-glow"
            style={{ background: "var(--accent)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="animate-in absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-[var(--radius)] shadow-[var(--shadow-lg)]"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="text-sm font-bold text-[var(--text)]">Thông báo</span>
              {notifications.length > 0 && (
                <span className="badge-accent">{notifications.length}</span>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-2 text-3xl opacity-30">🔔</div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">Chưa có thông báo</p>
                  <p className="mt-1 max-w-[200px] text-xs text-[var(--text-faint)]">
                    Khi được giao việc hoặc tới lượt handoff, bạn sẽ thấy ở đây.
                  </p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotiClick(n.taskId)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-2)]",
                      i < notifications.length - 1 && "border-b",
                      n.taskId && "cursor-pointer"
                    )}
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* Dot indicator */}
                    <div className="mt-1.5 shrink-0">
                      <span
                        className="block h-2 w-2 rounded-full"
                        style={{
                          background: n.text.includes("Tới lượt")
                            ? "var(--warn)"
                            : "var(--accent)",
                          boxShadow: `0 0 6px currentColor`,
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-[var(--text)]">{n.text}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                        {timeAgo(new Date(n.createdAt).toISOString())}
                        {n.taskId && (
                          <span className="ml-2 text-[var(--accent)]">Xem task →</span>
                        )}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
