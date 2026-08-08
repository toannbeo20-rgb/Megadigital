"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Lỗi cấu hình: Supabase chưa được kết nối.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Email hoặc mật khẩu không đúng.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -5%, rgba(170,237,42,0.1) 0%, transparent 65%), var(--bg)",
      }}
    >
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4 animate-in">
        <div
          className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
          style={{
            border: "1px solid rgba(170,237,42,0.4)",
            boxShadow: "0 0 24px rgba(170,237,42,0.25)",
          }}
        >
          <Image
            src="/logo.jpg"
            alt="Mega Digital"
            width={64}
            height={64}
            className="object-cover"
            priority
          />
        </div>
        <div className="text-center">
          <h1
            className="text-2xl font-black uppercase tracking-widest"
            style={{ color: "var(--accent)", letterSpacing: "0.12em" }}
          >
            Mega Digital
          </h1>
          <p className="mt-1 text-sm text-[var(--text-faint)]">
            Quản lý công việc nội bộ
          </p>
        </div>
      </div>

      {/* Card login */}
      <div
        className="w-full max-w-sm animate-bounce-in"
        style={{ animationDelay: "80ms" }}
      >
        <div className="card-glow rounded-2xl p-8">
          <h2 className="mb-6 text-xl font-bold text-[var(--text)]">
            Đăng nhập
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ten@megadigital.vn"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(170,237,42,0.12)] transition-all"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(170,237,42,0.12)] transition-all"
              />
            </div>

            {error && (
              <div className="animate-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-accent mt-2 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Đang đăng nhập…
                </span>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
          Tài khoản do quản lý tạo. Liên hệ Minh nếu chưa có.
        </p>
      </div>
    </div>
  );
}
