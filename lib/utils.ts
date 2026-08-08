import type { Task } from "./types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// Số ngày lệch so với hôm nay (âm = quá hạn)
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function deadlineLabel(dateStr: string): { text: string; tone: "danger" | "warn" | "muted" } {
  const n = daysUntil(dateStr);
  if (n < 0) return { text: `Quá hạn ${Math.abs(n)} ngày`, tone: "danger" };
  if (n === 0) return { text: "Hôm nay", tone: "warn" };
  if (n === 1) return { text: "Ngày mai", tone: "warn" };
  if (n <= 3) return { text: `Còn ${n} ngày`, tone: "warn" };
  return { text: `Còn ${n} ngày`, tone: "muted" };
}

export function isOverdue(t: Task): boolean {
  return t.status !== "xong" && daysUntil(t.deadline) < 0;
}

export function isDueSoon(t: Task): boolean {
  const n = daysUntil(t.deadline);
  return t.status !== "xong" && n >= 0 && n <= 2;
}

// Tải của một người: số task đang mở + tổng độ nặng (mục 6.3)
export function workloadOf(tasks: Task[], userId: string) {
  const open = tasks.filter((t) => t.assignee_id === userId && t.status !== "xong");
  const weight = open.reduce((s, t) => s + t.weight, 0);
  const clients = new Set(open.map((t) => t.client_id).filter(Boolean)).size;
  return { openCount: open.length, weight, clientCount: clients };
}

// Mức tải → nhãn màu (để cảnh báo "ai đang quá tải" — nỗi đau #1)
export function loadLevel(weight: number): { label: string; tone: "ok" | "warn" | "danger" } {
  if (weight >= 7) return { label: "Quá tải", tone: "danger" };
  if (weight >= 4) return { label: "Đang bận", tone: "warn" };
  return { label: "Thoải mái", tone: "ok" };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "vừa xong";
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}
