-- =============================================================
-- Lịch làm việc theo tháng — mỗi user note lịch của mình, cả team xem được
-- Chạy trên Supabase SQL Editor. An toàn/idempotent.
-- =============================================================

create table if not exists schedule_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  date        date not null,
  note        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_schedule_user_date on schedule_entries(user_id, date);

alter table schedule_entries enable row level security;

-- Cả team đọc được lịch của nhau
drop policy if exists "schedule: read all" on schedule_entries;
create policy "schedule: read all" on schedule_entries
  for select to authenticated using (true);

-- Chỉ chủ nhân được thêm/sửa/xoá lịch của mình
drop policy if exists "schedule: insert own" on schedule_entries;
create policy "schedule: insert own" on schedule_entries
  for insert to authenticated
  with check (user_id = (select id from users where auth_id = auth.uid()));

drop policy if exists "schedule: update own" on schedule_entries;
create policy "schedule: update own" on schedule_entries
  for update to authenticated
  using (user_id = (select id from users where auth_id = auth.uid()));

drop policy if exists "schedule: delete own" on schedule_entries;
create policy "schedule: delete own" on schedule_entries
  for delete to authenticated
  using (user_id = (select id from users where auth_id = auth.uid()));

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_entries'
  ) then
    alter publication supabase_realtime add table schedule_entries;
  end if;
end $$;
