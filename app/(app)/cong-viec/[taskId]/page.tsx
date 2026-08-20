"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  KIND_META,
  BRIEF_FIELDS,
  PRIORITY_META,
  TASK_FORMATS,
  CHANNELS,
  FUNNEL_META,
  planStatus,
  type BriefData,
  type Funnel,
  type Priority,
  type TaskKind,
} from "@/lib/types";
import { Avatar, Badge } from "@/components/ui";
import CommentComposer from "@/components/CommentComposer";
import ContentEditor from "@/components/ContentEditor";
import UpstreamContentPanel from "@/components/UpstreamContentPanel";
import QuickAddTask from "@/components/QuickAddTask";
import { deadlineLabel, cn } from "@/lib/utils";

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
  const [editPriority, setEditPriority] = useState<Priority>("trung_binh");
  const [editFormat, setEditFormat] = useState<string>("");
  const [editChannel, setEditChannel] = useState<string>("");
  const [editFunnel, setEditFunnel] = useState<string>("");
  const [editPublishDate, setEditPublishDate] = useState<string>("");
  const [editDepends, setEditDepends] = useState<string | null>(null);
  const [editBrief, setEditBrief] = useState<string>("");
  const [editBriefData, setEditBriefData] = useState<BriefData>({});
  const [editRefs, setEditRefs] = useState<string>(""); // mỗi dòng 1 link
  const [saved, setSaved] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false); // Brief thu gọn để content nổi lên
  const [notesOpen, setNotesOpen] = useState(false);
  const [showNextTask, setShowNextTask] = useState(false); // tạo việc khâu sau (design/editor)

  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditAssignee(task.assignee_id);
      setEditDeadline(task.deadline);
      setEditKind(task.kind);
      setEditPriority(task.priority ?? "trung_binh");
      setEditFormat(task.format ?? "");
      setEditChannel(task.channel ?? "");
      setEditFunnel(task.funnel ?? "");
      setEditPublishDate(task.publish_date ?? "");
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
      priority: editPriority,
      format: editFormat || null,
      channel: editChannel || null,
      funnel: editFunnel || null,
      publish_date: editPublishDate || null,
      depends_on_task_id: editDepends,
      brief: editBrief.trim() ? editBrief.trim() : null,
      brief_data: hasBrief ? bd : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Đánh dấu hoàn thành → handoff tự động báo "tới lượt bạn" cho task phụ thuộc (xử lý trong store.moveTask)
  async function handleComplete() {
    await updateTask(task!.id, { status: "xong" });
    router.push("/cong-viec");
  }

  const siblingTasks = tasks.filter((t) => t.id !== task!.id && t.client_id === task!.client_id);
  const taskComments = comments.filter((c) => c.task_id === task!.id && !c.content_id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function pingAssignee() {
    // Demo giả lập ping
    alert(`Đã gửi thông báo giục tiến độ tới ${assignee?.name}!`);
  }

  return (
    <div className="mx-auto max-w-5xl animate-in">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-faint)]">
        <Link href="/" className="hover:text-[var(--text)] transition-colors">Hôm nay</Link>
        <span>/</span>
        <Link href="/cong-viec" className="hover:text-[var(--text)] transition-colors">Công việc</Link>
        <span>/</span>
        <span className="text-[var(--text-muted)] truncate">{task.title}</span>
      </div>

      {/* Header gọn — nhường chỗ cho brief + nội dung */}
      <div className="card mb-4 rounded-[var(--radius)] px-4 py-3">
        {/* Hàng meta: khách · trạng thái · deadline · giục */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {client && (
            <Link href={`/khach/${client.id}`} className="badge-accent hover:opacity-80 transition-opacity">
              {client.name}
            </Link>
          )}
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
          <span className={cn(
            "text-xs font-semibold",
            dl.tone === "danger" && "text-[var(--danger)]",
            dl.tone === "warn" && "text-[var(--warn)]",
            dl.tone === "muted" && "text-[var(--text-faint)]"
          )}>
            {dl.text}
          </span>
          {task.completed_at && (
            <span className="text-xs text-emerald-400">· Xong {new Date(task.completed_at).toLocaleDateString("vi-VN")}</span>
          )}
          {isManager && task.status !== "xong" && (
            <button
              onClick={pingAssignee}
              className="ml-auto flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              🔔 Giục
            </button>
          )}
        </div>

        {/* Tiêu đề (gọn 1 dòng) */}
        {canEdit ? (
          <textarea
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            rows={1}
            className="w-full resize-none bg-transparent text-lg font-bold leading-snug text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:ring-0"
            placeholder="Tên task..."
          />
        ) : (
          <h1 className="text-lg font-bold leading-snug text-[var(--text)]">{task.title}</h1>
        )}
      </div>

      {/* Bố cục content-first: meta trái · nội dung phải */}
      <div className="gap-6 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        {/* ===== CỘT TRÁI: thông tin task ===== */}
        <div className="space-y-4">
          <div className="grid gap-4">

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

        {/* Priority */}
        <FieldBlock label="Mức độ ưu tiên">
          <div className="flex gap-2">
            {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => canEdit && setEditPriority(p)}
                className={cn(
                  "flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all",
                  editPriority === p
                    ? PRIORITY_META[p].className + " border"
                    : "bg-transparent text-[var(--text-faint)] border-[var(--border)] hover:border-[var(--border-bright)]",
                  !canEdit && "opacity-50 cursor-not-allowed"
                )}
              >
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </FieldBlock>

        {/* Định dạng sản phẩm */}
        <FieldBlock label="Định dạng sản phẩm">
          {canEdit ? (
            <select
              value={editFormat}
              onChange={(e) => setEditFormat(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
              <option value="">— Chưa chọn —</option>
              {TASK_FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm">
              {task.format || <span className="text-[var(--text-faint)]">Chưa chọn</span>}
            </p>
          )}
        </FieldBlock>

        {/* Kênh đăng */}
        <FieldBlock label="Kênh đăng">
          {canEdit ? (
            <select
              value={editChannel}
              onChange={(e) => setEditChannel(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
              <option value="">— Chưa chọn —</option>
              {CHANNELS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          ) : (
            <p className="text-sm">{task.channel || <span className="text-[var(--text-faint)]">Chưa chọn</span>}</p>
          )}
        </FieldBlock>

        {/* Phễu nội dung */}
        <FieldBlock label="Phễu nội dung">
          <div className="flex gap-2">
            {(Object.keys(FUNNEL_META) as Funnel[]).map((f) => (
              <button
                key={f}
                onClick={() => canEdit && setEditFunnel(editFunnel === f ? "" : f)}
                title={FUNNEL_META[f].hint}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs font-bold transition-all",
                  editFunnel === f ? FUNNEL_META[f].className : "bg-transparent text-[var(--text-faint)] border-[var(--border)] hover:border-[var(--border-bright)]",
                  !canEdit && "opacity-50 cursor-not-allowed"
                )}
              >
                {FUNNEL_META[f].label}
              </button>
            ))}
          </div>
        </FieldBlock>

        {/* Ngày đăng dự kiến */}
        <FieldBlock label="Ngày đăng dự kiến">
          {canEdit ? (
            <input
              type="date"
              value={editPublishDate}
              onChange={(e) => setEditPublishDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          ) : (
            <p className="text-sm">{task.publish_date || <span className="text-[var(--text-faint)]">Chưa đặt</span>}</p>
          )}
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
          </div>{/* end lưới meta */}

          {/* Hành động */}
          {canEdit && (
            <div className="flex gap-2.5">
              {task.status === "ton" && (
                <button onClick={() => updateTask(task.id, { status: "dang_lam" })} className="btn-accent flex-1 rounded-xl px-3 py-2.5 text-sm font-bold">🚀 Bắt đầu</button>
              )}
              {(task.status === "dang_lam" || task.status === "cho_duyet") && (
                <button onClick={handleComplete} className="btn-accent flex-1 rounded-xl px-3 py-2.5 text-sm font-bold">✅ Hoàn thành</button>
              )}
              {task.status === "xong" && (
                <button onClick={() => updateTask(task.id, { status: "dang_lam" })} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]">↩ Mở lại</button>
              )}
              {task.status !== "xong" && (
                <button onClick={save} className={cn("flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all", saved ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-bright)]")}>{saved ? "✓ Đã lưu" : "💾 Lưu"}</button>
              )}
            </div>
          )}

          {/* Đánh dấu đã đăng (xuất bản) */}
          {canEdit && (
            task.published_at ? (
              <button
                onClick={() => updateTask(task.id, { published_at: null })}
                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                📢 Đã đăng {new Date(task.published_at).toLocaleDateString("vi-VN")} · bỏ đánh dấu
              </button>
            ) : (
              <button
                onClick={() => updateTask(task.id, { published_at: new Date().toISOString() })}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-emerald-400 transition-colors"
              >
                📢 Đánh dấu đã đăng
              </button>
            )
          )}

          {/* Chuyển sang khâu sau: tạo task design/editor nối chuỗi */}
          {canEdit && (
            <button
              onClick={() => setShowNextTask(true)}
              className="w-full rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              ➕ Tạo việc khâu sau (design / dựng)
            </button>
          )}
        </div>{/* ===== end CỘT TRÁI ===== */}

        {/* ===== CỘT PHẢI: brief · nội dung · trao đổi ===== */}
        <div className="mt-6 space-y-5 lg:mt-0">

        {/* Đầu vào từ khâu trước (nếu task này nối chuỗi) */}
        <UpstreamContentPanel task={task} />

        {/* Brief có cấu trúc (M2) — thu gọn được */}
        <div className="card p-4">
          <button
            onClick={() => setBriefOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Brief công việc</span>
            <span className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-faint)]">
              {!briefOpen && (
                <span className="truncate text-[var(--text-muted)]">
                  {task.brief_data?.objective || task.brief_data?.key_message || "Chưa có brief — bấm để thêm"}
                </span>
              )}
              <span className="shrink-0">{briefOpen ? "▲" : "▼"}</span>
            </span>
          </button>

          {briefOpen && (
          <div className="mt-3">
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
          )}
        </div>

        {/* Ghi chú / tài liệu tự do (thu gọn) */}
        <div className="card p-4">
          <button
            onClick={() => setNotesOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Ghi chú / tài liệu</span>
            <span className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-faint)]">
              {!notesOpen && (
                <span className="truncate text-[var(--text-muted)]">
                  {task.brief ? task.brief.split("\n")[0] : "Chưa có ghi chú"}
                </span>
              )}
              <span className="shrink-0">{notesOpen ? "▲" : "▼"}</span>
            </span>
          </button>
          {notesOpen && (
          <div className="mt-3">
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
          )}
        </div>

        {/* Nội dung — editor chính (Bước 3) */}
        <ContentEditor task={task} />

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
        </div>{/* ===== end CỘT PHẢI ===== */}
      </div>{/* ===== end bố cục 2 cột ===== */}

      {showNextTask && (
        <QuickAddTask
          onClose={() => setShowNextTask(false)}
          defaultClientId={task.client_id ?? undefined}
          defaultDependsOn={task.id}
          defaultKind="design"
          defaultTitle={`Thiết kế: ${task.title}`}
        />
      )}

      {/* Meta footer */}
      <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-faint)]">
        <span>Tạo: {task.created_at ? new Date(task.created_at).toLocaleDateString("vi-VN") : "—"}</span>
        <Link href="/cong-viec" className="hover:text-[var(--accent)] transition-colors">
          ← Quay lại bảng
        </Link>
      </div>
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
