import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Home - Personal Dashboard",
  description: "A modern personal navigation dashboard",
  manifest: "/manifest.webmanifest",
  themeColor: "#020617",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Home",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
