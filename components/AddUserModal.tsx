"use client";

import { useState, useTransition } from "react";
import { createUserAction } from "@/app/actions/user";
import { cn } from "@/lib/utils";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAFF_ROLES = ["Content Creator", "Editor", "Designer", "Digital Marketing"];
const MANAGER_ROLES = ["Marketing Director", "Media Leader", "Brand Manager", "Digital Marketing Manager"];

export default function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<"staff" | "manager">("staff");

  const currentRoles = selectedPermission === "manager" ? MANAGER_ROLES : STAFF_ROLES;

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await createUserAction(formData);
      if (!result.success) {
        setErrorMsg(result.error ?? "Đã xảy ra lỗi");
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={!isPending ? onClose : undefined}
      />

      {/* Wrapper cuộn — luôn thấy đủ modal dù màn hình thấp */}
      <div className="relative flex min-h-full items-center justify-center p-4">
        {/* Modal Box */}
        <div className="relative w-full max-w-md scale-100 animate-in fade-in zoom-in-95 rounded-2xl bg-[var(--surface)] p-6 shadow-2xl ring-1 ring-[var(--border)]">
        <h2 className="mb-1 text-2xl font-black text-[var(--text)]">Thêm nhân sự mới</h2>
        <p className="mb-6 text-sm text-[var(--text-muted)]">
          Tạo tài khoản đăng nhập cho thành viên mới của team.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-red-500/15 p-3 text-sm text-red-500 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Tên hiển thị</label>
            <input 
              name="name"
              type="text" 
              required
              placeholder="Ví dụ: Minh (Account Lead)"
              className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Email đăng nhập</label>
            <input 
              name="email"
              type="email" 
              required
              placeholder="nhansu@megadigital.vn"
              className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Mật khẩu tạm</label>
            <input 
              name="password"
              type="text" 
              required
              placeholder="Nên đặt mk dễ nhớ, ví dụ: 123456"
              className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Phân quyền</label>
              <select 
                name="permission"
                value={selectedPermission}
                onChange={(e) => {
                  setSelectedPermission(e.target.value as "staff" | "manager");
                  setSelectedRoles([]); // Reset roles khi đổi quyền
                }}
                className="w-full rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                disabled={isPending}
              >
                <option value="staff">Staff (Chỉ xem việc của mình)</option>
                <option value="manager">Manager (Quản lý toàn bộ)</option>
              </select>
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[var(--text)]">Vai trò (Roles)</label>
              <div className="flex flex-wrap gap-2">
                {currentRoles.map(role => (
                  <button
                    key={role}
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setSelectedRoles(prev => 
                        prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                      )
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-all",
                      selectedRoles.includes(role)
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-faint)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <input type="hidden" name="roles" value={selectedRoles.join(", ")} />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg px-4 py-2.5 font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "rounded-lg px-5 py-2.5 font-bold text-white transition-all",
                isPending ? "bg-[var(--accent)]/50 cursor-not-allowed" : "bg-[var(--accent)] hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(170,237,42,0.4)]"
              )}
            >
              {isPending ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
