import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

// Lưu (hoặc cập nhật) subscription của thiết bị hiện tại cho user đang đăng nhập.
export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Tìm bản ghi public.users khớp auth_id
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();
  if (!me) {
    return NextResponse.json({ error: "no user profile" }, { status: 404 });
  }

  const sub = await request.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  // Upsert theo endpoint (mỗi thiết bị 1 dòng). Nếu đổi user trên cùng máy → cập nhật user_id.
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: me.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: request.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Huỷ subscription (khi user tắt thông báo / logout).
export async function DELETE(request: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json().catch(() => ({ endpoint: null }));
  if (!endpoint) {
    return NextResponse.json({ error: "missing endpoint" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
