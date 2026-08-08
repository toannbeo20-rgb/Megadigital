"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  APPROVAL_FLOW,
  APPROVAL_META,
  type ApprovalStatus,
  type Content,
  type Task,
  type User,
} from "@/lib/types";
import { Avatar } from "./ui";
import CommentComposer from "./CommentComposer";
import { cn } from "@/lib/utils";

function displayName(u?: User) {
  return u?.name.replace(/\(.*?\)/g, "").trim() ?? "?";
}

// Các bước tiếp theo hợp lệ theo trạng thái hiện tại
function nextActions(s: ApprovalStatus): { to: ApprovalStatus; label: string; kind: "primary" | "ok" | "warn" | "muted" }[] {
  switch (s) {
    case "draft":
      return [{ to: "noi_bo", label: "Trình duyệt nội bộ", kind: "primary" }];
    case "noi_bo":
      return [
        { to: "gui_khach", label: "Gửi khách", kind: "primary" },
        { to: "draft", label: "Trả về nháp", kind: "muted" },
      ];
    case "gui_khach":
      return [
        { to: "khach_ok", label: "Khách duyệt ✓", kind: "ok" },
        { to: "khach_sua", label: "Khách yêu cầu sửa", kind: "warn" },
      ];
    case "khach_sua":
      return [{ to: "gui_khach", label: "Đã sửa, gửi lại khách", kind: "primary" }];
    case "khach_ok":
      return [{ to: "gui_khach", label: "Mở lại", kind: "muted" }];
  }
}

const BTN: Record<string, string> = {
  primary: "btn-accent",
  ok: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  warn: "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  muted: "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]",
};

export default function ContentPanel({ task }: { task: Task }) {
  const { contents, comments, users, currentUser, addContent, updateContent, addComment } = useStore();
  const items = contents
    .filter((c) => c.task_id === task.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleAdd() {
    const c = await addContent(task.id, "Nội dung mới", "");
    if (c) setOpenId(c.id);
  }

  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text)]">Nội dung / Bài duyệt</h2>
        <button onClick={handleAdd} className="btn-accent rounded-xl px-3.5 py-2 text-sm font-bold">
          + Thêm nội dung
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] py-10 text-center">
          <p className="text-2xl opacity-40">✍️</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Chưa có nội dung nào.</p>
          <p className="text-xs text-[var(--text-faint)]">Thêm caption/bài/kịch bản để chạy qua vòng duyệt khách.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <ContentCard
              key={c.id}
              content={c}
              taskId={task.id}
              open={openId === c.id}
              onToggle={() => setOpenId((id) => (id === c.id ? null : c.id))}
              users={users}
              currentUserId={currentUser.id}
              isManager={currentUser.permission === "manager"}
              taskAssignee={task.assignee_id}
              comments={comments.filter((cm) => cm.content_id === c.id)}
              updateContent={updateContent}
              addComment={addComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentCard({
  content,
  taskId,
  open,
  onToggle,
  users,
  currentUserId,
  isManager,
  taskAssignee,
  comments,
  updateContent,
  addComment,
}: {
  content: Content;
  taskId: string;
  open: boolean;
  onToggle: () => void;
  users: User[];
  currentUserId: string;
  isManager: boolean;
  taskAssignee: string;
  comments: { id: string; user_id: string; content: string; created_at: string }[];
  updateContent: ReturnType<typeof useStore>["updateContent"];
  addComment: ReturnType<typeof useStore>["addComment"];
}) {
  const meta = APPROVAL_META[content.approval_status];
  const canEdit = isManager || content.created_by === currentUserId || taskAssignee === currentUserId;

  const [title, setTitle] = useState(content.title);
  const [body, setBody] = useState(content.body);
  const [saved, setSaved] = useState(false);

  function save() {
    const bodyChanged = body !== content.body;
    updateContent(content.id, { title: title.trim() || content.title, body }, bodyChanged);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="card overflow-hidden rounded-[var(--radius)]">
      {/* Header (bấm để mở/đóng) */}
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--surface-2)] transition-colors">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text)]">{content.title}</p>
          <p className="truncate text-xs text-[var(--text-faint)]">
            v{content.version} · cập nhật {new Date(content.updated_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.className)}>
          {meta.label}
        </span>
        <span className="shrink-0 text-[var(--text-faint)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-4">
          {/* Pipeline stepper */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {APPROVAL_FLOW.map((s, i) => {
              const active = s === content.approval_status;
              const passed = APPROVAL_FLOW.indexOf(content.approval_status) > i || content.approval_status === "khach_ok";
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold border",
                      active ? APPROVAL_META[s].className : passed ? "border-emerald-500/20 text-emerald-500/70" : "border-[var(--border)] text-[var(--text-faint)]"
                    )}
                  >
                    {APPROVAL_META[s].short}
                  </span>
                  {i < APPROVAL_FLOW.length - 1 && <span className="text-[var(--text-faint)]">→</span>}
                </div>
              );
            })}
            {content.approval_status === "khach_sua" && (
              <span className={cn("ml-1 rounded-full px-2.5 py-1 text-xs font-semibold border", APPROVAL_META.khach_sua.className)}>
                ⚠ {APPROVAL_META.khach_sua.short}
              </span>
            )}
          </div>

          {/* Editor */}
          {canEdit ? (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề nội dung"
                className="mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold outline-none focus:border-[var(--accent)]"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Nội dung caption / bài / kịch bản... (markdown nhẹ)"
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--accent)]"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={save} className={cn("rounded-xl px-4 py-2 text-sm font-bold", saved ? "bg-emerald-500 text-white" : "btn-accent")}>
                  {saved ? "✓ Đã lưu" : "💾 Lưu nội dung"}
                </button>
                <span className="text-xs text-[var(--text-faint)]">Lưu khi đổi nội dung sẽ tăng phiên bản.</span>
              </div>

              {/* Hành động vòng duyệt */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                {nextActions(content.approval_status).map((a) => (
                  <button
                    key={a.to}
                    onClick={() => updateContent(content.id, { approval_status: a.to })}
                    className={cn("rounded-xl px-4 py-2 text-sm font-bold transition-colors", BTN[a.kind])}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3 text-sm leading-relaxed">
              {content.body || <span className="italic text-[var(--text-faint)]">Chưa có nội dung</span>}
            </div>
          )}

          {/* Thread bình luận cho content này */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Trao đổi về nội dung này
            </p>
            <div className="mb-3 flex flex-col gap-3">
              {sortedComments.length === 0 ? (
                <p className="text-xs italic text-[var(--text-faint)]">Chưa có trao đổi.</p>
              ) : (
                sortedComments.map((cm) => {
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
              currentUserId={currentUserId}
              onSubmit={(text, mentions) => addComment(taskId, text, mentions, content.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
