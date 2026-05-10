import { getTranslations } from "next-intl/server";
import SignInForm from "@/components/SignInForm";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  const t = await getTranslations("auth");
  const safeCallbackUrl =
    callbackUrl?.startsWith(`/${locale}/`) || callbackUrl === `/${locale}`
      ? callbackUrl
      : `/${locale}/opportunities`;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">{t("signInTitle")}</h1>
        <p className="text-stone-500 text-sm text-center mb-8">{t("noAccount")}</p>
        <SignInForm locale={locale} callbackUrl={safeCallbackUrl} />
      </div>
    </div>
  );
}
