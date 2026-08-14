"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";
import { TASK_STATUS_META } from "@/lib/types";
import { PageHeader, EmptyState } from "@/components/ui";
import { TaskCard } from "@/components/TaskCard";
import DeleteAllTasksButton from "@/components/DeleteAllTasksButton";
import { cn } from "@/lib/utils";

const COLUMNS: TaskStatus[] = ["ton", "dang_lam", "cho_duyet", "xong"];

const COL_STYLE: Record<
  TaskStatus,
  { dot: string; headerBg: string; emptyIcon: string }
> = {
  ton: {
    dot: "bg-slate-400",
    headerBg:
      "linear-gradient(135deg, rgba(148,163,184,0.08) 0%, transparent 100%)",
    emptyIcon: "📋",
  },
  dang_lam: {
    dot: "bg-[var(--accent)]",
    headerBg:
      "linear-gradient(135deg, rgba(170,237,42,0.1) 0%, transparent 100%)",
    emptyIcon: "⚡",
  },
  cho_duyet: {
    dot: "bg-amber-400",
    headerBg:
      "linear-gradient(135deg, rgba(251,191,36,0.1) 0%, transparent 100%)",
    emptyIcon: "👀",
  },
  xong: {
    dot: "bg-[var(--ok)]",
    headerBg:
      "linear-gradient(135deg, rgba(48,212,108,0.08) 0%, transparent 100%)",
    emptyIcon: "✅",
  },
};

export default function BoardPage() {
  const { tasks, jobs, clients, currentUser, moveTask } = useStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("");

  const scoped = useMemo(() => {
    // Nhóm Thực thi giờ có thể nhìn chéo tiến độ của nhau (mục 2, kế hoạch)
    let list = tasks;
    if (clientFilter) {
      list = list.filter((t) => t.client_id === clientFilter);
    }
    return list;
  }, [tasks, jobs, currentUser, clientFilter]);

  const byCol = (s: TaskStatus) => scoped.filter((t) => t.status === s);

  function onDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const id = dragId || e.dataTransfer.getData("text/plain");
    if (id) moveTask(id, status);
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="animate-in">
      <PageHeader
        title="Công việc"
        subtitle="Kéo thả task giữa các cột. Cập nhật realtime cho cả team."
        action={
          <div className="flex items-center gap-2">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Tất cả khách</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {currentUser.permission === "manager" && <DeleteAllTasksButton />}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = byCol(col);
          const style = COL_STYLE[col];
          const isOver = overCol === col && dragId;

          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col);
              }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={(e) => onDrop(e, col)}
              className={cn(
                "flex flex-col rounded-[var(--radius)] bg-[var(--surface-2)] p-3 transition-all duration-200",
                isOver && "drop-active scale-[1.01]"
              )}
            >
              {/* Column header */}
              <div
                className="mb-3 flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ background: style.headerBg }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("h-2.5 w-2.5 rounded-full", style.dot)}
                    style={
                      col === "dang_lam"
                        ? { boxShadow: "0 0 6px var(--accent)" }
                        : col === "xong"
                        ? { boxShadow: "0 0 6px var(--ok)" }
                        : undefined
                    }
                  />
                  <span className="text-sm font-bold tracking-wide">
                    {TASK_STATUS_META[col].label}
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    col === "dang_lam"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--surface)] text-[var(--text-muted)]"
                  )}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex min-h-24 flex-col gap-2.5">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-10 text-center">
                    <span className="mb-1.5 text-2xl select-none opacity-40">
                      {style.emptyIcon}
                    </span>
                    <p className="text-xs text-[var(--text-faint)]">
                      {dragId ? "Thả task vào đây" : "Chưa có task"}
                    </p>
                  </div>
                ) : (
                  <div className="stagger flex flex-col gap-2.5">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className={cn("animate-in", dragId === t.id && "drag-ghost")}
                      >
                        <TaskCard
                          task={t}
                          draggable
                          onDragStart={() => setDragId(t.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
