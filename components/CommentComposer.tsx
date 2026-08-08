"use client";

import { useMemo, useRef, useState } from "react";
import type { User } from "@/lib/types";
import { Avatar } from "./ui";

// Ô nhập comment có gợi ý @mention.
// Gõ "@" → hiện danh sách người; chọn → chèn "@Tên " và ghi nhận user_id.
// Khi gửi: mentions = những user có thẻ @Tên còn xuất hiện trong text.

function displayName(u: User) {
  return u.name.replace(/\(.*?\)/g, "").trim();
}

export default function CommentComposer({
  users,
  currentUserId,
  onSubmit,
}: {
  users: User[];
  currentUserId: string;
  onSubmit: (text: string, mentions: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState<string | null>(null); // đoạn sau @ đang gõ
  const [picked, setPicked] = useState<Record<string, User>>({}); // token "@Tên" -> user
  const taRef = useRef<HTMLTextAreaElement>(null);

  const candidates = useMemo(() => {
    const list = users.filter((u) => u.id !== currentUserId);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((u) => displayName(u).toLowerCase().includes(q));
  }, [users, currentUserId, query]);

  function handleChange(value: string) {
    setText(value);
    // Phát hiện @query ở cuối con trỏ: @ + ký tự không phải khoảng trắng
    const m = value.slice(0, taRef.current?.selectionStart ?? value.length).match(/@([^\s@]*)$/);
    setQuery(m ? m[1] : null);
  }

  function pick(u: User) {
    const token = `@${displayName(u)}`;
    // Thay đoạn "@query" cuối bằng token + khoảng trắng
    const caret = taRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]*)$/, `${token} `);
    const after = text.slice(caret);
    const next = before + after;
    setText(next);
    setPicked((p) => ({ ...p, [token]: u }));
    setQuery(null);
    taRef.current?.focus();
  }

  function computeMentions(finalText: string): string[] {
    const ids = new Set<string>();
    for (const [token, u] of Object.entries(picked)) {
      if (finalText.includes(token)) ids.add(u.id);
    }
    return [...ids];
  }

  function submit() {
    const t = text.trim();
    if (!t) return;
    onSubmit(t, computeMentions(t));
    setText("");
    setPicked({});
    setQuery(null);
  }

  const showMenu = query !== null && candidates.length > 0;

  return (
    <div className="relative">
      {/* Menu gợi ý */}
      {showMenu && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border shadow-[var(--shadow-lg)]"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pick(u)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <Avatar user={u} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{displayName(u)}</p>
                  {u.roles.length > 0 && (
                    <p className="truncate text-[10px] text-[var(--text-faint)]">
                      {u.roles.map((r) => `#${r}`).join(" ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (showMenu && (e.key === "Enter" || e.key === "Tab")) {
              e.preventDefault();
              pick(candidates[0]);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nhập phản hồi... Gõ @ để nhắc ai đó (Enter để gửi)"
          className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          rows={2}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-accent h-[46px] rounded-xl px-4 text-sm font-bold disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
