// Kiểu dữ liệu lõi — khớp với supabase/schema.sql

export type Permission = "manager" | "staff";

export type Presence =
  | "online"
  | "dang_content"
  | "di_quay"
  | "gap_khach"
  | "ban"
  | "offline";

export type JobStatus = "pitch" | "dang_chay" | "cho_duyet" | "done";
export type TaskStatus = "ton" | "dang_lam" | "cho_duyet" | "xong";
export type TaskKind = "content" | "design" | "media" | "account" | null;

// Định dạng sản phẩm bàn giao (poster / short video / …) — để mềm, đa ngành
export const TASK_FORMATS = [
  "Bài viết",
  "Poster",
  "Short video",
  "Reel",
  "Banner",
  "Album ảnh",
  "Video dài",
  "Landing page",
  "Khác",
] as const;

// Mức độ ưu tiên (thay cho "độ nặng" cũ)
export type Priority = "thap" | "trung_binh" | "cao";
export const PRIORITY_META: Record<Priority, { label: string; className: string; dot: string }> = {
  thap:       { label: "Thấp",       className: "bg-slate-500/15 text-slate-400 border-slate-500/25",  dot: "bg-slate-400" },
  trung_binh: { label: "Trung bình", className: "bg-amber-500/15 text-amber-400 border-amber-500/25",  dot: "bg-amber-400" },
  cao:        { label: "Cao",        className: "bg-red-500/15 text-red-400 border-red-500/25",        dot: "bg-red-400" },
};
export const PRIORITY_ORDER: Record<Priority, number> = { cao: 0, trung_binh: 1, thap: 2 };

export interface User {
  id: string;
  name: string;
  roles: string[];
  permission: Permission;
  presence: Presence;
  status_note: string | null;
  last_active_at: string;
}

export interface Client {
  id: string;
  name: string;
  account_id: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  tier: string | null;
  status: string | null;
  note: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  client_id: string;
  name: string;
  type: string | null;
  status: JobStatus;
  note: string | null;
  created_at: string;
}

// Brief có cấu trúc (M2). Mọi trường tuỳ chọn — giữ nguyên tắc "tạo task nhanh, brief điền sau".
export interface BriefData {
  objective?: string; // Mục tiêu
  audience?: string; // Đối tượng
  key_message?: string; // Thông điệp chính
  format?: string; // Định dạng (vd: 3 post + 1 reel)
  refs?: string[]; // Link tham khảo
}

export interface Task {
  id: string;
  client_id: string | null;
  job_id: string | null;
  title: string;
  assignee_id: string;
  kind: TaskKind;
  priority: Priority | null; // mức độ ưu tiên (thay cho weight)
  format?: string | null; // định dạng sản phẩm: poster / short video / …
  deadline: string; // date
  depends_on_task_id: string | null;
  status: TaskStatus;
  completed_at: string | null;
  brief: string | null; // ghi chú/tài liệu tự do (+ handoff)
  brief_data?: BriefData | null; // brief có cấu trúc (M2)
  approval_status: string | null;
  created_at: string;
}

// Nhãn hiển thị cho các trường brief có cấu trúc
export const BRIEF_FIELDS: { key: keyof Omit<BriefData, "refs">; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "objective", label: "Mục tiêu", placeholder: "Ví dụ: tăng nhận diện đợt mở bán" },
  { key: "audience", label: "Đối tượng", placeholder: "Ví dụ: khách 30–45t quan tâm đầu tư" },
  { key: "key_message", label: "Thông điệp chính", placeholder: "Ví dụ: an cư & sinh lời", multiline: true },
  { key: "format", label: "Định dạng", placeholder: "Ví dụ: 3 post + 1 reel" },
];

// Buổi trong ngày cho lịch làm việc
export type ScheduleSlot = "sang" | "chieu" | "ca_ngay";
export const SLOT_META: Record<
  ScheduleSlot,
  { label: string; short: string; icon: string; className: string; dot: string }
