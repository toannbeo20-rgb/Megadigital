"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { PageHeader, Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SLOT_META, type ScheduleSlot, type User } from "@/lib/types";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function shortName(u?: User) {
  return u?.name.replace(/\(.*?\)/g, "").trim() ?? "?";
}

export default function CalendarPage() {
  const { users, currentUser, scheduleEntries, addScheduleEntry, deleteScheduleEntry } = useStore();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [viewUserId, setViewUserId] = useState<string>(""); // "" = mặc định về mình
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  // Nhận ?user=<id> từ link ở màn Nhân sự
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("user");
    if (u && users.some((x) => x.id === u)) setViewUserId(u);
  }, [users]);

  const effectiveUserId = viewUserId || currentUser.id; // luôn có giá trị đúng
  const isAll = effectiveUserId === "__all__";
  const editable = effectiveUserId === currentUser.id;

  // Lịch của tháng đang xem, đã lọc theo người
  const monthEntries = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    return scheduleEntries.filter(
      (e) => e.date.startsWith(prefix) && (isAll || e.user_id === effectiveUserId)
    );
  }, [scheduleEntries, year, month, effectiveUserId, isAll]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, typeof monthEntries>();
    for (const e of monthEntries) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [monthEntries]);

  // Lưới ngày (bắt đầu Thứ 2)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // 0 = Mon
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m);
    setYear(y);
  }

  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedEntries = selectedDay ? (entriesByDate.get(selectedDay) ?? []) : [];

  return (
    <div className="animate-in">
      <PageHeader
        title="Lịch làm việc"
        subtitle="Ghi lịch của bạn; cả team xem được lịch của nhau."
        action={
          <select
            value={effectiveUserId}
            onChange={(e) => setViewUserId(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value={currentUser.id}>Lịch của tôi</option>
            <option value="__all__">Cả team</option>
            {users.filter((u) => u.id !== currentUser.id).map((u) => (
              <option key={u.id} value={u.id}>{shortName(u)}</option>
            ))}
          </select>
        }
      />

      {/* Thanh điều hướng tháng */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-bold hover:border-[var(--border-bright)]">←</button>
          <span className="min-w-[130px] text-center text-base font-black text-[var(--text)]">Tháng {month + 1} / {year}</span>
          <button onClick={() => shiftMonth(1)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-bold hover:border-[var(--border-bright)]">→</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} className="ml-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">Hôm nay</button>
        </div>
        {editable && <span className="hidden text-xs text-[var(--text-faint)] sm:block">Bấm vào ngày để thêm lịch</span>}
        {!editable && !isAll && <span className="hidden text-xs text-[var(--text-faint)] sm:block">Đang xem lịch của {shortName(users.find((u) => u.id === effectiveUserId))} (chỉ đọc)</span>}
      </div>

      {/* Lưới lịch */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-[84px]" />;
          const dateStr = ymd(year, month, d);
          const dayEntries = entriesByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          return (
            <button
              key={i}
              onClick={() => editable && setSelectedDay(dateStr)}
              className={cn(
                "min-h-[84px] rounded-xl border p-1.5 text-left transition-colors",
                isToday ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)]",
                editable ? "cursor-pointer hover:border-[var(--border-bright)]" : "cursor-default"
              )}
            >
              <span className={cn("text-xs font-bold", isToday ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{d}</span>
              <div className="mt-1 flex flex-col gap-1">
                {dayEntries.slice(0, 3).map((e) => {
                  const u = users.find((x) => x.id === e.user_id);
                  const sm = SLOT_META[(e.slot as ScheduleSlot) ?? "ca_ngay"];
                  return (
                    <div key={e.id} className={cn("flex items-center gap-1 rounded-md border px-1.5 py-0.5", sm.className)}>
                      {isAll && u && <Avatar user={u} size={14} />}
                      <span className="shrink-0 text-[10px] leading-none">{sm.icon}</span>
                      <span className="truncate text-[11px] leading-tight">{e.note}</span>
                    </div>
                  );
                })}
                {dayEntries.length > 3 && <span className="text-[10px] text-[var(--text-faint)]">+{dayEntries.length - 3} nữa</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal ngày (chỉ khi xem lịch của mình) */}
      {mounted && selectedDay && editable &&
        createPortal(
          <DayModal
            date={selectedDay}
            entries={selectedEntries}
            onAdd={(note, slot) => addScheduleEntry(selectedDay, note, slot)}
            onDelete={(id) => deleteScheduleEntry(id)}
            onClose={() => setSelectedDay(null)}
          />,
          document.body
        )}
    </div>
  );
}

function DayModal({
  date,
  entries,
  onAdd,
  onDelete,
  onClose,
}: {
  date: string;
  entries: { id: string; note: string; slot?: ScheduleSlot }[];
  onAdd: (note: string, slot: ScheduleSlot) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState<ScheduleSlot>("sang");
  const d = new Date(date + "T00:00:00");
  const label = `${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

  function submit() {
    if (!note.trim()) return;
    onAdd(note.trim(), slot);
    setNote("");
  }

  // Sắp theo buổi: sáng → chiều → cả ngày
  const order: Record<ScheduleSlot, number> = { sang: 0, chieu: 1, ca_ngay: 2 };
  const sorted = [...entries].sort((a, b) => order[a.slot ?? "ca_ngay"] - order[b.slot ?? "ca_ngay"]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md scale-100 animate-in fade-in zoom-in-95 rounded-2xl bg-[var(--surface)] p-5 shadow-2xl ring-1 ring-[var(--border)]">
        <h2 className="mb-3 text-lg font-black text-[var(--text)]">Lịch ngày {label}</h2>

        <div className="mb-4 flex flex-col gap-2">
          {sorted.length === 0 ? (
            <p className="text-sm italic text-[var(--text-faint)]">Chưa có lịch. Thêm bên dưới.</p>
          ) : (
            sorted.map((e) => {
              const sm = SLOT_META[e.slot ?? "ca_ngay"];
              return (
                <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold", sm.className)}>
                      {sm.icon} {sm.label}
                    </span>
                    <span className="truncate text-sm text-[var(--text)]">{e.note}</span>
                  </span>
                  <button onClick={() => onDelete(e.id)} className="shrink-0 text-xs font-semibold text-red-500 hover:underline">Xoá</button>
                </div>
              );
            })
          )}
        </div>

        {/* Chọn buổi */}
        <div className="mb-2 flex gap-2">
          {(Object.keys(SLOT_META) as ScheduleSlot[]).map((s) => (
            <button
              key={s}
              onClick={() => setSlot(s)}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-sm font-semibold transition-all",
                slot === s ? SLOT_META[s].className : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] hover:text-[var(--text)]"
              )}
            >
              {SLOT_META[s].icon} {SLOT_META[s].label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Ví dụ: Đi quay BĐS Hoàng Gia"
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button onClick={submit} disabled={!note.trim()} className="btn-accent shrink-0 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40">Thêm</button>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">Xong</button>
        </div>
      </div>
    </div>
  );
}
