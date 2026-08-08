import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = "minh@megadigital.vn";
  const password = "password123";

  console.log(`Đang đăng ký user: ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Lỗi đăng ký:", error.message);
    process.exit(1);
  }

  const userId = data.user?.id;
  console.log(`✅ Đăng ký thành công! Auth ID của Minh: ${userId}`);
  
  console.log(`\n👉 HÃY CHẠY CÂU SQL SAU TRONG SUPABASE SQL EDITOR ĐỂ LINK AUTH VỚI PUBLIC.USERS:`);
  console.log(`update users set auth_id = '${userId}' where id = '11111111-1111-1111-1111-111111111111';`);
}

main();
