import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

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
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <div className="min-h-screen flex flex-col">
          <Navbar locale={locale} />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
            © {new Date().getFullYear()} Go Touch Grass
          </footer>
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}
