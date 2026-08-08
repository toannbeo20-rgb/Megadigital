import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendPushToUsers } from "@/lib/push";

// Digest buổi sáng — Vercel Cron gọi lúc 1:00 UTC = 8:00 giờ VN (xem vercel.json).
// Mỗi nhân sự nhận: web push + 1 notification liệt kê số việc cần xử lý hôm nay.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Bảo vệ: nếu đặt CRON_SECRET thì bắt buộc khớp (Vercel Cron tự gửi header này).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = getSupabaseAdmin();

  // "Hôm nay" theo giờ VN (UTC+7)
  const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
  const today = vnNow.toISOString().slice(0, 10);

  // Task chưa xong, tới hạn hôm nay hoặc đã quá hạn
  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id,title,assignee_id,deadline,status")
    .neq("status", "xong")
    .lte("deadline", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Gom theo người phụ trách
  const byUser = new Map<string, number>();
  for (const t of tasks ?? []) {
    if (!t.assignee_id) continue;
    byUser.set(t.assignee_id, (byUser.get(t.assignee_id) ?? 0) + 1);
  }

  let recipients = 0;
  for (const [userId, count] of byUser) {
    const text = `Hôm nay bạn có ${count} việc cần xử lý (gồm cả quá hạn).`;
    // Lưu notification
    await admin.from("notifications").insert({ user_id: userId, text, task_id: null });
    // Web push
    await sendPushToUsers([userId], { title: "☀️ Chào buổi sáng", body: text, url: "/" });
    recipients++;
  }

  return NextResponse.json({ ok: true, date: today, recipients });
}
