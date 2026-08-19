"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui";
import { TaskCard } from "@/components/TaskCard";
import QuickAddTask from "@/components/QuickAddTask";
import ContentPlanTable from "@/components/ContentPlanTable";
import { cn } from "@/lib/utils";

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const { clients, tasks, users, currentUser, deleteClient } = useStore();

  const client = clients.find((c) => c.id === clientId);
  const account = client?.account_id ? users.find((u) => u.id === client.account_id) : null;
  const isManager = currentUser.permission === "manager";

  const [showNewTask, setShowNewTask] = useState(false);
  const [view, setView] = useState<"plan" | "cards">("plan");

  if (!client) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-[var(--text-faint)]">Không tìm thấy khách hàng.</p>
        <Link href="/khach" className="text-sm font-medium text-[var(--accent)] hover:underline">
          ← Quay lại Khách
        </Link>
      </div>
    );
  }

  // Find tasks belonging to this client directly
  const clientTasks = isManager 
    ? tasks.filter((t) => t.client_id === clientId)
    : tasks.filter((t) => t.client_id === clientId && t.assignee_id === currentUser.id);

  const openTasks = clientTasks.filter((t) => t.status !== "xong");

  async function handleDeleteClient() {
    if (!confirm("Bạn có chắc muốn xoá khách hàng này và toàn bộ dữ liệu bên trong không?")) return;
    await deleteClient(clientId);
    router.push("/khach");
  }

  return (
    <div className="animate-in pb-12">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-faint)]">
        <Link href="/khach" className="hover:text-[var(--text)] transition-colors">Khách</Link>
        <span>/</span>
        <span className="text-[var(--text-muted)]">{client.name}</span>
      </div>

      {/* Client Header Card */}
      <div className="card mb-8 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row gap-6 justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {client.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {client.industry && (
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-faint)]">Lĩnh vực</span>
                  <span className="font-medium">{client.industry}</span>
                </div>
              )}
              {client.tier && (
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-faint)]">Phân hạng</span>
                  <span className="font-medium text-[var(--accent)]">{client.tier}</span>
                </div>
              )}
              {client.contact_person && (
                <div className="flex flex-col">
                  <span className="text-xs text-[var(--text-faint)]">Người liên hệ</span>
                  <span className="font-medium">{client.contact_person}</span>
                </div>
              )}
            </div>
            
            {(client.phone || client.email) && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                {client.phone && (
                  <span className="text-[var(--text-muted)]">📞 {client.phone}</span>
                )}
                {client.email && (
                  <span className="text-[var(--text-muted)]">✉️ {client.email}</span>
                )}
              </div>
            )}

            {client.note && (
              <p className="mt-4 text-sm text-[var(--text-muted)] p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">{client.note}</p>
            )}
            
            {account && (
              <div className="mt-4 flex items-center gap-2">
                <Avatar user={account} size={28} />
                <span className="text-sm text-[var(--text-faint)]">
                  Account phụ trách: <span className="text-[var(--text)] font-semibold">{account.name.replace(/\(.*?\)/g, "").trim()}</span>
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="hidden sm:flex gap-6 text-center shrink-0">
            <div>
              <p className="text-3xl font-black text-[var(--accent)]">{clientTasks.length}</p>
              <p className="text-xs uppercase tracking-wider text-[var(--text-faint)] mt-1">Tổng Task</p>
            </div>
            <div>
              <p className="text-3xl font-black text-[var(--text)]">{openTasks.length}</p>
              <p className="text-xs uppercase tracking-wider text-[var(--text-faint)] mt-1">Task mở</p>
            </div>
          </div>
        </div>
        
        {isManager && (
          <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-4">
            <button
              onClick={handleDeleteClient}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
            >
              Xoá Khách Hàng Này
            </button>
          </div>
        )}
      </div>

      {/* Tasks header + toggle + add button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-faint)]">
          Kế hoạch nội dung ({clientTasks.length})
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] p-0.5">
            <button
              onClick={() => setView("plan")}
              className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", view === "plan" ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--text-faint)] hover:text-[var(--text)]")}
            >
              📋 Bảng
            </button>
            <button
              onClick={() => setView("cards")}
              className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", view === "cards" ? "bg-[var(--surface-3)] text-[var(--text)]" : "text-[var(--text-faint)] hover:text-[var(--text)]")}
            >
              🗂️ Thẻ
            </button>
          </div>
          {isManager && (
            <button
              onClick={() => setShowNewTask(true)}
              className="btn-accent flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5"
            >
              + Bài mới
            </button>
          )}
        </div>
      </div>

      {/* Danh sách */}
      {clientTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border)] py-20 text-center bg-[var(--surface)]">
          <p className="text-[var(--text-muted)] text-lg font-medium">Chưa có bài nội dung nào.</p>
          <p className="text-[var(--text-faint)] text-sm mt-1">Tạo bài đầu tiên để lên kế hoạch nội dung cho khách này.</p>
          {isManager && (
            <button
              onClick={() => setShowNewTask(true)}
              className="mt-6 text-sm font-bold text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              + Tạo bài ngay
            </button>
          )}
        </div>
      ) : view === "plan" ? (
        <ContentPlanTable clientId={clientId} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientTasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}

      {showNewTask && (
        <QuickAddTask
          defaultClientId={clientId}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </div>
  );
}
