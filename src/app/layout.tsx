import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/shell/BottomNav";
import SideNav from "@/components/shell/SideNav";
import TopBar from "@/components/shell/TopBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hajri",
  description: "Attendance and payroll",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <SideNav />
        <div className="md:pl-[240px]">
          <TopBar />
          <main className="px-4">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
