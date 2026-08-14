-- =============================================================
-- Định dạng sản phẩm (poster / short video / …) cho task
-- An toàn/idempotent. Code tự-lành nếu chưa chạy.
-- =============================================================

alter table tasks add column if not exists format text;
