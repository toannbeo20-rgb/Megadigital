-- =============================================================
-- M3 — Content artifact + pipeline duyệt
-- Chạy trên Supabase SQL Editor. An toàn/idempotent.
-- =============================================================

-- 1) Bảng contents (mỗi bài/caption/kịch bản = 1 artifact gắn vào task)
create table if not exists contents (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references tasks(id) on delete cascade,
  title           text not null default 'Nội dung mới',
  body            text not null default '',
  version         int  not null default 1,
  approval_status text not null default 'draft'
                    check (approval_status in ('draft','noi_bo','gui_khach','khach_sua','khach_ok')),
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_contents_task on contents(task_id);

-- 2) comments.content_id — cho thread gắn vào từng content
alter table comments add column if not exists content_id uuid references contents(id) on delete cascade;
create index if not exists idx_comments_content on comments(content_id);

-- 3) RLS cho contents
alter table contents enable row level security;

drop policy if exists "contents: read all" on contents;
create policy "contents: read all" on contents
  for select to authenticated using (true);

drop policy if exists "contents: insert own" on contents;
create policy "contents: insert own" on contents
  for insert to authenticated
  with check (created_by = (select id from users where auth_id = auth.uid()));

drop policy if exists "contents: update own or manager" on contents;
create policy "contents: update own or manager" on contents
  for update to authenticated
  using (
    created_by = (select id from users where auth_id = auth.uid())
    or exists (select 1 from users where users.auth_id = auth.uid() and users.permission = 'manager')
  );

drop policy if exists "contents: delete own or manager" on contents;
create policy "contents: delete own or manager" on contents
  for delete to authenticated
  using (
    created_by = (select id from users where auth_id = auth.uid())
    or exists (select 1 from users where users.auth_id = auth.uid() and users.permission = 'manager')
  );

-- 4) Realtime cho contents
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contents'
  ) then
    alter publication supabase_realtime add table contents;
  end if;
end $$;
