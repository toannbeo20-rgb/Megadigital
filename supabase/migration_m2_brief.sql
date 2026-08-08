-- =============================================================
-- M2 — Brief có cấu trúc
-- Thêm cột brief_data (jsonb) vào tasks. Chạy trên Supabase SQL Editor.
-- An toàn/idempotent. Code đã tự-lành nếu chưa chạy (lưu task không kèm brief_data).
-- =============================================================

alter table tasks add column if not exists brief_data jsonb;
