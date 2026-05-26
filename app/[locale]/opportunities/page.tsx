import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import OpportunityDiscovery, { type DiscoveryOpportunity, type EffortLevel } from "./OpportunityDiscovery";

async function getOpenOpportunities(): Promise<DiscoveryOpportunity[]> {
  const rows = await prisma.opportunity.findMany({
    where: { status: "OPEN", startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
    take: 50,
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      city: true,
      prefecture: true,
      shortDescription: true,
      description: true,
      coverImageUrl: true,
      startAt: true,
      endAt: true,
      volunteersNeeded: true,
      physicalEffort: true,
      mentalEffort: true,
      aiDrafted: true,
      organization: { select: { name: true, certificationStatus: true } },
      requester: { select: { name: true } },
      _count: { select: { applications: { where: { status: "ACCEPTED" } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    organizerName: row.organization?.name ?? row.requester.name ?? "Unknown organizer",
    trustedOrganizer: row.organization?.certificationStatus === "certified",
    category: row.category ?? "",
    city: row.city ?? "",
    prefecture: row.prefecture ?? "",
    shortDescription: row.shortDescription ?? "",
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    startsAt: row.startAt?.toISOString() ?? "",
    endsAt: row.endAt?.toISOString() ?? "",
    volunteersNeeded: row.volunteersNeeded,
    spotsRemaining: Math.max(0, row.volunteersNeeded - row._count.applications),
    tags: row.tags,
    physicalEffort: (row.physicalEffort as EffortLevel) ?? "medium",
    mentalEffort: (row.mentalEffort as EffortLevel) ?? "medium",
  }));
}

export default async function OpportunitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("opportunities");
  const opportunities = await getOpenOpportunities();

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

      <OpportunityDiscovery locale={locale} opportunities={opportunities} />
    </div>
  );
}
