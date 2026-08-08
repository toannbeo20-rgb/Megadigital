"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui";
import {
  IconToday, IconBoard, IconPeople, IconClients, IconPlus,
} from "./icons";
import NotificationBell from "./NotificationBell";
import QuickAddTask from "./QuickAddTask";
import UserSwitcher from "./UserSwitcher";

const NAV = [
  { href: "/", label: "Hôm nay", Icon: IconToday },
  { href: "/cong-viec", label: "Công việc", Icon: IconBoard },
  { href: "/nhan-su", label: "Nhân sự", Icon: IconPeople },
  { href: "/khach", label: "Khách", Icon: IconClients },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useStore();
  const [addOpen, setAddOpen] = useState(false);

  const navItems = [
    ...NAV,
    ...(currentUser.permission === "manager" ? [{ href: "/duyet", label: "Duyệt nhanh", Icon: IconBoard }] : []),
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-dvh md:flex">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-4 py-6 md:flex">
        {/* Logo Mega Digital */}
        <div className="mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{ background: '#000', border: '1px solid rgba(170,237,42,0.3)', boxShadow: '0 0 12px rgba(170,237,42,0.2)' }}>
              <Image
                src="/logo.jpg"
                alt="Mega Digital"
                width={40}
                height={40}
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wider"
                style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>Mega Digital</div>
              <div className="text-xs text-[var(--text-faint)]">Quản lý công việc</div>
            </div>
          </div>
          {/* Accent divider */}
          <div className="mt-5 h-px" style={{ background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)', opacity: 0.4 }} />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] hover:translate-x-0.5"
                )}
              >
                {/* Active indicator bar */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full"
                    style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent)" }}
                  />
                )}
                <Icon width={20} height={20} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setAddOpen(true)}
          className="btn-accent mb-4 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[var(--shadow-md)]"
        >
          <IconPlus width={18} height={18} /> Tạo task
        </button>

        <UserSwitcher />
      </aside>

      {/* ===== Main ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg"
              style={{ border: '1px solid rgba(170,237,42,0.35)', boxShadow: '0 0 8px rgba(170,237,42,0.2)' }}>
              <Image src="/logo.jpg" alt="Mega Digital" width={32} height={32} className="object-cover" />
            </div>
            <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Mega Digital</span>
          </div>
          <div className="hidden text-sm text-[var(--text-muted)] md:block">
            Xin chào, <span className="font-semibold text-[var(--text)]">{currentUser.name.replace(/\(.*?\)/g, "").trim()}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* ===== Bottom nav (mobile) ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {navItems.slice(0, 2).map(({ href, label, Icon }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
        ))}
        {/* Nút tạo task nổi ở giữa */}
        <button
          onClick={() => setAddOpen(true)}
          className="btn-accent animate-pulse-glow -mt-6 flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--shadow-lg)] active:scale-90 transition-transform"
          aria-label="Tạo task"
        >
          <IconPlus />
        </button>
        {navItems.slice(2, 4).map(({ href, label, Icon }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
        ))}
      </nav>

      {addOpen && <QuickAddTask onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: typeof IconToday; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-all duration-150",
        active ? "text-[var(--accent)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
      )}
    >
      <span className={cn("transition-transform duration-150", active && "scale-110")}>
        <Icon width={22} height={22} />
      </span>
      {label}
      {/* Active dot */}
      <span
        className={cn(
          "h-1 w-1 rounded-full transition-all duration-200",
          active ? "bg-[var(--accent)] opacity-100" : "opacity-0"
        )}
        style={active ? { boxShadow: "0 0 6px var(--accent)" } : undefined}
      />
    </Link>
  );
}
