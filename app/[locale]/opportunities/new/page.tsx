import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NewOpportunityForm from "./NewOpportunityForm";

export default async function NewOpportunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

      <NewOpportunityForm locale={locale} />
    </div>
  );
}
