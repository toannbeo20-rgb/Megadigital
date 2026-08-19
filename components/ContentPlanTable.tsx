"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const STATUS_ORDER: Record<string, number> = { ke_hoach: 0, dang_lam: 1, cho_duyet: 2, da_duyet: 3, da_dang: 4 };
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

type ColKey = "index" | "status" | "publish_date" | "channel" | "format" | "funnel" | "title" | "assignee" | "open";
const COLS: { key: ColKey; label: string; w: number; sortable: boolean }[] = [
  { key: "index", label: "#", w: 44, sortable: false },
  { key: "status", label: "Trạng thái", w: 130, sortable: true },
  { key: "publish_date", label: "Ngày đăng", w: 130, sortable: true },
  { key: "channel", label: "Kênh", w: 120, sortable: true },
  { key: "format", label: "Format", w: 120, sortable: true },
  { key: "funnel", label: "Phễu", w: 90, sortable: true },
  { key: "title", label: "Nội dung / Mô tả", w: 300, sortable: true },
  { key: "assignee", label: "Phụ trách", w: 150, sortable: false },
  { key: "open", label: "", w: 44, sortable: false },
];
function sortVal(t: Task, key: ColKey): string | number {
  switch (key) {
    case "status": return STATUS_ORDER[statusValueOf(t)] ?? 0;
    case "publish_date": return t.publish_date || t.deadline || "";
    case "channel": return t.channel || "";
    case "format": return t.format || "";
    case "funnel": return t.funnel || "";
    case "title": return (t.title || "").toLowerCase();
    default: return "";
  }
}

const CELL = "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-[var(--text)] outline-none hover:border-[var(--border)] focus:border-[var(--accent)] focus:bg-[var(--surface-2)]";

export default function ContentPlanTable({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, users, currentUser, updateTask, addTask } = useStore();
  const isManager = currentUser.permission === "manager";

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<ColKey>("publish_date");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [widths, setWidths] = useState<Record<ColKey, number>>(() =>
    Object.fromEntries(COLS.map((c) => [c.key, c.w])) as Record<ColKey, number>
  );

  const rows = useMemo(() => {
    let list = tasks.filter((t) => t.client_id === clientId);
    if (statusFilter) list = list.filter((t) => statusValueOf(t) === statusFilter);
    list = [...list].sort((a, b) => {
      const va = sortVal(a, sortKey);
      const vb = sortVal(b, sortKey);
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
    return list;
  }, [tasks, clientId, statusFilter, sortKey, sortDir]);

  function toggleSort(key: ColKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
  }

  // Kéo cột (resize width)
  const resizing = useRef<{ key: ColKey; startX: number; startW: number } | null>(null);
  function startResize(e: React.MouseEvent, key: ColKey) {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { key, startX: e.clientX, startW: widths[key] };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = ev.clientX - resizing.current.startX;
      const w = Math.max(56, resizing.current.startW + delta);
      setWidths((prev) => ({ ...prev, [resizing.current!.key]: w }));
    };
    const onUp = () => {
      resizing.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function addRow() {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    await addTask({ title, assignee_id: currentUser.id, client_id: clientId, deadline: new Date().toISOString().slice(0, 10), kind: "content" });
    setNewTitle("");
    setAdding(false);
  }

  const totalW = COLS.reduce((s, c) => s + widths[c.key], 0);

  return (
    <div>
      {/* Thanh lọc */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-faint)]">Lọc trạng thái:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
        >
          <option value="">Tất cả</option>
          {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
        <span className="ml-auto text-xs text-[var(--text-faint)]">{rows.length} bài · bấm tiêu đề để sắp xếp · kéo mép cột để chỉnh rộng</span>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
        <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: totalW }}>
          <colgroup>
            {COLS.map((c) => (<col key={c.key} style={{ width: widths[c.key] }} />))}
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] uppercase tracking-wider text-[var(--text-faint)]">
              {COLS.map((c) => (
                <th key={c.key} className="relative select-none px-2 py-2.5 text-left font-bold">
                  <span
                    className={cn("flex items-center gap-1", c.sortable && "cursor-pointer hover:text-[var(--text)]")}
                    onClick={() => c.sortable && toggleSort(c.key)}
                  >
                    {c.label}
                    {c.sortable && sortKey === c.key && <span className="text-[var(--accent)]">{sortDir === 1 ? "▲" : "▼"}</span>}
                  </span>
                  {/* Tay kéo mép cột */}
                  {c.key !== "open" && (
                    <span
                      onMouseDown={(e) => startResize(e, c.key)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[var(--accent)]/40"
                    />
                  )}
                </th>
              ))}
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

            {/* Dòng thêm bài mới */}
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
                <button onClick={addRow} disabled={!newTitle.trim() || adding} className="btn-accent w-full rounded-md px-2 py-1.5 text-sm font-bold disabled:opacity-40">
                  {adding ? "…" : "Thêm"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanRow({
  task, index, users, canEdit, isManager, onUpdate, onOpen,
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
      <td className="px-1 py-1">
        <select value={statusValueOf(task)} disabled={!canEdit} onChange={(e) => set(statusPatch(e.target.value))}
          className={cn("w-full rounded-md border px-1.5 py-1 text-xs font-semibold outline-none focus:border-[var(--accent)]", ps.className, !canEdit && "opacity-60")}>
          {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
      </td>
      <td className="px-1 py-1">
        <input type="date" value={task.publish_date ?? ""} disabled={!canEdit} onChange={(e) => set({ publish_date: e.target.value || null })} className={CELL} />
      </td>
      <td className="px-1 py-1">
        <select value={task.channel ?? ""} disabled={!canEdit} onChange={(e) => set({ channel: e.target.value || null })} className={CELL}>
          <option value="">—</option>
          {CHANNELS.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </td>
      <td className="px-1 py-1">
        <select value={task.format ?? ""} disabled={!canEdit} onChange={(e) => set({ format: e.target.value || null })} className={CELL}>
          <option value="">—</option>
          {TASK_FORMATS.map((f) => (<option key={f} value={f}>{f}</option>))}
        </select>
      </td>
      <td className="px-1 py-1">
        <select value={task.funnel ?? ""} disabled={!canEdit} onChange={(e) => set({ funnel: e.target.value || null })} className={CELL}>
          <option value="">—</option>
          {(Object.keys(FUNNEL_META) as Funnel[]).map((f) => (<option key={f} value={f}>{FUNNEL_META[f].label}</option>))}
        </select>
      </td>
      <td className="px-1 py-1">
        <input value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title !== task.title) set({ title: title.trim() }); }}
          className={cn(CELL, "font-medium")} />
      </td>
      <td className="px-1 py-1">
        <select value={task.assignee_id} disabled={!isManager} onChange={(e) => set({ assignee_id: e.target.value })} className={CELL}>
          {users.map((u) => (<option key={u.id} value={u.id}>{u.name.replace(/\(.*?\)/g, "").trim()}</option>))}
        </select>
      </td>
      <td className="px-1 py-1 text-center">
        <button onClick={onOpen} title="Mở bài" className="rounded-md px-2 py-1 text-[var(--accent)] hover:bg-[var(--accent-soft)]">→</button>
      </td>
    </tr>
  );
}
