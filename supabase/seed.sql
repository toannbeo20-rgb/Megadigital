-- =============================================================
-- Seed dữ liệu mẫu — 6 khách hàng như đặc tả, vài user & task
-- Chạy sau schema.sql
-- =============================================================

-- Users (team < 10)
insert into users (id, name, roles, permission, presence, status_note) values
  ('11111111-1111-1111-1111-111111111111', 'Minh (Account Lead)', '{account,content leader}', 'manager', 'online', null),
  ('22222222-2222-2222-2222-222222222222', 'Lan (Content)',       '{content}',                'staff',   'dang_content', 'Viết bài spa, xong lúc 4h'),
  ('33333333-3333-3333-3333-333333333333', 'Huy (Designer)',      '{designer}',               'staff',   'online', null),
  ('44444444-4444-4444-4444-444444444444', 'Trang (Media)',       '{media}',                  'staff',   'di_quay', 'Ở BĐS Hoàng Gia, về 3h'),
  ('55555555-5555-5555-5555-555555555555', 'Phong (Account)',     '{account}',                'staff',   'gap_khach', 'Họp homestay')
on conflict (id) do nothing;

-- Clients (6 khách)
insert into clients (id, name, account_id, note) values
  ('c1111111-1111-1111-1111-111111111111', 'BĐS Hoàng Gia',      '11111111-1111-1111-1111-111111111111', 'Phân phối bất động sản'),
  ('c2222222-2222-2222-2222-222222222222', 'Homestay Đà Lạt',    '55555555-5555-5555-5555-555555555555', 'Lưu trú'),
  ('c3333333-3333-3333-3333-333333333333', 'Điện thoại TechOne', '11111111-1111-1111-1111-111111111111', 'Bán lẻ điện thoại'),
  ('c4444444-4444-4444-4444-444444444444', 'Spa Dưỡng Sinh An',  '55555555-5555-5555-5555-555555555555', 'Spa dưỡng sinh'),
  ('c5555555-5555-5555-5555-555555555555', 'Nội thất Mộc',       '11111111-1111-1111-1111-111111111111', 'Nội thất'),
  ('c6666666-6666-6666-6666-666666666666', 'Quản lý Tài sản VP', '55555555-5555-5555-5555-555555555555', 'Cho thuê & quản lý')
on conflict (id) do nothing;

-- Jobs
insert into jobs (id, client_id, name, type, status) values
  ('b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Mở bán dự án Q3', 'mở bán', 'dang_chay'),
  ('b2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Retainer tháng 8', 'retainer tháng', 'dang_chay'),
  ('b3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'Campaign Trung Thu', 'campaign', 'cho_duyet'),
  ('b4444444-4444-4444-4444-444444444444', 'c5555555-5555-5555-5555-555555555555', 'Bộ ảnh sản phẩm mới', 'campaign', 'dang_chay')
on conflict (id) do nothing;

-- Tasks (có chuỗi phụ thuộc quay -> content -> ads)
insert into tasks (id, client_id, title, assignee_id, kind, weight, deadline, depends_on_task_id, status) values
  ('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Quay clip dự án', '44444444-4444-4444-4444-444444444444', 'media', 3, current_date - 1, null, 'dang_lam'),
  ('a2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Viết content từ clip', '22222222-2222-2222-2222-222222222222', 'content', 2, current_date + 1, 'a1111111-1111-1111-1111-111111111111', 'ton'),
  ('a3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Chạy ads', '55555555-5555-5555-5555-555555555555', 'account', 2, current_date + 3, 'a2222222-2222-2222-2222-222222222222', 'ton'),
  ('a4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'Lịch content tuần', '22222222-2222-2222-2222-222222222222', 'content', 1, current_date, null, 'dang_lam'),
  ('a5555555-5555-5555-5555-555555555555', 'c4444444-4444-4444-4444-444444444444', 'Thiết kế poster Trung Thu', '33333333-3333-3333-3333-333333333333', 'design', 3, current_date + 2, null, 'dang_lam'),
  ('a6666666-6666-6666-6666-666666666666', 'c5555555-5555-5555-5555-555555555555', 'Chụp bộ ảnh sofa', '44444444-4444-4444-4444-444444444444', 'media', 2, current_date + 4, null, 'ton'),
  ('a7777777-7777-7777-7777-777777777777', 'c2222222-2222-2222-2222-222222222222', 'Duyệt bài tháng 7', '11111111-1111-1111-1111-111111111111', 'account', 1, current_date - 2, null, 'xong')
on conflict (id) do nothing;

