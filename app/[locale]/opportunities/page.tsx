import { getTranslations } from "next-intl/server";
import Link from "next/link";
import OpportunityDiscovery from "./OpportunityDiscovery";
import { mockOpportunities } from "@/lib/mockOpportunities";

export default async function OpportunitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("opportunities");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            {t("intro")}
          </p>
        </div>
        <Link
          href={`/${locale}/auth/signin?intent=volunteer&callbackUrl=/${locale}/opportunities`}
          className="inline-flex items-center justify-center rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          {t("joinAsVolunteer")}
        </Link>
      </div>

      <OpportunityDiscovery locale={locale} opportunities={mockOpportunities} />
    </div>
  );
}
