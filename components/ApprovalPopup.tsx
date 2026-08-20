"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

// Popup ăn mừng khi nội dung của bạn được duyệt (hiện realtime cho người viết).
export default function ApprovalPopup() {
  const { approvalPopup, dismissApprovalPopup } = useStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !approvalPopup) return null;

  const text = approvalPopup.text.replace(/^🎉\s*/, "");

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissApprovalPopup} />
      <div
        className="relative w-full max-w-sm scale-100 animate-bounce-in rounded-2xl bg-[var(--surface)] p-6 text-center shadow-2xl"
        style={{ border: "1px solid rgba(170,237,42,.35)", boxShadow: "0 0 40px rgba(170,237,42,.2)" }}
      >
        <div className="mb-2 text-5xl">🎉</div>
        <h2 className="text-xl font-black text-[var(--text)]">Đã được duyệt!</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{text}</p>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={dismissApprovalPopup}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Đóng
          </button>
          {approvalPopup.taskId && (
            <button
              onClick={() => { const id = approvalPopup.taskId; dismissApprovalPopup(); if (id) router.push(`/cong-viec/${id}`); }}
              className="btn-accent flex-1 rounded-xl px-4 py-2.5 text-sm font-bold"
            >
              Mở task →
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
