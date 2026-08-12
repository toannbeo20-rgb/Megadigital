"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import type { TaskKind, Priority } from "@/lib/types";
import { PRIORITY_META } from "@/lib/types";
import { IconClose } from "./icons";
import { cn } from "@/lib/utils";

const KINDS: { value: Exclude<TaskKind, null>; label: string }[] = [
  { value: "content", label: "Content" },
  { value: "design", label: "Design" },
  { value: "media", label: "Media" },
  { value: "account", label: "Account" },
];

export default function QuickAddTask({
  onClose,
  defaultClientId,
  defaultDependsOn,
  defaultKind,
  defaultTitle,
}: {
  onClose: () => void;
  defaultClientId?: string;
  defaultDependsOn?: string;
  defaultKind?: TaskKind;
  defaultTitle?: string;
}) {
  const { users, clients, tasks, addTask } = useStore();
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [assignee, setAssignee] = useState(users[0]?.id ?? "");
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [deadline, setDeadline] = useState(new Date().toISOString().slice(0, 10));
  const [showMore, setShowMore] = useState(Boolean(defaultDependsOn || defaultKind));
  const [kind, setKind] = useState<TaskKind>(defaultKind ?? null);
  const [priority, setPriority] = useState<Priority>("trung_binh");
  const [dependsOn, setDependsOn] = useState<string>(defaultDependsOn ?? "");
  const [brief, setBrief] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canSave = title.trim() && assignee && clientId && deadline;

  function save() {
    if (!canSave) return;
    addTask({
      title: title.trim(),
      assignee_id: assignee,
      client_id: clientId,
      deadline,
      kind: showMore ? kind : null,
      priority: showMore ? priority : "trung_binh",
      depends_on_task_id: showMore && dependsOn ? dependsOn : null,
      brief: showMore && brief.trim() ? brief.trim() : null,
    });
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm md:items-center md:p-4" onClick={onClose}>
      <div
        className="animate-bounce-in w-full max-w-lg overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] md:rounded-[var(--radius)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold">Tạo task nhanh</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
            <IconClose />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && save()}
              placeholder="Task cần làm gì?"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-base font-medium outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(170,237,42,0.12)] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Giao cho">
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="ui-select">
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name.replace(/\(.*?\)/g, "").trim()}</option>
                ))}
              </select>
            </Field>
            <Field label="Deadline">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="ui-select" />
            </Field>
          </div>

          <Field label="Thuộc Khách hàng">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="ui-select">
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {!showMore ? (
            <button onClick={() => setShowMore(true)} className="text-sm font-medium text-[var(--accent)]">
              + Thêm chi tiết (loại, độ nặng, phụ thuộc)
            </button>
          ) : (
            <div className="space-y-4 rounded-xl bg-[var(--surface-2)] p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Loại</label>
                <div className="flex flex-wrap gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      onClick={() => setKind(kind === k.value ? null : k.value)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        kind === k.value ? "btn-accent" : "border border-[var(--border)] bg-[var(--surface)]"
                      )}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Mức độ ưu tiên</label>
                <div className="flex gap-2">
                  {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all",
                        priority === p
                          ? PRIORITY_META[p].className
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-faint)] hover:text-[var(--text)]"
                      )}
                    >
                      {PRIORITY_META[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Chờ task khác xong (handoff)">
                <select value={dependsOn} onChange={(e) => setDependsOn(e.target.value)} className="ui-select">
                  <option value="">— Không —</option>
                  {tasks.filter((t) => t.client_id === clientId).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brief chi tiết (tuỳ chọn)">
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Mô tả yêu cầu, link tài liệu, KPIs..."
                  className="ui-select min-h-24 resize-y"
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
          <span className="text-xs text-[var(--text-faint)]">Chỉ cần tên + người + deadline</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)]">Huỷ</button>
            <button onClick={save} disabled={!canSave} className="btn-accent rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-40">Lưu task</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ui-select {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          outline: none;
        }
        .ui-select:focus { border-color: var(--accent); }
      `}</style>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  );
}
