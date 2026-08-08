"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { Avatar } from "./ui";

export default function UserSwitcher() {
  const { users, currentUser, setCurrentUser } = useStore();
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar user={currentUser} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {currentUser.name.replace(/\(.*?\)/g, "").trim()}
          </div>
          <div className="text-xs text-[var(--text-faint)]">
            {currentUser.permission === "manager" ? "Quản lý" : "Nhân sự"} ·{" "}
            {currentUser.roles.join(", ")}
          </div>
        </div>
      </div>

      {/* Nếu chưa có Supabase → giữ UserSwitcher để demo phân quyền */}
      {!isSupabaseConfigured && (
        <>
          <label className="text-[11px] text-[var(--text-faint)]">
            Xem app với vai trò của:
          </label>
          <select
            value={currentUser.id}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.permission === "manager" ? "QL" : "NV"}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Nút đăng xuất (chỉ hiện khi có Supabase) */}
      {isSupabaseConfigured && (
        <button
          onClick={handleLogout}
          className="btn-ghost mt-1 w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
        >
          Đăng xuất
        </button>
      )}
    </div>
  );
}
