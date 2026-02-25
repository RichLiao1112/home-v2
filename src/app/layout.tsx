import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home - Personal Dashboard",
  description: "A modern personal navigation dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
