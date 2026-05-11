import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function NewOpportunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?intent=requester&callbackUrl=/${locale}/opportunities/new`
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
    redirect(
      `/${locale}/profile/setup?intent=requester&next=/${locale}/opportunities/new`
    );
  }

  if (!user.organization?.profileCompleted) {
    redirect(
      `/${locale}/profile/setup?intent=requester&next=/${locale}/opportunities/new`
    );
  }

  const t = await getTranslations("opportunities.new");

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-stone-600">{t("intro")}</p>

      <form className="mt-8 space-y-5 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {t("fields.title")}
          </span>
          <input
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t("placeholders.title")}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {t("fields.description")}
          </span>
          <textarea
            rows={5}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder={t("placeholders.description")}
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              {t("fields.location")}
            </span>
            <input className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              {t("fields.volunteersNeeded")}
            </span>
            <input
              type="number"
              min="1"
              defaultValue="1"
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        </div>

        <button
          type="button"
          className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
        >
          {t("saveDraft")}
        </button>
      </form>
    </div>
  );
}
