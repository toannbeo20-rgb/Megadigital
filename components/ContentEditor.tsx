"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  APPROVAL_FLOW,
  APPROVAL_META,
  type ApprovalStatus,
  type Task,
  type User,
} from "@/lib/types";
import { Avatar } from "./ui";
import CommentComposer from "./CommentComposer";
import { cn } from "@/lib/utils";

function displayName(u?: User) {
  return u?.name.replace(/\(.*?\)/g, "").trim() ?? "?";
}

// Bước tiếp theo hợp lệ (luồng nội bộ 3 trạng thái + nhánh Cần sửa)
// managerOnly = quyết định duyệt/từ chối, chỉ quản lý; người làm chỉ trình duyệt.
type Act = { to: ApprovalStatus; label: string; kind: "primary" | "ok" | "warn" | "muted"; managerOnly?: boolean };
function nextActions(s: ApprovalStatus): Act[] {
  switch (s) {
    case "draft":     return [{ to: "noi_bo", label: "Trình duyệt", kind: "primary" }];
    case "noi_bo":    return [
      { to: "khach_ok", label: "Duyệt ✓", kind: "ok", managerOnly: true },
      { to: "khach_sua", label: "Yêu cầu sửa", kind: "warn", managerOnly: true },
      { to: "draft", label: "Về nháp", kind: "muted" },
    ];
    case "khach_sua": return [{ to: "noi_bo", label: "Đã sửa, trình lại", kind: "primary" }];
    case "khach_ok":  return [{ to: "noi_bo", label: "Mở lại", kind: "muted", managerOnly: true }];
    default:          return [{ to: "noi_bo", label: "Về chờ duyệt", kind: "primary" }];
  }
}

const BTN: Record<string, string> = {
  primary: "btn-accent",
  ok: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  warn: "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  muted: "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
};

// 1 task = 1 nội dung → editor lớn, là nhân vật chính của trang task.
export default function ContentEditor({ task }: { task: Task }) {
  const { contents, comments, users, currentUser, addContent, updateContent, addComment } = useStore();
  // Lấy nội dung của task (nếu có nhiều bản ghi cũ → dùng bản mới nhất)
  const content =
    contents
      .filter((c) => c.task_id === task.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;

  const isManager = currentUser.permission === "manager";
  const canEdit = isManager || task.assignee_id === currentUser.id || content?.created_by === currentUser.id;

  const [title, setTitle] = useState(content?.title ?? "");
  const [body, setBody] = useState(content?.body ?? "");
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);

  // Đồng bộ khi nội dung được nạp / đổi (realtime)
  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setBody(content.body);
    }
  }, [content?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (content) {
      const bodyChanged = body !== content.body;
      updateContent(content.id, { title: title.trim() || content.title, body }, bodyChanged);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } else {
      if (!body.trim() && !title.trim()) return;
      setCreating(true);
      await addContent(task.id, title.trim() || "Nội dung", body);
      setCreating(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  const meta = content ? APPROVAL_META[content.approval_status] : null;
  const threadComments = content
    ? comments.filter((c) => c.content_id === content.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  return (
    <div className="card p-4">
      {/* Header nội dung */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-faint)]">Nội dung</h2>
        {content && meta && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-faint)]">
              v{content.version} · {new Date(content.updated_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.className)}>{meta.label}</span>
          </div>
        )}
      </div>

      {/* Pipeline stepper (khi đã có nội dung) */}
      {content && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {APPROVAL_FLOW.map((s, i) => {
            const active = s === content.approval_status;
            const passed = APPROVAL_FLOW.indexOf(content.approval_status) > i || content.approval_status === "khach_ok";
            return (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                  active ? APPROVAL_META[s].className : passed ? "border-emerald-500/20 text-emerald-500/70" : "border-[var(--border)] text-[var(--text-faint)]"
                )}>
                  {APPROVAL_META[s].short}
                </span>
                {i < APPROVAL_FLOW.length - 1 && <span className="text-[var(--text-faint)]">→</span>}
              </div>
            );
          })}
          {content.approval_status === "khach_sua" && (
            <span className={cn("ml-1 rounded-full border px-2.5 py-1 text-xs font-semibold", APPROVAL_META.khach_sua.className)}>
              ⚠ {APPROVAL_META.khach_sua.short}
            </span>
          )}
        </div>
      )}

      {/* Editor lớn */}
      {canEdit ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề nội dung"
            className="mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-base font-semibold outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Viết caption / bài / kịch bản ở đây… (markdown nhẹ)"
            className="min-h-[320px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={creating}
              className={cn("rounded-xl px-4 py-2 text-sm font-bold", saved ? "bg-emerald-500 text-white" : "btn-accent")}
            >
              {saved ? "✓ Đã lưu" : creating ? "Đang lưu…" : content ? "💾 Lưu nội dung" : "＋ Tạo nội dung"}
            </button>
            {content && (
              <>
                <span className="mr-1 text-xs text-[var(--text-faint)]">Lưu khi đổi nội dung sẽ tăng phiên bản.</span>
                {nextActions(content.approval_status)
                  .filter((a) => !a.managerOnly || isManager)
                  .map((a) => (
                  <button
                    key={a.to}
                    onClick={() => updateContent(content.id, { approval_status: a.to })}
                    className={cn("rounded-xl px-3.5 py-2 text-sm font-bold transition-colors", BTN[a.kind])}
                  >
                    {a.label}
                  </button>
                ))}
                {content.approval_status === "noi_bo" && !isManager && (
                  <span className="self-center text-xs text-[var(--text-faint)]">Đang chờ quản lý duyệt…</span>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3.5 text-sm leading-relaxed min-h-[120px]">
          {content?.body || <span className="italic text-[var(--text-faint)]">Chưa có nội dung.</span>}
        </div>
      )}

      {/* Thread trao đổi về nội dung */}
      {content && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Trao đổi về nội dung</p>
          <div className="mb-3 flex flex-col gap-3">
            {threadComments.length === 0 ? (
              <p className="text-xs italic text-[var(--text-faint)]">Chưa có trao đổi.</p>
            ) : (
              threadComments.map((cm) => {
                const u = users.find((x) => x.id === cm.user_id);
                return (
                  <div key={cm.id} className="flex gap-2.5">
                    <Avatar user={u || users[0]} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold">{displayName(u)}</span>
                        <span className="text-[10px] text-[var(--text-faint)]">
                          {new Date(cm.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="mt-0.5 rounded-2xl rounded-tl-none bg-[var(--surface-2)] px-3.5 py-2 text-sm whitespace-pre-wrap">
                        {cm.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <CommentComposer
            users={users}
            currentUserId={currentUser.id}
            onSubmit={(text, mentions) => addComment(task.id, text, mentions, content.id)}
          />
        </div>
      )}
    </div>
  );
}
