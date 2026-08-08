"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { JOB_STATUS_META } from "@/lib/types";
import { PageHeader, Avatar, Badge } from "@/components/ui";
import { TaskCard } from "@/components/TaskCard";
import { IconChevron } from "@/components/icons";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const { clients, jobs, tasks, users, currentUser, addClient } = useStore();
  const [openClient, setOpenClient] = useState<string | null>(clients[0]?.id ?? null);
  const [openJob, setOpenJob] = useState<string | null>(null);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientNote, setNewClientNote] = useState("");
  const [newClientAccountId, setNewClientAccountId] = useState("");
  const [newClientContactPerson, setNewClientContactPerson] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientIndustry, setNewClientIndustry] = useState("");
  const [newClientTier, setNewClientTier] = useState("");
  const [newClientStatus, setNewClientStatus] = useState("active");

  const isManager = currentUser.permission === "manager";

  function submitNewClient() {
    if (!newClientName.trim()) return;
    addClient({
      name: newClientName.trim(),
      note: newClientNote.trim() || undefined,
      account_id: newClientAccountId || undefined,
      contact_person: newClientContactPerson.trim() || undefined,
      phone: newClientPhone.trim() || undefined,
      email: newClientEmail.trim() || undefined,
      industry: newClientIndustry.trim() || undefined,
      tier: newClientTier.trim() || undefined,
      status: newClientStatus
    });
    setNewClientName("");
    setNewClientNote("");
    setNewClientAccountId("");
    setNewClientContactPerson("");
    setNewClientPhone("");
    setNewClientEmail("");
    setNewClientIndustry("");
    setNewClientTier("");
    setNewClientStatus("active");
    setShowNewClient(false);
  }

  const visibleTasks = currentUser.permission === "manager"
    ? tasks
    : tasks.filter((t) => t.assignee_id === currentUser.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Khách" subtitle="Khách → Dự án → Task. Nhấn để mở rộng." />
        {isManager && (
          <button
            onClick={() => setShowNewClient(!showNewClient)}
            className={cn(
              "btn-accent rounded-xl px-4 py-2 text-sm font-semibold transition-all",
              showNewClient && "bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]"
            )}
          >
            {showNewClient ? "✕ Huỷ" : "+ Khách mới"}
          </button>
        )}
      </div>

      {showNewClient && (
        <div className="card mb-4 animate-slide-in p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
            Thêm Khách Hàng Mới
          </p>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              placeholder="Tên khách hàng (VD: Vingroup, SunGroup...)"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <textarea
              placeholder="Ghi chú thêm..."
              value={newClientNote}
              onChange={(e) => setNewClientNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                placeholder="Người liên hệ (VD: Anh A - Marketing Manager)"
                value={newClientContactPerson}
                onChange={(e) => setNewClientContactPerson(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                placeholder="Số điện thoại"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                placeholder="Email"
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <input
                placeholder="Lĩnh vực / Ngành nghề (VD: Bất động sản)"
                value={newClientIndustry}
                onChange={(e) => setNewClientIndustry(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={newClientTier}
                onChange={(e) => setNewClientTier(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">-- Phân hạng --</option>
                <option value="VIP">VIP</option>
                <option value="Tiêu chuẩn">Tiêu chuẩn</option>
                <option value="Tiềm năng">Tiềm năng</option>
              </select>
              <select
                value={newClientStatus}
                onChange={(e) => setNewClientStatus(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="active">Đang hợp tác</option>
                <option value="pitching">Đang tiếp cận</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
              <select
                value={newClientAccountId}
                onChange={(e) => setNewClientAccountId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              >
                <option value="">-- Account phụ trách --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => setShowNewClient(false)} className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-3)]">
                Huỷ
              </button>
              <button onClick={submitNewClient} disabled={!newClientName.trim()} className="btn-accent rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
                Thêm Khách
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {clients.map((client) => {
          const clientTasks = isManager 
            ? visibleTasks.filter((t) => t.client_id === client.id)
            : visibleTasks.filter((t) => t.client_id === client.id && t.assignee_id === currentUser.id);
          
          const account = users.find((u) => u.id === client.account_id);
          const open = openClient === client.id;
          const openTaskCount = clientTasks.filter((t) => t.status !== "xong").length;

          return (
            <div key={client.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenClient(open ? null : client.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-2)]"
              >
                <IconChevron className={cn("shrink-0 text-[var(--text-faint)] transition-transform", open && "rotate-90")} />
                <div className="flex-1">
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-xs text-[var(--text-faint)]">{client.note}</div>
                </div>
                {account && (
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <Avatar user={account} size={24} />
                    <span className="text-xs text-[var(--text-muted)]">{account.name.replace(/\(.*?\)/g, "").trim()}</span>
                  </div>
                )}
                <Badge className="bg-[var(--surface-2)] text-[var(--text-muted)]">{clientTasks.length} task ({openTaskCount} mở)</Badge>
                <Link
                  href={`/khach/${client.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                >
                  Chi tiết
                </Link>
              </button>

              {open && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3">
                  {clientTasks.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[var(--text-faint)]">Chưa có công việc.</p>
                  ) : (
                    <div className="grid gap-2.5 md:grid-cols-2">
                      {clientTasks.map((t) => (
                        <TaskCard key={t.id} task={t} compact />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: keyof typeof JOB_STATUS_META }) {
  const map: Record<string, string> = {
    pitch: "bg-slate-100 text-slate-600 dark:bg-slate-500/15",
    dang_chay: "bg-blue-50 text-blue-600 dark:bg-blue-500/15",
    cho_duyet: "bg-amber-50 text-amber-600 dark:bg-amber-500/15",
    done: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15",
  };
  return <Badge className={map[status]}>{JOB_STATUS_META[status].label}</Badge>;
}
