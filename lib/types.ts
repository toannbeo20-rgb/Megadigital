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
  weight: number; // 1-3
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

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[]; // user_id được @nhắc
  created_at: string;
}

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
