"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { PRESENCE_META, type User } from "@/lib/types";
import { PageHeader, Avatar, Badge } from "@/components/ui";
import PresenceEditor from "@/components/PresenceEditor";
import AddUserModal from "@/components/AddUserModal";
import ManageUserModal from "@/components/ManageUserModal";
import { useState } from "react";
import { workloadOf, loadLevel, timeAgo, cn } from "@/lib/utils";

const LOAD_BAR_COLOR: Record<"ok" | "warn" | "danger", string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export default function PeoplePage() {
  const { users, tasks, currentUser } = useStore();
  const isManager = currentUser.permission === "manager";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manageUser, setManageUser] = useState<User | null>(null);

  return (
    <div className="animate-in">
      <PageHeader
        title="Nhân sự"
        subtitle={
          isManager
            ? "Tải công việc & trạng thái của cả team."
            : "Tải công việc của bạn & trạng thái đồng đội."
        }
        action={
          isManager ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white shadow-[0_0_12px_rgba(170,237,42,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              + Thêm nhân sự
            </button>
          ) : undefined
        }
      />
      
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {manageUser && (
        <ManageUserModal
          user={manageUser}
          isSelf={manageUser.id === currentUser.id}
          onClose={() => setManageUser(null)}
        />
      )}

      <div className="mb-6">
        <PresenceEditor />
      </div>

      <div className="stagger grid gap-3 md:grid-cols-2">
        {users.map((u) => {
          const load = workloadOf(tasks, u.id);
          const lvl = loadLevel(load.openCount);
          const meta = PRESENCE_META[u.presence];
          // KPI: staff chỉ thấy KPI của mình (mục 3.2)
          const showKpi = isManager || u.id === currentUser.id;
          const isSelf = u.id === currentUser.id;

          const lvlTone = {
            ok: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
            warn: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
            danger: "bg-red-500/15 text-red-400 border border-red-500/20",
          }[lvl.tone];

          // Progress bar width: max tải ~ 8 task mở (heuristic)
          const barPct = Math.min((load.openCount / 8) * 100, 100);

          return (
            <div
              key={u.id}
              className={cn(
                "card animate-in p-4 transition-all duration-200",
                isSelf && "card-glow"
              )}
            >
              {/* Top row */}
              <div className="flex items-start gap-3">
                <Avatar user={u} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {u.name.replace(/\(.*?\)/g, "").trim()}
                    </span>
                    {isSelf && (
                      <Badge className="bg-[var(--accent-soft)] text-[var(--accent)] border border-[rgba(170,237,42,0.2)]">
                        Bạn
                      </Badge>
                    )}
                  </div>

                  {/* Presence */}
                  <div
                    className={cn(
                      "mt-0.5 flex items-center gap-1.5 text-xs font-medium",
                      meta.color
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    {meta.label}
                    {u.presence === "offline" && (
                      <span className="text-[var(--text-faint)]">
                        · {timeAgo(u.last_active_at)}
                      </span>
                    )}
                  </div>

                  {u.status_note && (
                    <p className="mt-1 text-sm text-[var(--text-muted)] italic">
                      &quot;{u.status_note}&quot;
                    </p>
                  )}

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-faint)]"
                      >
                        #{r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Load badge + nút quản lý (manager) */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge className={lvlTone}>{lvl.label}</Badge>
                  {isManager && (
                    <button
                      onClick={() => setManageUser(u)}
                      className="rounded-lg border border-[var(--border)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-faint)] hover:border-[var(--border-bright)] hover:text-[var(--text)] transition-colors"
                    >
                      ⚙ Quản lý
                    </button>
                  )}
                </div>
              </div>

              {/* Workload bar */}
              {showKpi && load.openCount > 0 && (
                <div className="mt-3">
                  <div className="h-1 w-full rounded-full bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: LOAD_BAR_COLOR[lvl.tone],
                        boxShadow: `0 0 6px ${LOAD_BAR_COLOR[lvl.tone]}60`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* KPI stats */}
              {showKpi && (
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
                  <Stat label="Task mở" value={load.openCount} />
                  <Stat label="Ưu tiên cao" value={load.highPriority} />
                  <Stat label="Khách đang gánh" value={load.clientCount} />
                </div>
              )}

              {/* Xem lịch làm việc của người này */}
              <Link
                href={`/lich?user=${u.id}`}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                📅 Xem lịch làm việc
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xl font-black text-[var(--text)]">{value}</div>
      <div className="text-[11px] text-[var(--text-faint)]">{label}</div>
    </div>
  );
}
