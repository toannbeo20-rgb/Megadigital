import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = "admin@megadigital.vn";
  const password = "password123";
  const name = "Admin (Marketing Director)";

  console.log(`Đang tạo tài khoản Quản lý: ${email}...`);
  
  // 1. Tạo user trong Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      console.log(`Tài khoản ${email} đã tồn tại trong hệ thống Auth. Đang tìm auth_id...`);
      // Thử tìm user
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData.users.find(u => u.email === email);
      if (existingUser) {
        await insertPublicUser(existingUser.id, name, email);
      } else {
        console.error("Không tìm thấy user dù báo đã tồn tại.");
      }
    } else {
      console.error("Lỗi tạo tài khoản Auth:", authError.message);
    }
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ Đã tạo tài khoản Auth thành công! Auth ID: ${userId}`);
  
  // 2. Thêm vào public.users
  await insertPublicUser(userId, name, email);
}

async function insertPublicUser(authId, name, email) {
  console.log(`Đang phân quyền Manager cho ${name}...`);
  const { error: insertError } = await supabaseAdmin.from("users").insert({
    auth_id: authId,
    name: name,
    roles: ["Marketing Director"],
    permission: "manager",
    presence: "offline"
  });

  if (insertError) {
    if (insertError.code === '23505') { // Unique violation
       console.log(`✅ Tài khoản này đã có sẵn trong bảng users.`);
    } else {
       console.error("❌ Lỗi cấp quyền Manager:", insertError.message);
    }
  } else {
    console.log(`✅ Hoàn tất!`);
  }
  
  console.log(`\n🎉 BẠN CÓ THỂ ĐĂNG NHẬP NGAY BẰNG:`);
  console.log(`Email: ${email}`);
  console.log(`Pass:  password123`);
}

main();
