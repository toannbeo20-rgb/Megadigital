-- =============================================================
-- Bước 1 — Mức độ ưu tiên (thay cho "độ nặng")
-- Thêm cột priority. An toàn/idempotent. Code tự-lành nếu chưa chạy.
-- Giá trị: thap | trung_binh | cao
-- =============================================================

alter table tasks add column if not exists priority text;

-- Backfill từ weight cũ (nếu còn): 1→thap, 2→trung_binh, 3→cao
update tasks set priority = case
  when weight >= 3 then 'cao'
  when weight = 2 then 'trung_binh'
  else 'thap'
end
where priority is null and weight is not null;
