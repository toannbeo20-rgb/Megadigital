import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import PWAProvider from "@/components/PWAProvider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mega Digital — Quản lý công việc",
  description: "App nội bộ quản lý job & task cho team Mega Digital Agency",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mega Digital",
  },
};

export const viewport: Viewport = {
  themeColor: "#AAED2A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <StoreProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
