"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { FUNNEL_META, planStatus, type Funnel, type Task } from "@/lib/types";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const x = new Date(d + "T00:00:00");
  return `${x.getDate()}/${x.getMonth() + 1}`;
}

// Bảng kế hoạch nội dung theo khách (giống content calendar sheet).
export default function ContentPlanTable({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, users } = useStore();

  const rows = tasks
    .filter((t) => t.client_id === clientId)
    .sort((a, b) => {
      const da = a.publish_date || a.deadline || "";
      const db = b.publish_date || b.deadline || "";
      return da.localeCompare(db);
    });

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] py-10 text-center">
        <p className="text-2xl opacity-40">🗓️</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Chưa có bài nội dung nào.</p>
        <p className="text-xs text-[var(--text-faint)]">Tạo task cho khách này để lên kế hoạch nội dung.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[11px] uppercase tracking-wider text-[var(--text-faint)]">
            <th className="px-3 py-2.5 text-left font-bold">#</th>
            <th className="px-3 py-2.5 text-left font-bold">Trạng thái</th>
            <th className="px-3 py-2.5 text-left font-bold">Ngày đăng</th>
            <th className="px-3 py-2.5 text-left font-bold">Kênh</th>
            <th className="px-3 py-2.5 text-left font-bold">Format</th>
            <th className="px-3 py-2.5 text-left font-bold">Phễu</th>
            <th className="px-3 py-2.5 text-left font-bold">Nội dung / Mô tả</th>
            <th className="px-3 py-2.5 text-left font-bold">Phụ trách</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t: Task, i) => {
            const ps = planStatus(t);
            const assignee = users.find((u) => u.id === t.assignee_id);
            const fm = t.funnel ? FUNNEL_META[t.funnel as Funnel] : null;
            return (
              <tr
                key={t.id}
                onClick={() => router.push(`/cong-viec/${t.id}`)}
                className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-2)]"
              >
                <td className="px-3 py-2.5 text-[var(--text-faint)]">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <span className={cn("whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", ps.className)}>{ps.label}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-muted)]">{fmtDate(t.publish_date)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-muted)]">{t.channel || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-muted)]">{t.format || "—"}</td>
                <td className="px-3 py-2.5">
                  {fm ? (
                    <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", fm.className)}>{fm.label}</span>
                  ) : (
                    <span className="text-[var(--text-faint)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="line-clamp-1 max-w-[280px] font-medium text-[var(--text)]">{t.title}</span>
                </td>
                <td className="px-3 py-2.5">
                  {assignee && (
                    <span className="flex items-center gap-1.5">
                      <Avatar user={assignee} size={22} />
                      <span className="hidden whitespace-nowrap text-xs text-[var(--text-muted)] sm:inline">
                        {assignee.name.replace(/\(.*?\)/g, "").trim()}
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
