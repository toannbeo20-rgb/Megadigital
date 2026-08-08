"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  KIND_META,
  TASK_STATUS_META,
  JOB_STATUS_META,
  BRIEF_FIELDS,
  type BriefData,
  type TaskKind,
  type TaskStatus,
} from "@/lib/types";
import { Avatar, Badge } from "@/components/ui";
import CommentComposer from "@/components/CommentComposer";
import { deadlineLabel, cn } from "@/lib/utils";

const WEIGHT_LABELS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: "Nhẹ", desc: "1–2h", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  2: { label: "Vừa", desc: "2–4h", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  3: { label: "Nặng", desc: "4h+", color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const STATUS_FLOW: TaskStatus[] = ["ton", "dang_lam", "cho_duyet", "xong"];
const STATUS_COLORS: Record<TaskStatus, string> = {
  ton: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]",
  dang_lam: "bg-[rgba(170,237,42,0.12)] text-[var(--accent)] border-[rgba(170,237,42,0.3)]",
  cho_duyet: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  xong: "bg-emerald-500/12 text-emerald-400 border-emerald-500/30",
};

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const { tasks, jobs, clients, users, comments, updateTask, addComment, currentUser } = useStore();

  const task = tasks.find((t) => t.id === taskId);
  const client = task ? clients.find((c) => c.id === task.client_id) : null;
  const assignee = task ? users.find((u) => u.id === task.assignee_id) : null;
  const dependsOn = task?.depends_on_task_id
    ? tasks.find((t) => t.id === task.depends_on_task_id)
    : null;

  // Local state để edit inline
  const [editTitle, setEditTitle] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editKind, setEditKind] = useState<TaskKind>(null);
  const [editWeight, setEditWeight] = useState(1);
  const [editDepends, setEditDepends] = useState<string | null>(null);
  const [editBrief, setEditBrief] = useState<string>("");
  const [editBriefData, setEditBriefData] = useState<BriefData>({});
  const [editRefs, setEditRefs] = useState<string>(""); // mỗi dòng 1 link
  const [saved, setSaved] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitLink, setSubmitLink] = useState("");
  const [submitNote, setSubmitNote] = useState("");

  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditAssignee(task.assignee_id);
      setEditDeadline(task.deadline);
      setEditKind(task.kind);
      setEditWeight(task.weight);
      setEditDepends(task.depends_on_task_id);
      setEditBrief(task.brief ?? "");
      setEditBriefData(task.brief_data ?? {});
      setEditRefs((task.brief_data?.refs ?? []).join("\n"));
    }
  }, [task]);

  if (!task || !client) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-[var(--text-faint)]">Không tìm thấy task.</p>
        <Link
          href="/cong-viec"
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          ← Quay lại Công việc
        </Link>
      </div>
    );
  }

  const dl = deadlineLabel(task.deadline);
  const isManager = currentUser.permission === "manager";
  const canEdit = isManager || task.assignee_id === currentUser.id;

  function save() {
    const refs = editRefs.split("\n").map((s) => s.trim()).filter(Boolean);
    const bd: BriefData = {
      objective: editBriefData.objective?.trim() || undefined,
      audience: editBriefData.audience?.trim() || undefined,
      key_message: editBriefData.key_message?.trim() || undefined,
      format: editBriefData.format?.trim() || undefined,
      refs: refs.length ? refs : undefined,
    };
    const hasBrief = Object.values(bd).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
    updateTask(task!.id, {
      title: editTitle.trim() || task!.title,
      assignee_id: editAssignee,
      deadline: editDeadline,
      kind: editKind,
      weight: editWeight,
      depends_on_task_id: editDepends,
      brief: editBrief.trim() ? editBrief.trim() : null,
      brief_data: hasBrief ? bd : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleApprove() {
    await updateTask(task!.id, { status: "xong" });
    const dependent = tasks.find((t) => t.depends_on_task_id === task!.id);
    if (dependent) {
      const submissionComment = comments.filter((c) => c.task_id === task!.id && c.content.includes("[NỘP BÀI]")).pop();
      if (submissionComment) {
        const appendedBrief = (dependent.brief ? dependent.brief + "\n\n" : "") + "---\nTÀI LIỆU TỪ TASK TRƯỚC:\n" + submissionComment.content.replace("[NỘP BÀI]\n", "");
        await updateTask(dependent.id, { brief: appendedBrief });
      }
    }
    router.push("/cong-viec");
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    const content = `[NỘP BÀI]\n- Link đính kèm: ${submitLink}\n- Lời nhắn: ${submitNote}`;
    await addComment(task!.id, content);
    await updateTask(task!.id, { status: "cho_duyet" });
    setShowSubmitModal(false);
    router.push("/cong-viec");
  }

  const siblingTasks = tasks.filter((t) => t.id !== task!.id && t.client_id === task!.client_id);
  const taskComments = comments.filter((c) => c.task_id === task!.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function pingAssignee() {
    // Demo giả lập ping
    alert(`Đã gửi thông báo giục tiến độ tới ${assignee?.name}!`);
  }

  return (
    <div className="mx-auto max-w-2xl animate-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-faint)]">
        <Link href="/" className="hover:text-[var(--text)] transition-colors">Hôm nay</Link>
        <span>/</span>
        <Link href="/cong-viec" className="hover:text-[var(--text)] transition-colors">Công việc</Link>
        <span>/</span>
        <span className="text-[var(--text-muted)] truncate">{task.title}</span>
      </div>

      {/* Header card */}
      <div className="card-glow mb-5 rounded-[var(--radius)] p-5">
        {/* Client */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {client && (
            <Link
              href={`/khach/${client.id}`}
              className="badge-accent hover:opacity-80 transition-opacity"
            >
              {client.name}
            </Link>
          )}
        </div>

        {/* Title editable */}
        {canEdit ? (
          <textarea
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            rows={2}
            className="w-full resize-none bg-transparent text-xl font-bold text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:ring-0"
            placeholder="Tên task..."
          />
        ) : (
          <h1 className="text-xl font-bold text-[var(--text)]">{task.title}</h1>
        )}

        {/* Status & Deadline badge */}
        <div className="mt-2 flex items-center gap-3">
          <Badge className={
            task.status === "dang_lam" ? "bg-[var(--accent-soft)] text-[var(--accent)] border-none" :
            task.status === "cho_duyet" ? "bg-amber-500/15 text-amber-500 border-none" :
            task.status === "xong" ? "bg-emerald-500/15 text-emerald-500 border-none" :
            "bg-[var(--surface-2)] text-[var(--text-muted)] border-none"
          }>
            {task.status === "ton" ? "Chưa làm" : 
             task.status === "dang_lam" ? "Đang làm" : 
             task.status === "cho_duyet" ? "Chờ duyệt" : "Đã xong"}
          </Badge>
          
          <div className="h-4 w-px bg-[var(--border)]"></div>
          
          <span
            className={cn(
              "text-sm font-semibold",
              dl.tone === "danger" && "text-[var(--danger)]",
              dl.tone === "warn" && "text-[var(--warn)]",
              dl.tone === "muted" && "text-[var(--text-faint)]"
            )}
          >
            {dl.text}
          </span>
          {task.completed_at && (
            <span className="text-xs text-emerald-400">
              · Xong {new Date(task.completed_at).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>
        
        {/* Nút Ping */}
        {isManager && task.status !== "xong" && (
          <button
            onClick={pingAssignee}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
          >
            🔔 Giục tiến độ
          </button>
        )}
      </div>

      {/* Grid chi tiết */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">

        {/* Assignee */}
        <FieldBlock label="Người phụ trách">
          {canEdit && isManager ? (
            <select
              value={editAssignee}
              onChange={(e) => setEditAssignee(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name.replace(/\(.*?\)/g, "").trim()}
                </option>
              ))}
            </select>
          ) : (
            assignee && (
              <div className="flex items-center gap-2.5">
                <Avatar user={assignee} size={36} />
                <div>
                  <p className="text-sm font-medium">{assignee.name.replace(/\(.*?\)/g, "").trim()}</p>
                  <p className="text-xs text-[var(--text-faint)]">{assignee.roles.map((r) => `#${r}`).join(" ")}</p>
                </div>
              </div>
            )
          )}
        </FieldBlock>

        {/* Deadline */}
        <FieldBlock label="Deadline">
          {canEdit ? (
            <input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          ) : (
            <p className="text-sm">{task.deadline}</p>
          )}
        </FieldBlock>

        {/* Kind */}
        <FieldBlock label="Loại công việc">
          <div className="flex flex-wrap gap-2">
            {(["content", "design", "media", "account", null] as (TaskKind | null)[]).map((k) => (
              <button
                key={String(k)}
                onClick={() => canEdit && setEditKind(k)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                  editKind === k
                    ? k
                      ? KIND_META[k].color + " ring-1 ring-current/20 border-transparent"
                      : "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border-bright)]"
                    : "bg-transparent text-[var(--text-faint)] border-[var(--border)] hover:border-[var(--border-bright)]",
                  !canEdit && "opacity-50 cursor-not-allowed"
                )}
              >
                {k ? KIND_META[k].label : "Chưa chọn"}
              </button>
            ))}
          </div>
        </FieldBlock>

        {/* Weight */}
        <FieldBlock label="Độ nặng">
          <div className="flex gap-2">
            {[1, 2, 3].map((w) => (
              <button
                key={w}
                onClick={() => canEdit && setEditWeight(w)}
                className={cn(
                  "flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all",
                  editWeight === w
                    ? WEIGHT_LABELS[w].color + " border"
                    : "bg-transparent text-[var(--text-faint)] border-[var(--border)] hover:border-[var(--border-bright)]",
                  !canEdit && "opacity-50 cursor-not-allowed"
                )}
              >
                {WEIGHT_LABELS[w].label}
                <span className="block text-[10px] font-normal opacity-70">{WEIGHT_LABELS[w].desc}</span>
              </button>
            ))}
          </div>
        </FieldBlock>

        {/* Depends on */}
        <FieldBlock label="Chờ task này xong trước">
          {canEdit ? (
            <select
              value={editDepends ?? ""}
              onChange={(e) => setEditDepends(e.target.value || null)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
              <option value="">— Không phụ thuộc —</option>
              {siblingTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm">
              {dependsOn ? (
                <Link href={`/cong-viec/${dependsOn.id}`} className="text-[var(--accent)] hover:underline">
                  {dependsOn.title}
                </Link>
              ) : (
                <span className="text-[var(--text-faint)]">Không phụ thuộc</span>
              )}
            </p>
          )}
        </FieldBlock>

        {/* Brief có cấu trúc (M2) */}
        <div className="card p-4 md:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
            Brief công việc
          </p>

          {canEdit ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {BRIEF_FIELDS.map((f) =>
                f.multiline ? (
                  <div key={f.key} className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{f.label}</label>
                    <textarea
                      value={editBriefData[f.key] ?? ""}
                      onChange={(e) => setEditBriefData((d) => ({ ...d, [f.key]: e.target.value }))}
                      rows={2}
                      placeholder={f.placeholder}
                      className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                ) : (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{f.label}</label>
                    <input
                      value={editBriefData[f.key] ?? ""}
                      onChange={(e) => setEditBriefData((d) => ({ ...d, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                )
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Link tham khảo (mỗi dòng 1 link)</label>
                <textarea
                  value={editRefs}
                  onChange={(e) => setEditRefs(e.target.value)}
                  rows={2}
                  placeholder="https://drive.google.com/...&#10;https://figma.com/..."
                  className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          ) : (
            <BriefView data={task.brief_data} />
          )}
        </div>

        {/* Ghi chú / tài liệu tự do (+ bàn giao) */}
        <div className="card p-4 md:col-span-2">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
            Ghi chú / tài liệu
          </p>
          {canEdit ? (
            <textarea
              value={editBrief}
              onChange={(e) => setEditBrief(e.target.value)}
              rows={3}
              placeholder="Ghi chú thêm, tài liệu bàn giao..."
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3 min-h-16">
              {task.brief || <span className="text-[var(--text-faint)] italic">Không có nội dung</span>}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons - ngang nhau */}
      {canEdit && (
        <div className="mb-5 flex gap-3">
          {/* Nút trạng thái */}
          {task.status === "ton" && (
            <button onClick={() => updateTask(task.id, { status: "dang_lam" })} className="btn-accent rounded-xl px-4 py-3 font-bold flex-1">
              🚀 Bắt đầu làm
            </button>
          )}
          {task.status === "dang_lam" && (
            <button onClick={() => setShowSubmitModal(true)} className="rounded-xl px-4 py-3 font-bold flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
              📤 Nộp bài & Chuyển giao
            </button>
          )}
          {task.status === "cho_duyet" && isManager && (
            <>
              <button onClick={() => updateTask(task.id, { status: "dang_lam" })} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-500 hover:bg-red-500/20 flex-1 transition-all">
                ↩ Yêu cầu sửa lại
              </button>
              <button onClick={() => handleApprove()} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-500 hover:bg-emerald-500/20 flex-1 transition-all">
                ✓ Duyệt & Đóng Task
              </button>
            </>
          )}
          {task.status === "xong" && (
            <div className="flex-1 text-center py-3 text-emerald-500 font-bold bg-emerald-500/10 rounded-xl">
              ✓ Đã hoàn thành
            </div>
          )}

          {/* Nút Lưu - luôn hiện ngang hàng */}
          {task.status !== "xong" && (
            <button
              onClick={save}
              className={cn(
                "btn-accent rounded-xl px-6 py-3 text-sm font-bold transition-all flex-1",
                saved && "bg-emerald-500 shadow-none"
              )}
            >
              {saved ? "✓ Đã lưu" : "💾 Lưu thay đổi"}
            </button>
          )}
        </div>
      )}

      {/* Bình luận */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Bình luận & Feedback</h2>
        <div className="mb-4 flex flex-col gap-4">
          {taskComments.length === 0 ? (
            <p className="text-sm italic text-[var(--text-faint)] text-center py-4">Chưa có bình luận nào.</p>
          ) : (
            taskComments.map((c) => {
              const u = users.find(u => u.id === c.user_id);
              return (
                <div key={c.id} className="flex gap-3">
                  <Avatar user={u || users[0]} size={32} />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold">{u?.name.replace(/\(.*?\)/g, "").trim()}</span>
                      <span className="text-[10px] text-[var(--text-faint)]">{new Date(c.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mt-0.5 rounded-2xl rounded-tl-none bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text)] whitespace-pre-wrap">
                      {renderWithMentions(c.content, users)}
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
          onSubmit={(text, mentions) => addComment(task!.id, text, mentions)}
        />
      </div>

      {/* Meta footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-faint)]">
        <span>Tạo: {task.created_at ? new Date(task.created_at).toLocaleDateString("vi-VN") : "—"}</span>
        <Link href="/cong-viec" className="hover:text-[var(--accent)] transition-colors">
          ← Quay lại bảng
        </Link>
      </div>

      {/* Modal Nộp bài */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowSubmitModal(false)}>
          <div className="animate-bounce-in w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-[var(--text)]">Nộp bài & Chuyển giao</h2>
            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">Link đính kèm (Drive/Figma/Doc)</label>
                <input
                  type="url"
                  required
                  value={submitLink}
                  onChange={(e) => setSubmitLink(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="https://..."
                />
              </div>
              <div className="mb-5">
                <label className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">Lời nhắn / Dặn dò cho công đoạn sau</label>
                <textarea
                  required
                  value={submitNote}
                  onChange={(e) => setSubmitNote(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="Note chú ý cắt góc trái video nhé..."
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 rounded-xl bg-[var(--surface-2)] py-2.5 font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
                  Hủy
                </button>
                <button type="submit" className="flex-1 rounded-xl bg-amber-500 py-2.5 font-bold text-white shadow-md hover:bg-amber-600">
                  Xác nhận Nộp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Tô sáng các thẻ "@Tên" khớp với thành viên trong team.
function renderWithMentions(text: string, users: { id: string; name: string }[]) {
  const names = users
    .map((u) => u.name.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length); // ưu tiên khớp tên dài trước
  if (names.length === 0) return text;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(${escaped.join("|")})`, "g");
  const parts: (string | React.ReactElement)[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={key++} className="font-semibold text-[var(--accent)]">
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Hiển thị brief có cấu trúc ở chế độ chỉ đọc
function BriefView({ data }: { data?: BriefData | null }) {
  const hasAny =
    data &&
    (data.objective || data.audience || data.key_message || data.format || (data.refs && data.refs.length > 0));
  if (!hasAny) {
    return <p className="text-sm italic text-[var(--text-faint)]">Chưa có brief. Bấm sửa để thêm.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BRIEF_FIELDS.map((f) =>
        data![f.key] ? (
          <div key={f.key} className={f.multiline ? "sm:col-span-2" : undefined}>
            <p className="text-xs font-medium text-[var(--text-faint)]">{f.label}</p>
            <p className="text-sm text-[var(--text)] whitespace-pre-wrap">{data![f.key]}</p>
          </div>
        ) : null
      )}
      {data!.refs && data!.refs.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs font-medium text-[var(--text-faint)]">Link tham khảo</p>
          <div className="flex flex-col gap-1">
            {data!.refs.map((r, i) => (
              <a
                key={i}
                href={r}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-[var(--accent)] hover:underline"
              >
                {r}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
        {label}
      </p>
      {children}
    </div>
  );
}
