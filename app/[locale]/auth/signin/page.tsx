import { getTranslations } from "next-intl/server";
import SignInForm from "@/components/SignInForm";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; intent?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl, intent } = await searchParams;
  const t = await getTranslations("auth");
  const safeCallbackUrl =
    callbackUrl?.startsWith(`/${locale}/`) || callbackUrl === `/${locale}`
      ? callbackUrl
      : `/${locale}/opportunities`;
  const accountIntent =
    intent === "requester" || safeCallbackUrl.includes("/opportunities/new")
      ? "requester"
      : "volunteer";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">
          {accountIntent === "requester"
            ? t("requesterSignInTitle")
            : t("volunteerSignInTitle")}
        </h1>
        <p className="text-stone-500 text-sm text-center mb-8">
          {accountIntent === "requester"
            ? t("requesterSignInIntro")
            : t("volunteerSignInIntro")}
        </p>
        <SignInForm
          locale={locale}
          callbackUrl={safeCallbackUrl}
          accountIntent={accountIntent}
        />
      </div>
    </div>
  );
}
