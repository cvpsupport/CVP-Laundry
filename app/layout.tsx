import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CVP Laundry | สถานะเครื่องซักผ้า",
  description: "ดูสถานะ เวลาที่เหลือ และรับแจ้งเตือนเครื่องซัก 3 เครื่องและเครื่องอบ 1 เครื่องแบบเรียลไทม์",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
