"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/ui";
import { TaskCard } from "@/components/TaskCard";
import { isOverdue, isDueSoon, daysUntil } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "overdue" | "soon" | "approval";

export default function TodayPage() {
  const { tasks, currentUser } = useStore();
  const [filter, setFilter] = useState<FilterMode>("all");

  // Nhóm Thực thi giờ có thể nhìn chéo tiến độ của nhau (mục 2, kế hoạch)
  // nên ta lấy toàn bộ tasks (hoặc có thể filter theo dự án đang tham gia sau này)
  const scoped = useMemo(() => tasks, [tasks]);

  const overdue = scoped.filter(isOverdue);
  const dueSoon = scoped.filter(isDueSoon);
  const waitingApproval = scoped.filter(
    (t) => t.approval_status && !["khach_ok"].includes(t.approval_status)
  );

  // Danh sách hiển thị theo filter
  const todo = useMemo(() => {
    let list: Task[];
    switch (filter) {
      case "overdue":
        list = overdue;
        break;
      case "soon":
        list = dueSoon;
        break;
      case "approval":
        list = waitingApproval;
        break;
      default:
        list = scoped
          .filter((t) => t.status !== "xong")
          .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
    }
    return list;
  }, [filter, scoped, overdue, dueSoon, waitingApproval]);

  const firstName = currentUser.name.replace(/\(.*?\)/g, "").trim().split(" ")[0];

  const filterLabel: Record<FilterMode, string> = {
    all: "Cần xử lý hôm nay",
    overdue: "Task quá hạn",
    soon: "Sắp tới hạn",
    approval: "Chờ bạn duyệt",
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="animate-in">
      {/* Greeting */}
      <div className="mb-7">
        <p className="mb-0.5 text-sm font-medium text-[var(--text-faint)]">
          {now.toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text)] md:text-4xl">
          {greeting},{" "}
          <span className="text-gradient">{firstName}</span> 👋
        </h1>
        <div
          className="mt-3 h-0.5 w-10 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }}
        />
      </div>

      {/* 3 ô nhiệt kế — click để filter */}
      <div className="mb-8 grid grid-cols-3 gap-3 md:gap-4">
        <Thermo
          label="Quá hạn"
          icon="🔴"
          value={overdue.length}
          tone="danger"
          active={filter === "overdue"}
          onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}
        />
        <Thermo
          label="Sắp hết hạn"
          icon="⏳"
          value={dueSoon.length}
          tone="warn"
          active={filter === "soon"}
          onClick={() => setFilter(filter === "soon" ? "all" : "soon")}
        />
        <Thermo
          label="Chờ duyệt"
          icon="👁"
          value={waitingApproval.length}
          tone="accent"
          active={filter === "approval"}
          onClick={() => setFilter(filter === "approval" ? "all" : "approval")}
        />
      </div>

      {/* Label danh sách */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {filterLabel[filter]}
          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-faint)]">
            {todo.length}
          </span>
        </h2>
        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Xem tất cả
          </button>
        )}
      </div>

      {/* Task list */}
      {todo.length === 0 ? (
        <EmptyState
          iconKey="tasks"
          title={
            filter === "all"
              ? "Tuyệt vời, không có việc tồn 🎉"
              : "Không có task nào trong nhóm này"
          }
          hint={
            filter === "all"
              ? "Mọi task đều đã xong hoặc chưa tới hạn."
              : "Thử xem tất cả task bên trên."
          }
        />
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2">
          {todo.map((t) => (
            <div key={t.id} className="animate-in">
              <TaskCard task={t} />
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {filter === "all" && todo.length > 0 && (
        <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
          {scoped.filter((t) => t.status === "xong").length} task đã xong ·{" "}
          {todo.length} đang mở
        </p>
      )}
    </div>
  );
}

function Thermo({
  label,
  icon,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  value: number;
  tone: "danger" | "warn" | "accent";
  active: boolean;
  onClick: () => void;
}) {
  const styles = {
    danger: {
      bg: "bg-red-500/10",
      text: "text-[var(--danger)]",
      ring: active
        ? "ring-2 ring-[var(--danger)]/60"
        : "ring-1 ring-red-500/15",
      dot: "bg-[var(--danger)]",
      glow: "rgba(255,77,77,0.35)",
    },
    warn: {
      bg: "bg-amber-500/10",
      text: "text-[var(--warn)]",
      ring: active
        ? "ring-2 ring-[var(--warn)]/60"
        : "ring-1 ring-amber-500/15",
      dot: "bg-[var(--warn)]",
      glow: "rgba(255,179,64,0.35)",
    },
    accent: {
      bg: "bg-[var(--accent-soft)]",
      text: "text-[var(--accent)]",
      ring: active
        ? "ring-2 ring-[var(--accent)]/60"
        : "ring-1 ring-transparent",
      dot: "bg-[var(--accent)]",
      glow: "rgba(170,237,42,0.35)",
    },
  }[tone];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-[var(--radius)] p-4 text-left transition-all duration-200 md:p-5",
        styles.bg,
        styles.ring,
        active && "scale-[0.97]",
        "hover:scale-[0.98] active:scale-95"
      )}
      style={active ? { boxShadow: `0 0 20px ${styles.glow}` } : undefined}
    >
      {/* Active indicator dot */}
      {active && (
        <span
          className={cn("absolute right-3 top-3 h-2 w-2 rounded-full", styles.dot)}
          style={{ boxShadow: `0 0 8px currentColor` }}
        />
      )}

      {/* Icon */}
      <span className="mb-2 text-2xl leading-none select-none">{icon}</span>

      {/* Count */}
      <div className={cn("text-4xl font-black tabular-nums md:text-5xl", styles.text)}>
        {value}
      </div>

      {/* Label */}
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </div>
    </button>
  );
}
