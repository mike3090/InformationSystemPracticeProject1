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
        <SignInForm
          locale={locale}
          callbackUrl={safeCallbackUrl}
          accountIntent={accountIntent}
        />
      </div>
    </div>
  );
}
