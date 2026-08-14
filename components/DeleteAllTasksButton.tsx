"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";

// Nút "Xoá tất cả task" cho manager — có modal xác nhận 2 lớp (không hoàn tác).
export default function DeleteAllTasksButton() {
  const { tasks, deleteAllTasks } = useStore();
  const [open, setOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function confirmDelete() {
    setBusy(true);
    const res = await deleteAllTasks();
    setBusy(false);
    if (!res.ok) {
      alert(`Lỗi xoá task: ${res.error ?? "không rõ"}`);
      return;
    }
    setOpen(false);
    setUnderstood(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={tasks.length === 0}
        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
        title={tasks.length === 0 ? "Không có task để xoá" : "Xoá tất cả task"}
      >
        🗑 Xoá tất cả task
      </button>

      {mounted && open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : () => setOpen(false)} />
            <div className="relative w-full max-w-md scale-100 animate-in fade-in zoom-in-95 rounded-2xl bg-[var(--surface)] p-6 shadow-2xl ring-1 ring-red-500/20">
              <h2 className="text-xl font-black text-[var(--text)]">Xoá tất cả task?</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Thao tác này sẽ xoá <span className="font-bold text-red-400">{tasks.length} task</span> cùng toàn bộ
                nội dung &amp; bình luận gắn với chúng. <span className="font-semibold text-[var(--text)]">Không thể hoàn tác.</span>
                <br />
                Khách hàng và tài khoản nhân sự vẫn được giữ nguyên.
              </p>

              <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-red-500"
                />
                <span className="text-sm text-[var(--text-muted)]">Tôi hiểu thao tác này không thể hoàn tác.</span>
              </label>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="rounded-lg px-4 py-2.5 font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  Huỷ
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={!understood || busy}
                  className="rounded-lg bg-red-500 px-5 py-2.5 font-bold text-white hover:bg-red-600 disabled:opacity-40"
                >
                  {busy ? "Đang xoá…" : `Xoá ${tasks.length} task`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
