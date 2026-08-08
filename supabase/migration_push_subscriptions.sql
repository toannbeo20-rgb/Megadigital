-- =============================================================
-- Web Push — bảng lưu subscription của từng thiết bị
-- Tham chiếu: dac-ta-app-quan-ly-agency.md (mục 9)
-- Chạy trên Supabase SQL editor sau schema.sql
-- =============================================================

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null unique,          -- endpoint = định danh 1 thiết bị/trình duyệt
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subs_user on push_subscriptions(user_id);

-- RLS: chỉ chủ nhân đọc/ghi subscription của mình; server (service_role) bỏ qua RLS.
alter table push_subscriptions enable row level security;

drop policy if exists "own subs select" on push_subscriptions;
create policy "own subs select" on push_subscriptions
  for select using (
    user_id in (select id from users where auth_id = auth.uid())
  );

drop policy if exists "own subs insert" on push_subscriptions;
create policy "own subs insert" on push_subscriptions
  for insert with check (
    user_id in (select id from users where auth_id = auth.uid())
  );

drop policy if exists "own subs delete" on push_subscriptions;
create policy "own subs delete" on push_subscriptions
  for delete using (
    user_id in (select id from users where auth_id = auth.uid())
  );
