import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client cho Server Components, Server Actions, Route Handlers.
// Tự động đọc/ghi session từ cookies.
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
