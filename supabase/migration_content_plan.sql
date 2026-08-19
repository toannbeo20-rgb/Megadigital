-- =============================================================
-- Content Plan — thêm trường kế hoạch nội dung vào tasks
-- Kênh · Phễu (tofu/mofu/bofu) · Ngày đăng · Đã đăng
-- An toàn/idempotent. Code tự-lành nếu chưa chạy.
-- =============================================================

alter table tasks add column if not exists channel      text;      -- Facebook / Instagram / ...
alter table tasks add column if not exists funnel       text;      -- tofu | mofu | bofu
alter table tasks add column if not exists publish_date date;      -- ngày dự kiến đăng
alter table tasks add column if not exists published_at timestamptz; -- thời điểm đã đăng thật
