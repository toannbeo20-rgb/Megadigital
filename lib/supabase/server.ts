import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client cho Server Components, Server Actions, Route Handlers.
// Tự động đọc/ghi session từ cookies.
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component không thể set cookie — bỏ qua.
          }
        },
      },
    }
  );
}

// Supabase client dành riêng cho thao tác Admin (bypass RLS, tạo auth user, v.v.)
// CHỈ GỌI Ở SERVER ACTIONS HOẶC ROUTE HANDLERS
export function getSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
