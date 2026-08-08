import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

// Layout cho các trang chính — có AppShell (sidebar + bottom nav)
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
