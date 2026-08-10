// Dữ liệu mẫu để app CHẠY NGAY khi chưa cấu hình Supabase.
// Khớp với supabase/seed.sql. Khi có env Supabase, lớp data sẽ tự dùng DB thật.

import type { Client, Job, Task, User } from "./types";

const today = new Date();
function d(offset: number): string {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
}

export const mockUsers: User[] = [
  { id: "u1", name: "Minh (Account Lead)", roles: ["account", "content leader"], permission: "manager", presence: "online", status_note: null, last_active_at: new Date().toISOString() },
  { id: "u2", name: "Lan (Content)", roles: ["content"], permission: "staff", presence: "dang_content", status_note: "Viết bài spa, xong lúc 4h", last_active_at: new Date().toISOString() },
  { id: "u3", name: "Huy (Designer)", roles: ["designer"], permission: "staff", presence: "online", status_note: null, last_active_at: new Date().toISOString() },
  { id: "u4", name: "Trang (Media)", roles: ["media"], permission: "staff", presence: "di_quay", status_note: "Ở BĐS Hoàng Gia, về 3h", last_active_at: new Date(Date.now() - 3600e3).toISOString() },
  { id: "u5", name: "Phong (Account)", roles: ["account"], permission: "staff", presence: "gap_khach", status_note: "Họp homestay", last_active_at: new Date().toISOString() },
];

export const mockClients: Client[] = [
  { id: "c1", name: "BĐS Hoàng Gia", account_id: "u1", note: "Phân phối bất động sản", contact_person: null, phone: null, email: null, industry: null, tier: null, status: "active", created_at: "" },
  { id: "c2", name: "Homestay Đà Lạt", account_id: "u5", note: "Lưu trú", contact_person: null, phone: null, email: null, industry: null, tier: null, status: "active", created_at: "" },
  { id: "c3", name: "Điện thoại TechOne", account_id: "u1", note: "Bán lẻ điện thoại", contact_person: null, phone: null, email: null, industry: null, tier: null, status: "active", created_at: "" },
  { id: "c4", name: "Spa Dưỡng Sinh An", account_id: "u5", note: "Spa dưỡng sinh", contact_person: null, phone: null, email: null, industry: null, tier: null, status: "active", created_at: "" },
  { id: "c5", name: "Nội thất Mộc", account_id: "u1", note: "Nội thất", contact_person: null, phone: null, email: null, industry: null, tier: null, status: "active", created_at: "" },
  { id: "c6", name: "Quản lý Tài sản VP", account_id: "u5", note: "Cho thuê & quản lý", contact_person: null, phone: null, email: null, industry: null, tier: null, status: "active", created_at: "" },
];

export const mockJobs: Job[] = [
  { id: "j1", client_id: "c1", name: "Mở bán dự án Q3", type: "mở bán", status: "dang_chay", note: null, created_at: "" },
  { id: "j2", client_id: "c2", name: "Retainer tháng 8", type: "retainer tháng", status: "dang_chay", note: null, created_at: "" },
  { id: "j3", client_id: "c4", name: "Campaign Trung Thu", type: "campaign", status: "cho_duyet", note: null, created_at: "" },
  { id: "j4", client_id: "c5", name: "Bộ ảnh sản phẩm mới", type: "campaign", status: "dang_chay", note: null, created_at: "" },
];

export const mockTasks: Task[] = [
  { id: "t1", client_id: null, job_id: "j1", title: "Lên plan quay T5", assignee_id: "u3", kind: "media", priority: "trung_binh", deadline: "2024-05-10", depends_on_task_id: null, status: "dang_lam", completed_at: null, brief: null, approval_status: null, created_at: "2024-05-01T08:00:00Z" },
  { id: "t2", client_id: null, job_id: "j1", title: "Viết kịch bản KOL", assignee_id: "u2", kind: "content", priority: "cao", deadline: "2024-05-12", depends_on_task_id: "t1", status: "ton", completed_at: null, brief: null, approval_status: null, created_at: "2024-05-01T08:05:00Z" },
  { id: "t3", client_id: null, job_id: "j2", title: "Chốt báo giá event", assignee_id: "u1", kind: "account", priority: "thap", deadline: "2024-05-08", depends_on_task_id: "t4", status: "ton", completed_at: null, brief: null, approval_status: null, created_at: "2024-05-02T09:00:00Z" },
  { id: "t4", client_id: null, job_id: "j2", title: "Lên concept sân khấu", assignee_id: "u2", kind: "content", priority: "trung_binh", deadline: "2024-05-07", depends_on_task_id: null, status: "dang_lam", completed_at: null, brief: null, approval_status: null, created_at: "2024-05-02T10:00:00Z" },
  { id: "t5", client_id: null, job_id: "j2", title: "Thiết kế backdrop", assignee_id: "u4", kind: "design", priority: "trung_binh", deadline: "2024-05-11", depends_on_task_id: null, status: "dang_lam", completed_at: null, brief: null, approval_status: null, created_at: "2024-05-03T08:00:00Z" },
  { id: "t6", client_id: null, job_id: "j3", title: "Booking KOL", assignee_id: "u3", kind: "media", priority: "trung_binh", deadline: "2024-05-15", depends_on_task_id: null, status: "ton", completed_at: null, brief: null, approval_status: null, created_at: "2024-05-04T08:00:00Z" },
  { id: "t7", client_id: null, job_id: "j1", title: "Tạo group zalo khách", assignee_id: "u1", kind: "account", priority: "thap", deadline: "2024-05-02", depends_on_task_id: null, status: "xong", completed_at: "2024-05-02T15:00:00Z", brief: null, approval_status: null, created_at: "2024-05-01T07:00:00Z" },
];
