"use server";

import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

export async function createUserAction(formData: FormData) {
  try {
    const supabase = await getSupabaseServer();
    
    // 1. Kiểm tra người gọi có đang đăng nhập và có quyền manager không
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const { data: callerData, error: callerError } = await supabase
      .from("users")
      .select("permission")
      .eq("auth_id", authUser.id)
      .single();

    if (callerError || !callerData || callerData.permission !== "manager") {
      throw new Error("Chỉ Manager mới có quyền tạo nhân sự");
    }

    // 2. Lấy dữ liệu từ form
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const permission = formData.get("permission") as string;
    // Roles được gửi lên dưới dạng danh sách ngăn cách bằng dấu phẩy
    const rolesString = formData.get("roles") as string;
    const roles = rolesString ? rolesString.split(",").map(r => r.trim()).filter(Boolean) : [];

    if (!email || !password || !name || !permission) {
      throw new Error("Vui lòng điền đủ thông tin");
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Tạo tài khoản Auth qua Admin API
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Tự động confirm email để nhân sự dùng được ngay
    });

    if (createError || !newAuthUser.user) {
      throw new Error(createError?.message || "Không thể tạo tài khoản Auth");
    }

    // 4. Insert vào bảng public.users
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      auth_id: newAuthUser.user.id,
      name,
      permission,
      roles,
      presence: "offline",
    });

    if (insertError) {
      // (Tùy chọn: Xóa auth user nếu insert fail để đảm bảo đồng bộ, ở đây ta throw luôn)
      throw new Error("Lỗi khi thêm vào bảng users: " + insertError.message);
    }

    return { success: true };
  } catch (error: Error | any) {
    return { success: false, error: error?.message || "Lỗi không xác định" };
  }
}
