import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ExperienceRow = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  tags: string[];
  rating: number | null;
  createdAt: Date;
  authorName: string | null;
  authorImage: string | null;
  opportunityId: string;
  opportunityTitle: string;
  opportunityCity: string | null;
  opportunityPrefecture: string | null;
};

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const experiences = await getExperiences();
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

        {experiences.length === 0 ? (
          <section className="mt-8 rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
            <h2 className="text-lg font-bold text-stone-950">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">
              {copy.emptyBody}
            </p>
          </section>
        ) : (
          <section className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
            {experiences.map((experience) => (
              <article
                key={experience.id}
                className="mb-5 break-inside-avoid overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
              >
                {experience.imageUrl ? (
                  <div
                    className="aspect-[4/5] w-full bg-stone-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${experience.imageUrl})` }}
                    aria-label={experience.title}
                    role="img"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-rose-100 via-amber-50 to-green-100 px-6 text-center text-sm font-semibold text-stone-600">
                    {experience.opportunityTitle}
                  </div>
                )}
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
                    <span>·</span>
                    <time dateTime={experience.createdAt.toISOString()}>
                      {formatDate(experience.createdAt, locale)}
                    </time>
                  </div>
                  <h2 className="mt-3 text-lg font-bold leading-snug text-stone-950">
                    {experience.title}
                  </h2>
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
                    href={`/${locale}/opportunities/${experience.opportunityId}`}
                    className="mt-4 block rounded-lg border border-green-700 px-3 py-2 text-center text-sm font-semibold text-green-700 hover:bg-green-50"
                  >
                    {copy.viewOpportunity}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

async function getExperiences() {
  try {
    return await prisma.$queryRaw<ExperienceRow[]>`
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
    "Browse real reflections from people who joined local activities, then jump straight to the related opportunity.",
  share: "Share an experience",
  emptyTitle: "No experiences yet",
  emptyBody:
    "After volunteers finish an activity, their posts will appear here for everyone to discover.",
  anonymous: "Volunteer",
  ratingPrefix: "Rating",
  viewOpportunity: "View related opportunity",
};

const japaneseCopy = {
  eyebrow: "体験ノート",
  title: "経験シェア",
  intro:
    "参加した人のリアルな感想を見ながら、気になった活動ページへそのまま移動できます。",
  share: "経験を投稿する",
  emptyTitle: "まだ投稿がありません",
  emptyBody:
    "活動に参加したボランティアの投稿が、ここに一覧で表示されます。",
  anonymous: "ボランティア",
  ratingPrefix: "満足度",
  viewOpportunity: "関連する活動を見る",
};
