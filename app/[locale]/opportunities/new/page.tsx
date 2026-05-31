import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MethodChoice from "@/components/MethodChoice";
import NewOpportunityForm from "./NewOpportunityForm";
import OpportunityBotForm from "./OpportunityBotForm";

export default async function NewOpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ method?: string }>;
}) {
  const { locale } = await params;
  const { method } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?intent=requester&callbackUrl=/${locale}/opportunities/new`,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      organization: { select: { profileCompleted: true } },
    },
  });

  if (!user) {
    redirect(`/${locale}/auth/signin?intent=requester`);
  }

  if (
    user.role !== "REQUESTER" &&
    user.role !== "BOTH" &&
    user.role !== "ADMIN"
  ) {
    redirect(`/${locale}/opportunities`);
  }

  if (!user.organization?.profileCompleted) {
    redirect(
      `/${locale}/profile/setup?intent=requester&next=/${locale}/opportunities/new`,
    );
  }

  const t = await getTranslations("opportunities.new");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {t("intro")}
          </p>
        </div>
      </div>

      {method !== "manual" && method !== "bot" ? (
        <MethodChoice
          title={locale === "ja" ? "作成方法を選択" : "Choose how to create"}
          body={
            locale === "ja"
              ? "通常フォームで作成するか、bot と会話しながら募集内容を整理できます。"
              : "Use the regular form, or let the bot guide you through the required task publishing fields."
          }
          manualHref={`/${locale}/opportunities/new?method=manual`}
          botHref={`/${locale}/opportunities/new?method=bot`}
          manualTitle={locale === "ja" ? "通常フォーム" : "Regular form"}
          manualBody={
            locale === "ja"
              ? "現在の作成フォームで詳細まで直接入力します。"
              : "Use the existing form, including the current AI drafting helper."
          }
          botTitle={locale === "ja" ? "bot を使う" : "Use bot"}
          botBody={
            locale === "ja"
              ? "必須項目を一つずつ会話形式で入力し、最後に確認します。"
              : "Answer guided questions, review, then save a draft or publish."
          }
        />
      ) : method === "bot" ? (
        <OpportunityBotForm locale={locale} />
      ) : (
        <NewOpportunityForm locale={locale} />
      )}
    </div>
  );
}
