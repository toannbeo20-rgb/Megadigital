"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { APPROVAL_META, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

// Hiển thị nội dung TỪ KHÂU TRƯỚC (task mà task này phụ thuộc) — đọc, realtime.
// Giúp designer/editor thấy đầu vào ngay khi tới lượt.
export default function UpstreamContentPanel({ task }: { task: Task }) {
  const { tasks, contents, users } = useStore();
  if (!task.depends_on_task_id) return null;

  const upTask = tasks.find((t) => t.id === task.depends_on_task_id);
  if (!upTask) return null;

  const upContent = contents
    .filter((c) => c.task_id === upTask.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const meta = upContent ? APPROVAL_META[upContent.approval_status] : null;
  const upAssignee = users.find((u) => u.id === upTask.assignee_id);

  return (
    <div className="card border-l-2 border-l-[var(--accent)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          📥 Đầu vào từ khâu trước
        </span>
        <div className="flex items-center gap-2">
          {meta && (
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.className)}>
              {meta.label}
            </span>
          )}
          <Link href={`/cong-viec/${upTask.id}`} className="text-xs font-medium text-[var(--accent)] hover:underline">
            Mở khâu trước →
          </Link>
        </div>
      </div>

      <p className="mb-2 text-xs text-[var(--text-faint)]">
        {upTask.title}
        {upAssignee && <> · {upAssignee.name.replace(/\(.*?\)/g, "").trim()}</>}
      </p>

      {upContent ? (
        <div className="rounded-xl bg-[var(--surface-2)] p-3.5">
          {upContent.title && <p className="mb-1 text-sm font-semibold text-[var(--text)]">{upContent.title}</p>}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-muted)]">
            {upContent.body || <span className="italic text-[var(--text-faint)]">Chưa có nội dung.</span>}
          </div>
          <p className="mt-2 text-[10px] text-[var(--text-faint)]">
            v{upContent.version} · cập nhật {new Date(upContent.updated_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      ) : (
        <p className="text-sm italic text-[var(--text-faint)]">Khâu trước chưa có nội dung.</p>
      )}
    </div>
  );
}
