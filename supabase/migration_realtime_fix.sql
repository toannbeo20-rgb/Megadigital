-- =============================================================
-- FIX REALTIME — đảm bảo mọi bảng được publish qua supabase_realtime
-- + vá cột schedule_entries.slot còn thiếu
-- Chạy 1 lần trên Supabase SQL Editor. An toàn, chạy lại được.
-- Sau khi chạy: mọi thay đổi (task, lịch, bình luận, content…) cập nhật realtime.
-- =============================================================

-- 1) Vá cột slot cho lịch (nếu chạy migration_schedule bản cũ)
alter table schedule_entries add column if not exists slot text not null default 'ca_ngay';

-- 2) Bật realtime cho tất cả bảng lõi (drop rồi add để chắc chắn là thành viên)
do $$
declare
  t text;
  arr text[] := array['tasks','users','jobs','clients','comments','contents','notifications','schedule_entries','push_subscriptions'];
begin
  foreach t in array arr loop
    -- gỡ nếu đã là thành viên (bỏ qua lỗi nếu chưa)
    begin
      execute format('alter publication supabase_realtime drop table public.%I', t);
    exception when others then null;
    end;
    -- thêm vào publication
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then
      raise notice 'Bỏ qua % : %', t, sqlerrm;
    end;
    -- replica identity full → UPDATE/DELETE mang đủ dữ liệu cũ
    begin
      execute format('alter table public.%I replica identity full', t);
    exception when others then null;
    end;
  end loop;
end $$;

-- 3) Kiểm tra: liệt kê các bảng đang được realtime publish (nên thấy đủ 9 bảng)
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