> = {
  sang:    { label: "Sáng",    short: "Sáng",    icon: "🌅", className: "bg-amber-500/15 text-amber-300 border-amber-500/30",   dot: "bg-amber-400" },
  chieu:   { label: "Chiều",   short: "Chiều",   icon: "🌇", className: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30", dot: "bg-indigo-400" },
  ca_ngay: { label: "Cả ngày", short: "Cả ngày", icon: "📌", className: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]", dot: "bg-slate-400" },
};

// Lịch làm việc — 1 note trên 1 ngày của 1 người (theo buổi)
export interface ScheduleEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  slot: ScheduleSlot;
  note: string;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[]; // user_id được @nhắc
  content_id?: string | null; // nếu là thread gắn vào 1 content (M3)
  created_at: string;
}

// ---- M3: Content artifact + pipeline duyệt ----
export type ApprovalStatus = "draft" | "noi_bo" | "gui_khach" | "khach_sua" | "khach_ok";

export interface Content {
  id: string;
  task_id: string;
  title: string;
  body: string; // markdown nhẹ
  version: number;
  approval_status: ApprovalStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Vòng duyệt NỘI BỘ (3 trạng thái). Tái dùng giá trị DB cũ để khỏi migrate:
//   draft = Nháp · noi_bo = Chờ duyệt · khach_ok = Đã duyệt · khach_sua = Cần sửa (nhánh)
// (gui_khach không dùng nữa — để lại meta cho dữ liệu cũ nếu có)
export const APPROVAL_FLOW: ApprovalStatus[] = ["draft", "noi_bo", "khach_ok"];

export const APPROVAL_META: Record<
  ApprovalStatus,
  { label: string; short: string; className: string; dot: string }
> = {
  draft:     { label: "Nháp",       short: "Nháp",       className: "bg-slate-500/15 text-slate-400 border-slate-500/25",     dot: "bg-slate-400" },
  noi_bo:    { label: "Chờ duyệt",  short: "Chờ duyệt",  className: "bg-blue-500/15 text-blue-400 border-blue-500/25",        dot: "bg-blue-400" },
  khach_sua: { label: "Cần sửa",    short: "Cần sửa",    className: "bg-amber-500/15 text-amber-400 border-amber-500/25",     dot: "bg-amber-400" },
  khach_ok:  { label: "Đã duyệt",   short: "Đã duyệt",   className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  gui_khach: { label: "Đã gửi khách", short: "Gửi khách", className: "bg-violet-500/15 text-violet-400 border-violet-500/25", dot: "bg-violet-400" },
};

// ---- Hằng số hiển thị ----

export const PRESENCE_META: Record<
  Presence,
  { label: string; color: string; dot: string }
> = {
  online: { label: "Online", color: "text-emerald-600", dot: "bg-emerald-500" },
  dang_content: { label: "Đang làm content", color: "text-blue-600", dot: "bg-blue-500" },
  di_quay: { label: "Đang đi quay", color: "text-amber-600", dot: "bg-amber-500" },
  gap_khach: { label: "Gặp khách / họp", color: "text-pink-600", dot: "bg-pink-500" },
  ban: { label: "Bận – đừng làm phiền", color: "text-red-600", dot: "bg-red-500" },
  offline: { label: "Offline", color: "text-slate-400", dot: "bg-slate-300" },
};

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; short: string }
> = {
  ton: { label: "Tồn", short: "Tồn" },
  dang_lam: { label: "Đang làm", short: "Đang làm" },
  cho_duyet: { label: "Chờ duyệt", short: "Chờ duyệt" },
  xong: { label: "Xong", short: "Xong" },
};

export const JOB_STATUS_META: Record<JobStatus, { label: string }> = {
  pitch: { label: "Pitch" },
  dang_chay: { label: "Đang chạy" },
  cho_duyet: { label: "Chờ duyệt" },
  done: { label: "Done" },
};

export const KIND_META: Record<string, { label: string; color: string }> = {
  content: { label: "Content", color: "bg-blue-100 text-blue-700" },
  design: { label: "Design", color: "bg-violet-100 text-violet-700" },
  media: { label: "Media", color: "bg-amber-100 text-amber-700" },
  account: { label: "Account", color: "bg-emerald-100 text-emerald-700" },
};
