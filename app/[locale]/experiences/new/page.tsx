import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createExperienceShare } from "../actions";

type EligibleApplication = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityCity: string | null;
  opportunityPrefecture: string | null;
  opportunityStartAt: Date | null;
  opportunityEndAt: Date | null;
};

export default async function NewExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ applicationId?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { applicationId, error } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/experiences/new`);
  }

  const applications = await getEligibleApplications(session.user.id);
  const copy = locale === "en" ? englishCopy : japaneseCopy;

  return (
    <main className="bg-stone-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/${locale}/experiences`}
          className="text-sm font-semibold text-green-700 hover:text-green-600"
        >
          {copy.back}
        </Link>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{copy.intro}</p>

          {error && (
            <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
              {error === "ineligible" ? copy.ineligibleError : copy.missingError}
            </p>
          )}

          {applications.length === 0 ? (
            <div className="mt-6 rounded-lg bg-stone-50 p-5">
              <h2 className="font-bold text-stone-950">{copy.noActivityTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {copy.noActivityBody}
              </p>
              <Link
                href={`/${locale}/dashboard`}
                className="mt-4 inline-flex text-sm font-semibold text-green-700 hover:text-green-600"
              >
                {copy.dashboard}
              </Link>
            </div>
          ) : (
            <form action={createExperienceShare} className="mt-6 space-y-5">
              <input type="hidden" name="locale" value={locale} />

              <label className="block">
                <span className="text-sm font-semibold text-stone-800">
                  {copy.activity}
                </span>
                <select
                  name="applicationId"
                  defaultValue={applicationId ?? applications[0]?.id}
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  required
                >
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.opportunityTitle} ·{" "}
                      {[application.opportunityCity, application.opportunityPrefecture]
                        .filter(Boolean)
                        .join(", ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-stone-800">
                  {copy.postTitle}
                </span>
                <input
                  name="title"
                  maxLength={90}
                  placeholder={copy.titlePlaceholder}
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-stone-800">
                  {copy.body}
                </span>
                <textarea
                  name="body"
                  rows={8}
                  minLength={40}
                  maxLength={1600}
                  placeholder={copy.bodyPlaceholder}
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  required
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">
                    {copy.imageUrl}
                  </span>
                  <input
                    name="imageUrl"
                    type="url"
                    placeholder="https://..."
                    className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-stone-800">
                    {copy.rating}
                  </span>
                  <input
                    name="rating"
                    type="number"
                    min="1"
                    max="5"
                    placeholder="5"
                    className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-stone-800">
                  {copy.tags}
                </span>
                <input
                  name="tags"
                  placeholder={copy.tagsPlaceholder}
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  {copy.submit}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

async function getEligibleApplications(userId: string) {
  try {
    return await prisma.$queryRaw<EligibleApplication[]>`
      SELECT
        a."id",
        o."id" AS "opportunityId",
        o."title" AS "opportunityTitle",
        o."city" AS "opportunityCity",
        o."prefecture" AS "opportunityPrefecture",
        o."startAt" AS "opportunityStartAt",
        o."endAt" AS "opportunityEndAt"
      FROM "Application" a
      INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
      LEFT JOIN "ExperienceShare" s ON s."applicationId" = a."id"
      WHERE a."volunteerId" = ${userId}
        AND s."id" IS NULL
        AND (
          a."status" = 'ACCEPTED'::"ApplicationStatus"
          OR o."status" = 'COMPLETED'::"OpportunityStatus"
          OR o."endAt" < NOW()
        )
      ORDER BY COALESCE(o."endAt", o."startAt", a."createdAt") DESC
    `;
  } catch {
    return [];
  }
}

const englishCopy = {
  back: "Back to experiences",
  eyebrow: "Create a note",
  title: "Share what it was like",
  intro:
    "Write a short, practical post so future volunteers can understand the activity before joining.",
  missingError: "Please choose an activity and write a little more detail.",
  ineligibleError: "This activity cannot be shared, or you have already posted about it.",
  noActivityTitle: "No finished activities available",
  noActivityBody:
    "Once you have an accepted or completed activity, you can publish an experience here.",
  dashboard: "Go to dashboard",
  activity: "Related activity",
  postTitle: "Post title",
  titlePlaceholder: "e.g. A calm morning helping at the community garden",
  body: "Experience",
  bodyPlaceholder:
    "What did you do? What surprised you? What should the next volunteer know?",
  imageUrl: "Image URL",
  rating: "Rating 1-5",
  tags: "Tags",
  tagsPlaceholder: "gardening, local people, beginner friendly",
  submit: "Publish experience",
};

const japaneseCopy = {
  back: "経験シェアへ戻る",
  eyebrow: "投稿作成",
  title: "参加した経験を共有する",
  intro:
    "次に参加する人が活動の雰囲気を想像できるように、実際に感じたことを書いてください。",
  missingError: "活動を選び、本文をもう少し詳しく書いてください。",
  ineligibleError: "この活動は投稿できないか、すでに投稿済みです。",
  noActivityTitle: "投稿できる参加済み活動がありません",
  noActivityBody:
    "採用済み、または終了済みの活動があると、ここから経験を投稿できます。",
  dashboard: "ダッシュボードへ",
  activity: "関連する活動",
  postTitle: "タイトル",
  titlePlaceholder: "例：地域ガーデンで過ごした穏やかな朝",
  body: "経験内容",
  bodyPlaceholder:
    "どんな作業をしたか、印象に残ったこと、次の参加者に伝えたいことを書いてください。",
  imageUrl: "画像URL",
  rating: "満足度 1-5",
  tags: "タグ",
  tagsPlaceholder: "ガーデニング, 地域交流, 初心者向け",
  submit: "投稿する",
};
