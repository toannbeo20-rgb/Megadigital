-- =============================================================
-- Migration: Auth + RLS + Realtime
-- Chạy file này trên Supabase SQL Editor SAU schema.sql + seed.sql
-- =============================================================

-- 1. Thêm auth_id vào public.users để link với Supabase Auth
alter table users add column if not exists
  auth_id uuid unique references auth.users(id) on delete cascade;

-- 2. Bật Realtime cho tasks + users (mục 8 đặc tả)
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table jobs;

-- 3. Bật Row Level Security
alter table users   enable row level security;
alter table clients enable row level security;
alter table jobs    enable row level security;
alter table tasks   enable row level security;

-- 4. RLS Policies

-- users: mọi member đăng nhập đều thấy toàn bộ team (cần thấy presence đồng đội)
create policy "users: authenticated read all"
  on users for select
  to authenticated
  using (true);

-- users: chỉ chính mình mới update được record của mình
create policy "users: update own"
  on users for update
  to authenticated
  using (auth.uid() = auth_id);

-- clients: đọc được hết, chỉ manager mới được insert/update
create policy "clients: authenticated read all"
  on clients for select
  to authenticated
  using (true);

create policy "clients: manager write"
  on clients for all
  to authenticated
  using (
    exists (
      select 1 from users
      where users.auth_id = auth.uid()
        and users.permission = 'manager'
    )
  );

-- jobs: đọc được hết, manager write
create policy "jobs: authenticated read all"
  on jobs for select
  to authenticated
  using (true);

create policy "jobs: manager write"
  on jobs for all
  to authenticated
  using (
    exists (
      select 1 from users
      where users.auth_id = auth.uid()
        and users.permission = 'manager'
    )
  );

-- tasks: đọc được hết; update task của mình HOẶC là manager
create policy "tasks: authenticated read all"
  on tasks for select
  to authenticated
  using (true);

create policy "tasks: insert authenticated"
  on tasks for insert
  to authenticated
  with check (true);

create policy "tasks: update own or manager"
  on tasks for update
  to authenticated
  using (
    assignee_id = (select id from users where auth_id = auth.uid())
    or
    exists (
      select 1 from users
      where users.auth_id = auth.uid()
        and users.permission = 'manager'
    )
  );

-- comments: RLS policies (THIẾU → gây lỗi thầm khi nộp bài)
alter table comments enable row level security;

create policy "comments: authenticated read all"
  on comments for select
  to authenticated
  using (true);

create policy "comments: authenticated insert"
  on comments for insert
  to authenticated
  with check (true);

create policy "comments: delete own"
  on comments for delete
  to authenticated
  using (user_id = (select id from users where auth_id = auth.uid()));
