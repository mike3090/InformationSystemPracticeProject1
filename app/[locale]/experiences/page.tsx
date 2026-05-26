import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getDemoExperiences,
  type ExperienceView,
} from "@/lib/experienceDemo";
import { ExperienceLikeButton } from "./ExperienceLikeButton";
import ExperienceRecommendations, {
  type RecommendationOpportunity,
} from "./ExperienceRecommendations";

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const [savedExperiences, recommendationOpportunities] = await Promise.all([
    getExperiences(),
    getRecommendationOpportunities(),
  ]);
  const experiences =
    savedExperiences.length > 0 ? savedExperiences : getDemoExperiences(locale);
  const isDemoFeed = savedExperiences.length === 0;
  const copy = locale === "en" ? englishCopy : japaneseCopy;

  return (
    <main className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {copy.intro}
            </p>
          </div>
          <Link
            href={
              session?.user
                ? `/${locale}/experiences/new`
                : `/${locale}/auth/signin?callbackUrl=/${locale}/experiences/new`
            }
            className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            {copy.share}
          </Link>
        </div>

        {isDemoFeed && (
          <section className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium leading-6 text-rose-900">
              {copy.demoNotice}
            </p>
          </section>
        )}

        <ExperienceRecommendations locale={locale} opportunities={recommendationOpportunities} />

        <section className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {experiences.map((experience) => (
            <article
              key={experience.id}
              className="mb-5 break-inside-avoid overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
            >
              <Link
                href={`/${locale}/experiences/${experience.id}`}
                aria-label={`${copy.readExperience}: ${experience.title}`}
              >
                {experience.imageUrl ? (
                  <div
                    className="aspect-[4/5] w-full bg-stone-100 bg-cover bg-center transition hover:opacity-90"
                    style={{ backgroundImage: `url(${experience.imageUrl})` }}
                    aria-label={experience.title}
                    role="img"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-rose-100 via-amber-50 to-green-100 px-6 text-center text-sm font-semibold text-stone-600 transition hover:opacity-90">
                    {experience.opportunityTitle}
                  </div>
                )}
              </Link>

              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  {experience.authorImage ? (
                    <span
                      className="h-7 w-7 rounded-full bg-stone-200 bg-cover bg-center"
                      style={{ backgroundImage: `url(${experience.authorImage})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 font-bold text-stone-600">
                      {(experience.authorName ?? "V").slice(0, 1)}
                    </span>
                  )}
                  <span>{experience.authorName ?? copy.anonymous}</span>
                  <span>|</span>
                  <time dateTime={experience.createdAt.toISOString()}>
                    {formatDate(experience.createdAt, locale)}
                  </time>
                </div>
                <div className="mt-3">
                  <ExperienceLikeButton
                    locale={locale}
                    experience={{
                      id: experience.id,
                      title: experience.title,
                      tags: experience.tags,
                      opportunityId: experience.opportunityId,
                    }}
                  />
                </div>

                <Link href={`/${locale}/experiences/${experience.id}`}>
                  <h2 className="mt-3 text-lg font-bold leading-snug text-stone-950 hover:text-green-700">
                    {experience.title}
                  </h2>
                </Link>
                <p className="mt-2 line-clamp-5 text-sm leading-6 text-stone-700">
                  {experience.body}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {experience.rating && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {copy.ratingPrefix} {experience.rating}/5
                    </span>
                  )}
                  {experience.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/${locale}/experiences/${experience.id}`}
                  className="mt-4 block rounded-lg border border-green-700 px-3 py-2 text-center text-sm font-semibold text-green-700 hover:bg-green-50"
                >
                  {copy.readExperience}
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

async function getRecommendationOpportunities(): Promise<RecommendationOpportunity[]> {
  try {
    return await prisma.$queryRaw<RecommendationOpportunity[]>`
      SELECT
        o."id",
        o."title",
        o."category",
        o."city",
        o."prefecture",
        o."shortDescription",
        o."description",
        o."tags",
        o."coverImageUrl"
      FROM "Opportunity" o
      WHERE o."status" = 'OPEN'::"OpportunityStatus"
        AND o."startsAt" > NOW()
      ORDER BY o."startsAt" ASC
      LIMIT 50
    `;
  } catch {
    return [];
  }
}

async function getExperiences() {
  try {
    return await prisma.$queryRaw<ExperienceView[]>`
      SELECT
        s."id",
        s."title",
        s."body",
        s."imageUrl",
        s."tags",
        s."rating",
        s."createdAt",
        u."name" AS "authorName",
        u."image" AS "authorImage",
        o."id" AS "opportunityId",
        o."title" AS "opportunityTitle",
        o."city" AS "opportunityCity",
        o."prefecture" AS "opportunityPrefecture"
      FROM "ExperienceShare" s
      INNER JOIN "User" u ON u."id" = s."authorId"
      INNER JOIN "Opportunity" o ON o."id" = s."opportunityId"
      WHERE s."isPublished" = true
      ORDER BY s."createdAt" DESC
      LIMIT 60
    `;
  } catch {
    return [];
  }
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ja", {
    month: "short",
    day: "numeric",
  }).format(date);
}

const englishCopy = {
  eyebrow: "Volunteer notes",
  title: "Experience Feed",
  intro:
    "Browse real reflections from people who joined local activities, then open the experience details before visiting the related opportunity.",
  share: "Share an experience",
  demoNotice:
    "Demo mode: no real experience posts have been published yet, so these sample cards show how the feature will look.",
  anonymous: "Volunteer",
  ratingPrefix: "Rating",
  readExperience: "Read experience",
};

const japaneseCopy = {
  eyebrow: "体験ノート",
  title: "経験シェア",
  intro:
    "参加した人のリアルな感想を読み、詳細ページから関連する活動へ移動できます。",
  share: "経験を投稿する",
  demoNotice:
    "Demo mode: まだ実際の投稿がないため、表示イメージ用のサンプル投稿を表示しています。",
  anonymous: "ボランティア",
  ratingPrefix: "満足度",
  readExperience: "経験を読む",
};
