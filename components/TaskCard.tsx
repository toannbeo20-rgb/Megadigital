"use client";

import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { KIND_META } from "@/lib/types";
import { useStore } from "@/lib/store";
import { deadlineLabel, cn } from "@/lib/utils";
import { Avatar, Badge } from "./ui";
import { IconLink } from "./icons";

export function TaskCard({
  task,
  draggable = false,
  onDragStart,
  compact = false,
}: {
  task: Task;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const { users, jobs, clients } = useStore();
  const assignee = users.find((u) => u.id === task.assignee_id);
  const client = clients.find((c) => c.id === task.client_id) 
    || clients.find((c) => c.id === jobs.find((j) => j.id === task.job_id)?.client_id);
  const dlRaw = deadlineLabel(task.deadline);
  // Task đã xong: không hiện "Quá hạn X ngày" — tránh gây hiểu nhầm
  const dl =
    task.status === "xong"
      ? { text: "Đã xong", tone: "muted" as const }
      : dlRaw;
  const kind = task.kind ? KIND_META[task.kind] : null;

  const toneClass = {
    danger: "text-[var(--danger)]",
    warn: "text-[var(--warn)]",
    muted: "text-[var(--text-faint)]",
  }[dl.tone];

  const accentLeft =
    dl.tone === "danger"
      ? "var(--danger)"
      : dl.tone === "warn"
      ? "var(--warn)"
      : task.status === "xong"
      ? "var(--ok)"
      : "var(--border)";

  // Track if we're dragging to distinguish click vs drag
  let isDragging = false;

  function handleDragStart(e: React.DragEvent) {
    isDragging = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    onDragStart?.(e);
  }

  function handleClick(e: React.MouseEvent) {
    // Don't navigate if we just finished dragging
    if (isDragging) {
      isDragging = false;
      return;
    }
    e.preventDefault();
    router.push(`/cong-viec/${task.id}`);
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={() => { isDragging = false; }}
      onClick={handleClick}
      className={cn(
        "card group p-3.5 transition-all hover:shadow-[var(--shadow-md)] hover:border-[var(--border-bright)]",
        draggable && "cursor-grab select-none active:cursor-grabbing",
        !draggable && "cursor-pointer"
      )}
      style={{ borderLeft: `3px solid ${accentLeft}` }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium leading-snug text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
          {task.title}
        </p>
        {task.status === "xong" && (
          <span className="shrink-0 text-[var(--ok)]" title="Xong">✓</span>
        )}
      </div>

      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {client && (
          <Badge className="bg-[var(--surface-2)] text-[var(--text-muted)]">{client.name}</Badge>
        )}
        {kind && <Badge className={kind.color}>{kind.label}</Badge>}
        {task.format && (
          <Badge className="bg-[var(--surface-3)] text-[var(--text-muted)]">{task.format}</Badge>
        )}
        {task.depends_on_task_id && (
          <Badge className="bg-[rgba(255,179,64,0.15)] text-[var(--warn)] border border-[rgba(255,179,64,0.25)]">
            <IconLink /> Chờ handoff
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {assignee && <Avatar user={assignee} size={compact ? 24 : 28} />}
          {!compact && assignee && (
            <span className="text-xs text-[var(--text-muted)]">
              {assignee.name.replace(/\(.*?\)/g, "").trim()}
            </span>
          )}
        </div>
        <span className={cn("text-xs font-medium", toneClass)}>{dl.text}</span>
      </div>
    </div>
  );
}
