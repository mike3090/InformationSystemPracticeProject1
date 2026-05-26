import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  getDemoExperiences,
  type ExperienceView,
} from "@/lib/experienceDemo";
import { ExperienceLikeButton } from "../ExperienceLikeButton";
import InlineTranslate from "@/components/InlineTranslate";

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const copy = locale === "en" ? englishCopy : japaneseCopy;
  const experience = (await getExperience(id)) ?? getDemoExperience(locale, id);

  if (!experience) {
    notFound();
  }

  return (
    <main className="bg-stone-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1fr_22rem]">
        <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          {experience.imageUrl && (
            <div
              className="aspect-[16/10] w-full bg-stone-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${experience.imageUrl})` }}
              aria-label={experience.title}
              role="img"
            />
          )}

          <div className="p-6">
            <Link
              href={`/${locale}/experiences`}
              className="text-sm font-semibold text-green-700 hover:text-green-600"
            >
              {copy.back}
            </Link>

            <div className="mt-5 flex items-center gap-2 text-sm text-stone-500">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 font-bold text-stone-600">
                {(experience.authorName ?? "V").slice(0, 1)}
              </span>
              <span>{experience.authorName ?? copy.anonymous}</span>
              <span>|</span>
              <time dateTime={experience.createdAt.toISOString()}>
                {formatDate(experience.createdAt, locale)}
              </time>
            </div>

            <div className="mt-4">
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

            <h1 className="mt-4 text-3xl font-bold leading-tight text-stone-950">
              {experience.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              {experience.rating && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {copy.ratingPrefix} {experience.rating}/5
                </span>
              )}
              {experience.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <InlineTranslate
              text={experience.body}
              targetLocale={locale as "ja" | "en"}
              locale={locale}
              context="Personal reflection written by a volunteer after attending a community event in Japan"
              textClassName="mt-6 whitespace-pre-line text-base leading-8 text-stone-700"
            />
          </div>
        </article>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
            {copy.related}
          </p>
          <h2 className="mt-2 text-xl font-bold text-stone-950">
            {experience.opportunityTitle}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            {[experience.opportunityCity, experience.opportunityPrefecture]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            {copy.relatedIntro}
          </p>
          <Link
            href={`/${locale}/opportunities/${experience.opportunityId}`}
            className="mt-5 block rounded-lg bg-green-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-600"
          >
            {copy.viewOpportunity}
          </Link>
        </aside>
      </div>
    </main>
  );
}

async function getExperience(id: string) {
  try {
    const rows = await prisma.$queryRaw<ExperienceView[]>`
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
      WHERE s."id" = ${id}
        AND s."isPublished" = true
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function getDemoExperience(locale: string, id: string) {
  return getDemoExperiences(locale).find((experience) => experience.id === id);
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ja", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const englishCopy = {
  back: "Back to experiences",
  anonymous: "Volunteer",
  ratingPrefix: "Rating",
  related: "Related opportunity",
  relatedIntro:
    "If this experience feels interesting, open the original volunteer opportunity and learn how to join.",
  viewOpportunity: "View volunteer opportunity",
};

const japaneseCopy = {
  back: "経験シェアへ戻る",
  anonymous: "ボランティア",
  ratingPrefix: "満足度",
  related: "関連する活動",
  relatedIntro:
    "この経験に興味を持ったら、元のボランティア活動ページを開いて参加方法を確認できます。",
  viewOpportunity: "ボランティア活動を見る",
};
