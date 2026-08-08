-- =============================================================
-- FIX ALL — đồng bộ schema DB thật với code (chạy 1 lần trên Supabase SQL Editor)
-- An toàn, idempotent: chạy lại nhiều lần không sao.
-- Sau khi chạy: task lưu được brief đầy đủ + @mention hiện realtime.
-- =============================================================

-- 1) Cột còn thiếu duy nhất: tasks.brief  (nguồn của "lỗi tạo/sửa task")
alter table tasks add column if not exists brief text;

-- 2) Đảm bảo comments có cột mentions (cho @mention) — thường đã có
alter table comments add column if not exists mentions uuid[] not null default '{}';

-- 3) Bật realtime cho comments (để bình luận + @mention hiện ngay cho cả team)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table comments;
  end if;
end $$;

-- 4) (Đã tạo trước đó, để đây cho chắc) bảng push_subscriptions cho Web Push
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);

-- 5) M1/Slice B — bảng notifications (chuông không mất khi reload + digest sáng)
create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  text        text not null,
  task_id     uuid references tasks(id) on delete set null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, created_at desc);

alter table notifications enable row level security;

-- chỉ chủ nhân đọc thông báo của mình
drop policy if exists "notifications: select own" on notifications;
create policy "notifications: select own" on notifications
  for select to authenticated
  using (user_id = (select id from users where auth_id = auth.uid()));

-- chỉ chủ nhân đánh dấu đã đọc thông báo của mình
drop policy if exists "notifications: update own" on notifications;
create policy "notifications: update own" on notifications
  for update to authenticated
  using (user_id = (select id from users where auth_id = auth.uid()));
-- (insert chỉ do server/service_role thực hiện → không cần policy insert cho client)

-- realtime cho notifications
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
