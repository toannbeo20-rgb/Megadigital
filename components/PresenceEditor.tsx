"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Presence } from "@/lib/types";
import { PRESENCE_META } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: Presence[] = ["online", "dang_content", "di_quay", "gap_khach", "ban", "offline"];

export default function PresenceEditor() {
  const { currentUser, setPresence } = useStore();
  const [note, setNote] = useState(currentUser.status_note ?? "");

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Trạng thái của bạn</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {OPTIONS.map((p) => {
          const meta = PRESENCE_META[p];
          const active = currentUser.presence === p;
          return (
            <button
              key={p}
              onClick={() => setPresence(currentUser.id, p)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setPresence(currentUser.id, currentUser.presence, note.trim() || null)}
          placeholder='VD: "Ở BĐS Hoàng Gia, về lúc 3h"'
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>
    </div>
  );
}
