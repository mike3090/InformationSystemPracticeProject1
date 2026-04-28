import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import type { Metadata } from "next";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Go Touch Grass | 地域ボランティアプラットフォーム",
  description: "Connecting volunteers with local community needs across small-town Japan.",
};

const locales = ["ja", "en"] as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Navbar locale={locale} />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
              © {new Date().getFullYear()} Go Touch Grass
            </footer>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
