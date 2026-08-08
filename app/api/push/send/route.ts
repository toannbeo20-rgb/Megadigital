import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendPushToUsers, isPushConfigured } from "@/lib/push";

// Gửi web push tới danh sách user. Chỉ user đã đăng nhập mới gọi được
// (tránh spam từ ngoài). Trigger: giao task mới, tới lượt handoff.
export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ sent: 0, note: "push not configured" });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const userIds: string[] = Array.isArray(payload?.userIds) ? payload.userIds : [];
  const title: string = payload?.title ?? "Mega Digital";
  const body: string = payload?.body ?? "Bạn có thông báo mới.";
  const url: string = payload?.url ?? "/";

  if (userIds.length === 0) {
    return NextResponse.json({ error: "no recipients" }, { status: 400 });
  }

  const result = await sendPushToUsers(userIds, { title, body, url });
  return NextResponse.json(result);
}
