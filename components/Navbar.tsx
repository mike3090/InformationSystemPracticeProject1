"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const pathname = usePathname();

  const other = locale === "ja" ? "en" : "ja";
  const otherPath = pathname.replace(`/${locale}`, `/${other}`);

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
        <Link href={`/${locale}`} className="font-bold text-green-700 text-lg tracking-tight">
          🌿 Go Touch Grass
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-stone-600">
          <Link href={`/${locale}/opportunities`} className="hover:text-green-700 transition">
            {t("opportunities")}
          </Link>
          <Link href={`/${locale}/experiences`} className="hover:text-green-700 transition">
            {locale === "en" ? "Experiences" : "経験シェア"}
          </Link>
          {session && (
            <>
              <Link href={`/${locale}/dashboard`} className="hover:text-green-700 transition">
                {t("dashboard")}
              </Link>
              <Link href={`/${locale}/my-events`} className="hover:text-green-700 transition">
                {locale === "en" ? "My Events" : "My Events"}
              </Link>
              <Link href={`/${locale}/profile`} className="hover:text-green-700 transition">
                {t("profile")}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {/* Locale switcher */}
          <Link
            href={otherPath}
            className="text-xs text-stone-500 border border-stone-200 rounded px-2 py-0.5 hover:border-green-500 transition"
          >
            {other === "ja" ? "日本語" : "EN"}
          </Link>

          {session ? (
            <>
              <Link
                href={`/${locale}/opportunities/new`}
                className="bg-green-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 transition"
              >
                {t("postOpportunity")}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
                className="text-stone-500 hover:text-red-600 transition"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <Link
              href={`/${locale}/auth/signin`}
              className="bg-green-700 text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600 transition"
            >
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
