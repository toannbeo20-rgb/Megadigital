import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { sendPushToUsers, isPushConfigured } from "@/lib/push";

// Tách task_id từ url dạng /cong-viec/<id> để gắn vào notification
function taskIdFromUrl(url: string): string | null {
  const m = url.match(/\/cong-viec\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

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

  // 1) Persist notification cho từng người nhận (chuông không mất khi reload)
  const notiText: string = payload?.notiText ?? body;
  const taskId = taskIdFromUrl(url);
  try {
    const admin = getSupabaseAdmin();
    await admin.from("notifications").insert(
      userIds.map((uid: string) => ({ user_id: uid, text: notiText, task_id: taskId }))
    );
  } catch (e) {
    console.error("[push/send] insert notifications lỗi:", e);
  }

  // 2) Gửi web push
  const result = await sendPushToUsers(userIds, { title, body, url });
  return NextResponse.json(result);
}
