import { createBrowserClient } from "@supabase/ssr";

// Kiểm tra URL hợp lệ (http/https) để tránh createBrowserClient ném lỗi lúc build.
function isValidHttpUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Trả về Supabase client nếu đã cấu hình env hợp lệ, ngược lại null (app dùng mock store).
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!isValidHttpUrl(url) || !key) return null;
  return createBrowserClient(url, key);
}

export const isSupabaseConfigured =
  isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
