-- =============================================================
-- M1 / Slice A — @mention trong comment
-- Thêm cột mentions (mảng user_id được nhắc) vào bảng comments.
-- Chạy trên Supabase SQL editor sau schema.sql
-- =============================================================

alter table comments
  add column if not exists mentions uuid[] not null default '{}';

-- (comments đã bật realtime ở schema.sql — không cần thêm)
