require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Cần quyền admin để tạo user ko cần xác thực email và update bảng public

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS = [
  { id: '11111111-1111-1111-1111-111111111111', email: 'minh.account@megadigital.vn', name: 'Minh (Account Lead)', password: 'password123' },
  { id: '22222222-2222-2222-2222-222222222222', email: 'lan.content@megadigital.vn', name: 'Lan (Content)', password: 'password123' },
  { id: '33333333-3333-3333-3333-333333333333', email: 'huy.design@megadigital.vn', name: 'Huy (Designer)', password: 'password123' },
  { id: '44444444-4444-4444-4444-444444444444', email: 'trang.media@megadigital.vn', name: 'Trang (Media)', password: 'password123' },
  { id: '55555555-5555-5555-5555-555555555555', email: 'phong.account@megadigital.vn', name: 'Phong (Account)', password: 'password123' },
];

async function main() {
  console.log("🚀 Bắt đầu tạo toàn bộ 5 Test Users...");
  
  for (const u of USERS) {
    console.log(`\nĐang tạo user: ${u.email}...`);
    // 1. Tạo user trong Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true, // Không cần bắt verify qua email
    });

    if (authError) {
      if (authError.message.includes("already exists")) {
        console.log(`⚠️ User ${u.email} đã tồn tại trong hệ thống Auth, tiến hành liên kết...`);
        // Tìm auth_id cũ nếu có
        const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listUsers.users.find(x => x.email === u.email);
        if (existing) {
          await linkUser(u.id, existing.id);
        }
      } else {
        console.error("❌ Lỗi tạo user:", authError.message);
      }
    } else if (authData.user) {
      console.log(`✅ Đã tạo Auth thành công! Auth ID: ${authData.user.id}`);
      await linkUser(u.id, authData.user.id);
    }
  }

  console.log("\n🎉 HOÀN TẤT TẠO 5 TÀI KHOẢN! BẠN CÓ THỂ ĐĂNG NHẬP VÀ TEST NGAY.");
  console.log("Mật khẩu chung cho tất cả: password123");
}

async function linkUser(publicId, authId) {
  // 2. Link với bảng public.users
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ auth_id: authId })
    .eq('id', publicId);
    
  if (updateError) {
    console.error("❌ Lỗi khi liên kết sang bảng public.users:", updateError.message);
  } else {
    console.log(`🔗 Liên kết thành công với public.users (ID: ${publicId})`);
  }
}

main();
