"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  CHANNELS,
  FUNNEL_META,
  TASK_FORMATS,
  planStatus,
  type Funnel,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// --- Trạng thái xuất bản (gộp task.status + published_at) ---
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ke_hoach", label: "Kế hoạch" },
  { value: "dang_lam", label: "Đang làm" },
  { value: "cho_duyet", label: "Chờ duyệt" },
  { value: "da_duyet", label: "Đã duyệt" },
  { value: "da_dang", label: "Đã đăng" },
];
function statusValueOf(t: Task): string {
  if (t.published_at) return "da_dang";
  return ({ ton: "ke_hoach", dang_lam: "dang_lam", cho_duyet: "cho_duyet", xong: "da_duyet" } as Record<TaskStatus, string>)[t.status] ?? "ke_hoach";
}
function statusPatch(v: string): Partial<Task> {
  switch (v) {
    case "ke_hoach": return { status: "ton", published_at: null };
    case "dang_lam": return { status: "dang_lam", published_at: null };
    case "cho_duyet": return { status: "cho_duyet", published_at: null };
    case "da_duyet": return { status: "xong", published_at: null };
    case "da_dang": return { status: "xong", published_at: new Date().toISOString() };
    default: return {};
  }
}

const CELL = "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-[var(--text)] outline-none hover:border-[var(--border)] focus:border-[var(--accent)] focus:bg-[var(--surface-2)]";

export default function ContentPlanTable({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, users, currentUser, updateTask, addTask } = useStore();
  const isManager = currentUser.permission === "manager";
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const rows = tasks
    .filter((t) => t.client_id === clientId)
    .sort((a, b) => (a.publish_date || a.deadline || "").localeCompare(b.publish_date || b.deadline || ""));

  async function addRow() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    await addTask({
      title,
      assignee_id: currentUser.id,
      client_id: clientId,
      deadline: new Date().toISOString().slice(0, 10),
      kind: "content",
    });
    setNewTitle("");
    setAdding(false);
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] uppercase tracking-wider text-[var(--text-faint)]">
            <th className="w-10 px-2 py-2.5 text-left font-bold">#</th>
            <th className="w-[130px] px-2 py-2.5 text-left font-bold">Trạng thái</th>
            <th className="w-[130px] px-2 py-2.5 text-left font-bold">Ngày đăng</th>
            <th className="w-[120px] px-2 py-2.5 text-left font-bold">Kênh</th>
            <th className="w-[120px] px-2 py-2.5 text-left font-bold">Format</th>
            <th className="w-[90px] px-2 py-2.5 text-left font-bold">Phễu</th>
            <th className="px-2 py-2.5 text-left font-bold">Nội dung / Mô tả</th>
            <th className="w-[140px] px-2 py-2.5 text-left font-bold">Phụ trách</th>
            <th className="w-10 px-2 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <PlanRow
              key={t.id}
              task={t}
              index={i + 1}
              users={users}
              canEdit={isManager || t.assignee_id === currentUser.id}
              isManager={isManager}
              onUpdate={updateTask}
              onOpen={() => router.push(`/cong-viec/${t.id}`)}
            />
          ))}

          {/* Dòng thêm bài mới (inline) */}
          <tr className="bg-[var(--surface-2)]/40">
            <td className="px-2 py-2 text-[var(--text-faint)]">＋</td>
            <td colSpan={6} className="px-2 py-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addRow(); }}
                placeholder="Nhập tên bài rồi Enter để thêm dòng…"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </td>
            <td colSpan={2} className="px-2 py-2">
              <button
                onClick={addRow}
                disabled={!newTitle.trim() || adding}
                className="btn-accent w-full rounded-md px-2 py-1.5 text-sm font-bold disabled:opacity-40"
              >
                {adding ? "…" : "Thêm"}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PlanRow({
  task,
  index,
  users,
  canEdit,
  isManager,
  onUpdate,
  onOpen,
}: {
  task: Task;
  index: number;
  users: ReturnType<typeof useStore>["users"];
  canEdit: boolean;
  isManager: boolean;
  onUpdate: ReturnType<typeof useStore>["updateTask"];
  onOpen: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  useEffect(() => setTitle(task.title), [task.title]);
  const ps = planStatus(task);

  const set = (patch: Partial<Task>) => onUpdate(task.id, patch);

  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/40">
      <td className="px-2 py-1 text-[var(--text-faint)]">{index}</td>

      {/* Trạng thái */}
      <td className="px-1 py-1">
        <select
          value={statusValueOf(task)}
          disabled={!canEdit}
          onChange={(e) => set(statusPatch(e.target.value))}
          className={cn("w-full rounded-md border px-1.5 py-1 text-xs font-semibold outline-none focus:border-[var(--accent)]", ps.className, !canEdit && "opacity-60")}
        >
          {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
      </td>

      {/* Ngày đăng */}
      <td className="px-1 py-1">
        <input
          type="date"
          value={task.publish_date ?? ""}
          disabled={!canEdit}
          onChange={(e) => set({ publish_date: e.target.value || null })}
          className={CELL}
        />
      </td>

      {/* Kênh */}
      <td className="px-1 py-1">
        <select value={task.channel ?? ""} disabled={!canEdit} onChange={(e) => set({ channel: e.target.value || null })} className={CELL}>
          <option value="">—</option>
          {CHANNELS.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </td>

      {/* Format */}
      <td className="px-1 py-1">
        <select value={task.format ?? ""} disabled={!canEdit} onChange={(e) => set({ format: e.target.value || null })} className={CELL}>
          <option value="">—</option>
          {TASK_FORMATS.map((f) => (<option key={f} value={f}>{f}</option>))}
        </select>
      </td>

      {/* Phễu */}
      <td className="px-1 py-1">
        <select value={task.funnel ?? ""} disabled={!canEdit} onChange={(e) => set({ funnel: e.target.value || null })} className={CELL}>
          <option value="">—</option>
          {(Object.keys(FUNNEL_META) as Funnel[]).map((f) => (<option key={f} value={f}>{FUNNEL_META[f].label}</option>))}
        </select>
      </td>

      {/* Tên / mô tả */}
      <td className="px-1 py-1">
        <input
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title !== task.title) set({ title: title.trim() }); }}
          className={cn(CELL, "font-medium")}
        />
      </td>

      {/* Phụ trách */}
      <td className="px-1 py-1">
        <select value={task.assignee_id} disabled={!isManager} onChange={(e) => set({ assignee_id: e.target.value })} className={CELL}>
          {users.map((u) => (<option key={u.id} value={u.id}>{u.name.replace(/\(.*?\)/g, "").trim()}</option>))}
        </select>
      </td>

      {/* Mở bài (nội dung đã viết) */}
      <td className="px-1 py-1 text-center">
        <button onClick={onOpen} title="Mở bài" className="rounded-md px-2 py-1 text-[var(--accent)] hover:bg-[var(--accent-soft)]">→</button>
      </td>
    </tr>
  );
}
