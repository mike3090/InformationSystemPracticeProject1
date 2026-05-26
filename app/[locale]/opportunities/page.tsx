import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OpportunityDiscovery, { type DiscoveryOpportunity, type EffortLevel } from "./OpportunityDiscovery";

// ── Opportunity query ──────────────────────────────────────────────────────────

type RawOpportunity = {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  skills: string[];
  city: string | null;
  prefecture: string | null;
  environmentShape: string | null;
  shortDescription: string | null;
  description: string;
  coverImageUrl: string | null;
  startAt: Date | null;
  endAt: Date | null;
  volunteersNeeded: number;
  physicalEffort: string;
  mentalEffort: string;
  organization: { name: string; certificationStatus: string } | null;
  requester: { name: string | null };
  _count: { applications: number };
};

async function getOpenOpportunities(): Promise<RawOpportunity[]> {
  return prisma.opportunity.findMany({
    where: { status: "OPEN", startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
    take: 50,
    select: {
      id: true,
      title: true,
      category: true,
      tags: true,
      skills: true,
      city: true,
      prefecture: true,
      environmentShape: true,
      shortDescription: true,
      description: true,
      coverImageUrl: true,
      startAt: true,
      endAt: true,
      volunteersNeeded: true,
      physicalEffort: true,
      mentalEffort: true,
      organization: { select: { name: true, certificationStatus: true } },
      requester: { select: { name: true } },
      _count: { select: { applications: { where: { status: "ACCEPTED" } } } },
    },
  }) as Promise<RawOpportunity[]>;
}

// ── Jaccard-based match scoring ────────────────────────────────────────────────
//
// Computes a 0–100 score for each opportunity against the volunteer's profile.
// This runs server-side at page load — no AI call needed.
//
// Breakdown (max 100):
//   35 pts — skills overlap (Jaccard)
//   25 pts — interests vs. opportunity tags (Jaccard)
//   20 pts — preferred task types vs. category + tags (Jaccard)
//   10 pts — environment style exact match
//   10 pts — location (city = 10, prefecture = 5)

type VolunteerProfile = {
  skills: string[];
  interests: string[];
  preferredTaskTypes: string[];
  preferredEnvironmentStyle: string | null;
  city: string | null;
  prefecture: string | null;
};

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function computeMatchScore(opp: RawOpportunity, profile: VolunteerProfile): number {
  const skillScore = jaccard(profile.skills, opp.skills) * 35;
  const interestScore = jaccard(profile.interests, opp.tags) * 25;
  const taskBucket = [opp.category ?? "", ...opp.tags];
  const taskScore = jaccard(profile.preferredTaskTypes, taskBucket) * 20;
  const envScore =
    profile.preferredEnvironmentStyle &&
    opp.environmentShape &&
    profile.preferredEnvironmentStyle.toLowerCase() === opp.environmentShape.toLowerCase()
      ? 10
      : 0;
  const locScore =
    profile.city &&
    opp.city &&
    profile.city.toLowerCase() === opp.city.toLowerCase()
      ? 10
      : profile.prefecture &&
          opp.prefecture &&
          profile.prefecture.toLowerCase() === opp.prefecture.toLowerCase()
        ? 5
        : 0;

  return Math.round(skillScore + interestScore + taskScore + envScore + locScore);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function OpportunitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("opportunities");

  // Fetch opportunities and (optionally) the volunteer profile in parallel
  const session = await auth();
  const [rawOpps, profile] = await Promise.all([
    getOpenOpportunities(),
    session?.user?.id
      ? prisma.volunteerProfile.findUnique({
          where: { userId: session.user.id },
          select: {
            skills: true,
            interests: true,
            preferredTaskTypes: true,
            preferredEnvironmentStyle: true,
            city: true,
            prefecture: true,
          },
        })
      : Promise.resolve(null),
  ]);

  // Build DiscoveryOpportunity objects, attaching match scores when possible
  const hasProfile =
    profile !== null &&
    (profile.skills.length > 0 ||
      profile.interests.length > 0 ||
      profile.preferredTaskTypes.length > 0);

  const opportunities: DiscoveryOpportunity[] = rawOpps
    .map((row) => {
      const matchScore = hasProfile ? computeMatchScore(row, profile!) : undefined;
      return {
        id: row.id,
        title: row.title,
        organizerName:
          row.organization?.name ?? row.requester.name ?? "Unknown organizer",
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
        matchScore,
      };
    });

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

      <OpportunityDiscovery
        locale={locale}
        opportunities={opportunities}
        hasVolunteerProfile={hasProfile}
      />
    </div>
  );
}
