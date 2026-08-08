-- =============================================================
-- App quản lý Agency — Schema Phase 1 (MVP)
-- Postgres / Supabase
-- 4 bảng lõi: clients, jobs, tasks, users
-- Tham chiếu: dac-ta-app-quan-ly-agency.md (mục 4)
-- =============================================================

-- Bật extension uuid
create extension if not exists "pgcrypto";

-- ---------- ENUM-like: dùng text + check để giữ mềm dẻo ----------
-- (đặc tả nhấn mạnh "để mềm" vì đa ngành → dùng text, không enum cứng)

-- ---------- users ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid,                                    -- Liên kết với auth.users của Supabase
  name          text not null,
  roles         text[] not null default '{}',            -- account, content leader, designer, media...
  permission    text not null default 'staff'            -- manager | staff
                  check (permission in ('manager','staff')),
  presence      text not null default 'offline',         -- xem mục 5
  status_note   text,
  last_active_at timestamptz not null default now()
);

-- ---------- clients ----------
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  account_id      uuid references users(id) on delete set null,
  contact_person  text,
  phone           text,
  email           text,
  industry        text,
  tier            text,
  status          text not null default 'active',
  note            text,
  created_at      timestamptz not null default now()
);

-- ---------- jobs ----------
create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  type        text,                                       -- nhãn tự do
  status      text not null default 'dang_chay'           -- pitch | dang_chay | cho_duyet | done
                check (status in ('pitch','dang_chay','cho_duyet','done')),
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists tasks (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid references clients(id) on delete cascade,
  job_id              uuid references jobs(id) on delete cascade,
  title               text not null,
  assignee_id         uuid not null references users(id) on delete restrict,
  kind                text,                               -- content | design | media | account
  weight              int not null default 1 check (weight between 1 and 3),
  deadline            date not null,
  depends_on_task_id  uuid references tasks(id) on delete set null,
  status              text not null default 'ton'         -- ton | dang_lam | cho_duyet | xong
                        check (status in ('ton','dang_lam','cho_duyet','xong')),
  completed_at        timestamptz,
  brief               text,                               -- Lưu vết yêu cầu/brief của công việc
  approval_status     text,                               -- null | draft | noi_bo | gui_khach | khach_sua | khach_ok
  created_at          timestamptz not null default now()
);

create index if not exists idx_tasks_assignee on tasks(assignee_id);
create index if not exists idx_tasks_job on tasks(job_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_jobs_client on jobs(client_id);

-- Tự set completed_at khi task chuyển sang 'xong' (dùng cho KPI tỷ lệ đúng hạn - Phase 2)
create or replace function set_completed_at() returns trigger as $$
begin
  if new.status = 'xong' and (old.status is distinct from 'xong') then
    new.completed_at := now();
  elsif new.status <> 'xong' then
    new.completed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_completed_at on tasks;
create trigger trg_set_completed_at
  before update on tasks
  for each row execute function set_completed_at();

-- ---------- comments ----------
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_comments_task on comments(task_id);

-- ---------- Realtime (mục 8): bật cho tasks + users + comments ----------
-- Chạy sau khi tạo bảng:
-- alter publication supabase_realtime add table tasks;
-- alter publication supabase_realtime add table users;
-- alter publication supabase_realtime add table comments;
