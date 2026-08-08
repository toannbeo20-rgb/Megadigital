"use client";

import type { ReactNode } from "react";
import type { Presence, User } from "@/lib/types";
import { PRESENCE_META } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---- Avatar (initials + presence dot) ----
const AVATAR_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-sky-500", "bg-violet-500", "bg-rose-500",
];

export function Avatar({ user, size = 36 }: { user: User; size?: number }) {
  const initials = user.name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(" ")
    .slice(0, 1)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const color = AVATAR_COLORS[hash(user.id) % AVATAR_COLORS.length];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full font-semibold text-white ring-2 ring-[var(--surface)] transition-transform hover:scale-105",
          color
        )}
        style={{ fontSize: size * 0.4 }}
      >
        {initials}
      </div>
      <PresenceDot
        presence={user.presence}
        className="absolute -bottom-0.5 -right-0.5 ring-2 ring-[var(--surface)]"
      />
    </div>
  );
}

export function PresenceDot({
  presence,
  className,
}: {
  presence: Presence;
  className?: string;
}) {
  const isOnline = presence === "online";
  return (
    <span className={cn("relative block h-3 w-3 rounded-full", PRESENCE_META[presence].dot, className)}>
      {isOnline && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: "inherit", opacity: 0.4 }}
        />
      )}
    </span>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ---- Badge ----
export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

// ---- Section header ----
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--text)] md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
        {/* Accent underline */}
        <div
          className="mt-3 h-0.5 w-10 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }}
        />
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---- Empty state ----
const EMPTY_ICONS: Record<string, string> = {
  default: "📭",
  tasks: "✅",
  clients: "🏢",
  people: "👥",
  jobs: "💼",
};

export function EmptyState({
  icon,
  iconKey,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  iconKey?: keyof typeof EMPTY_ICONS;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  const emoji = iconKey ? EMPTY_ICONS[iconKey] : EMPTY_ICONS.default;

  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
      {icon ? (
        <div className="mb-4 text-[var(--text-faint)]">{icon}</div>
      ) : (
        <div className="mb-4 animate-float text-5xl leading-none select-none">{emoji}</div>
      )}
      <p className="font-semibold text-[var(--text)]">{title}</p>
      {hint && (
        <p className="mt-1.5 max-w-xs text-sm text-[var(--text-faint)]">{hint}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
