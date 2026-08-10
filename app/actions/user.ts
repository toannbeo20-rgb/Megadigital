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

// Xác minh người gọi là manager; trả về client server + admin.
async function requireManager() {
  const supabase = await getSupabaseServer();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Bạn chưa đăng nhập");
  const { data: me } = await supabase
    .from("users")
    .select("id, permission")
    .eq("auth_id", authUser.id)
    .single();
  if (!me || me.permission !== "manager") throw new Error("Chỉ Manager mới có quyền này");
  return { admin: getSupabaseAdmin(), meId: me.id as string };
}

// Sửa thông tin nhân sự (tên, quyền, vai trò)
export async function updateUserAction(
  userId: string,
  data: { name: string; permission: string; roles: string[] }
) {
  try {
    const { admin } = await requireManager();
    if (!data.name?.trim()) throw new Error("Tên không được để trống");
    const { error } = await admin
      .from("users")
      .update({ name: data.name.trim(), permission: data.permission, roles: data.roles })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: Error | any) {
    return { success: false, error: error?.message || "Lỗi không xác định" };
  }
}

// Đặt lại mật khẩu cho nhân sự
export async function resetPasswordAction(userId: string, newPassword: string) {
  try {
    const { admin } = await requireManager();
    if (!newPassword || newPassword.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");
    const { data: u } = await admin.from("users").select("auth_id").eq("id", userId).single();
    if (!u?.auth_id) throw new Error("Không tìm thấy tài khoản đăng nhập");
    const { error } = await admin.auth.admin.updateUserById(u.auth_id, { password: newPassword });
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: Error | any) {
    return { success: false, error: error?.message || "Lỗi không xác định" };
  }
}

// Xoá tài khoản nhân sự (chặn nếu còn task đang gán, hoặc tự xoá mình)
export async function deleteUserAction(userId: string) {
  try {
    const { admin, meId } = await requireManager();
    if (userId === meId) throw new Error("Không thể tự xoá tài khoản của chính mình");

    const { count } = await admin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", userId)
      .neq("status", "xong");
    if (count && count > 0) {
      throw new Error(`Nhân sự còn ${count} task chưa xong — hãy chuyển các task đó cho người khác trước khi xoá.`);
    }

    const { data: u } = await admin.from("users").select("auth_id").eq("id", userId).single();
    const { error: delErr } = await admin.from("users").delete().eq("id", userId);
    if (delErr) throw new Error(delErr.message);
    if (u?.auth_id) await admin.auth.admin.deleteUser(u.auth_id);
    return { success: true };
  } catch (error: Error | any) {
    return { success: false, error: error?.message || "Lỗi không xác định" };
  }
}
