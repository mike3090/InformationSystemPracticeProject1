import { Geist } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Go Touch Grass | 地域ボランティアプラットフォーム",
  description: "Connecting volunteers with local community needs across small-town Japan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
