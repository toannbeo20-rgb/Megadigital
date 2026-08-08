import "server-only";
import webpush from "web-push";
import { getSupabaseAdmin } from "./supabase/server";

// Cấu hình VAPID 1 lần khi module nạp (chỉ chạy ở server).
let configured = false;
export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Gửi push tới tất cả thiết bị của một danh sách user.
// Dùng service_role để đọc subscription (bypass RLS) và tự dọn subscription hết hạn.
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0 };
  ensureConfigured();

  const admin = getSupabaseAdmin();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  if (error || !subs?.length) return { sent: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err: unknown) {
        // 404/410 = subscription đã hết hạn → xoá khỏi DB
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) stale.push(s.endpoint);
      }
    })
  );

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return { sent };
}
