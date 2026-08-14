"use server";

import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

// Chỉ manager mới được gọi (xác minh phía server, không tin client).
async function requireManagerAdmin() {
  const supabase = await getSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Bạn chưa đăng nhập");
  const { data: me } = await supabase
    .from("users")
    .select("id, permission")
    .eq("auth_id", authUser.id)
    .single();
  if (!me || me.permission !== "manager") throw new Error("Chỉ Manager mới có quyền này");
  return getSupabaseAdmin();
}

// Xoá TOÀN BỘ task (contents + comments của task tự xoá theo FK cascade).
// Trả về số task đã xoá.
export async function deleteAllTasksAction() {
  try {
    const admin = await requireManagerAdmin();
    const { data, error } = await admin
      .from("tasks")
      .delete()
      .gte("created_at", "1900-01-01T00:00:00Z") // filter luôn đúng → xoá tất cả
      .select("id");
    if (error) throw new Error(error.message);
    return { success: true, count: data?.length ?? 0 };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message || "Lỗi không xác định" };
  }
}
