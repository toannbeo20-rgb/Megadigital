"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateUserAction, resetPasswordAction, deleteUserAction, getUserEmailAction } from "@/app/actions/user";
import type { User } from "@/lib/types";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";

const STAFF_ROLES = ["Content Creator", "Editor", "Designer", "Digital Marketing"];
const MANAGER_ROLES = ["Marketing Director", "Media Leader", "Brand Manager", "Digital Marketing Manager"];

export default function ManageUserModal({
  user,
  isSelf,
  onClose,
}: {
  user: User;
  isSelf: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  const [name, setName] = useState(user.name);
  const [permission, setPermission] = useState<"staff" | "manager">(user.permission);
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [newPassword, setNewPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [email, setEmail] = useState<string>("");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lấy email đăng nhập để hiển thị
  useEffect(() => {
    getUserEmailAction(user.id).then((r) => setEmail(r.email ?? ""));
  }, [user.id]);

  // Gộp role định sẵn theo quyền + role hiện có của user (để chỉnh được cả role cũ)
  const preset = permission === "manager" ? MANAGER_ROLES : STAFF_ROLES;
  const roleOptions = Array.from(new Set([...preset, ...roles]));

  function toggleRole(r: string) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function saveEdits() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateUserAction(user.id, { name, permission, roles });
      if (res.success) {
        setMsg({ type: "ok", text: "Đã lưu thay đổi." });
        setTimeout(onClose, 700);
      } else setMsg({ type: "err", text: res.error ?? "Lỗi" });
    });
  }

  function resetPassword() {
    setMsg(null);
    startTransition(async () => {
      const res = await resetPasswordAction(user.id, newPassword);
      if (res.success) {
        setMsg({ type: "ok", text: `Đã đặt lại mật khẩu thành: ${newPassword}` });
        setNewPassword("");
      } else setMsg({ type: "err", text: res.error ?? "Lỗi" });
    });
  }

  function doDelete() {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteUserAction(user.id);
      if (res.success) onClose();
      else {
        setMsg({ type: "err", text: res.error ?? "Lỗi" });
        setConfirmDelete(false);
      }
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto scale-100 animate-in fade-in zoom-in-95 rounded-2xl bg-[var(--surface)] p-6 shadow-2xl ring-1 ring-[var(--border)]">
        {/* Header nhận diện: avatar + tên + email đăng nhập */}
        <div className="mb-5 flex items-center gap-3">
          <Avatar user={user} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-black text-[var(--text)]">
                {user.name.replace(/\(.*?\)/g, "").trim()}
              </h2>
              {isSelf && <span className="text-xs font-semibold text-[var(--accent)]">(bạn)</span>}
            </div>
            <p className="truncate text-sm text-[var(--text-muted)]">
              {email || <span className="text-[var(--text-faint)]">đang tải email…</span>}
            </p>
          </div>
        </div>

        {msg && (
          <div
            className={cn(
              "mb-4 rounded-lg border p-3 text-sm",
              msg.type === "err"
                ? "border-red-500/20 bg-red-500/15 text-red-500"
                : "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
            )}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Tên */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Quyền */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Phân quyền</label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "staff" | "manager")}
              disabled={isPending}
              className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="staff">Staff — chỉ việc của mình</option>
              <option value="manager">Manager — quản lý toàn bộ</option>
            </select>
          </div>

          {/* Roles */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Vai trò (Roles)</label>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleRole(r)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                    roles.includes(r)
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] hover:text-[var(--text)]"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2.5 font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
              Đóng
            </button>
            <button onClick={saveEdits} disabled={isPending} className="btn-accent rounded-lg px-5 py-2.5 font-bold">
              {isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>

        {/* Đặt lại mật khẩu */}
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Đặt lại mật khẩu</label>
          <div className="flex gap-2">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mật khẩu mới (≥ 6 ký tự)"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              onClick={resetPassword}
              disabled={isPending || newPassword.length < 6}
              className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-bold text-[var(--text)] hover:border-[var(--border-bright)] disabled:opacity-40"
            >
              Đặt lại
            </button>
          </div>
        </div>

        {/* Xoá tài khoản */}
        {!isSelf && (
          <div className="mt-5 border-t border-[var(--border)] pt-5">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="text-sm font-semibold text-red-500 hover:underline"
              >
                Xoá tài khoản này
              </button>
            ) : (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="mb-3 text-sm text-red-400">Xoá vĩnh viễn tài khoản này? Không thể hoàn tác.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} disabled={isPending} className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text-muted)]">
                    Huỷ
                  </button>
                  <button onClick={doDelete} disabled={isPending} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">
                    {isPending ? "Đang xoá..." : "Xoá vĩnh viễn"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
