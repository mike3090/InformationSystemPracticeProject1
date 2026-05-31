import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSelectedTaskItems } from "../../dashboard/applicationStatus";
import ReflectionForm from "./ReflectionForm";

type ReflectionApplication = {
  applicationId: string;
  selectedTaskItems: unknown;
  attendanceStatus: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityEndAt: Date | null;
  durationMinutes: number | null;
  reflectionId: string | null;
  reflectionDurationMinutes: number | null;
  accomplishmentSummary: string | null;
  shareCardText: string | null;
  badges: unknown;
  taskClarityRating: number | null;
  preparationRating: number | null;
  timeWellSpentRating: number | null;
  feedbackComment: string | null;
};

type BadgeView = {
  key: string;
  name: string;
  icon: string;
  description: string;
};

export default async function ReflectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; applicationId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale, applicationId } = await params;
  const { saved } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?callbackUrl=/${locale}/reflections/${applicationId}`,
    );
  }

  const application = await getReflectionApplication(applicationId, session.user.id);
  if (!application) notFound();

  const tasks = parseSelectedTaskItems(application.selectedTaskItems);
  const copy = locale === "en" ? englishCopy : japaneseCopy;
  const defaultDurationMinutes =
    tasks.find((task) => task.durationMinutes)?.durationMinutes ??
    application.durationMinutes ??
    120;
  const existing = application.reflectionId
    ? {
        durationMinutes:
          application.reflectionDurationMinutes ?? defaultDurationMinutes,
        accomplishmentSummary: application.accomplishmentSummary ?? "",
        shareCardText: application.shareCardText ?? "",
        badges: parseBadges(application.badges),
        taskClarityRating: application.taskClarityRating,
        preparationRating: application.preparationRating,
        timeWellSpentRating: application.timeWellSpentRating,
        feedbackComment: application.feedbackComment,
      }
    : null;

  return (
    <main className="bg-stone-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href={`/${locale}/my-events`}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-600"
        >
          {copy.back}
        </Link>

        <div className="mt-6 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950">
            {application.opportunityTitle}
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">{copy.intro}</p>
          {saved === "1" && (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              {copy.saved}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">{copy.promptTitle}</p>
          <p>{copy.promptBody}</p>
        </div>

        <div className="mt-6">
          <ReflectionForm
            applicationId={applicationId}
            locale={locale}
            defaultDurationMinutes={defaultDurationMinutes}
            tasks={tasks}
            existing={existing}
          />
        </div>
      </div>
    </main>
  );
}

async function getReflectionApplication(applicationId: string, userId: string) {
  const rows = await prisma.$queryRaw<ReflectionApplication[]>`
    SELECT
      a."id" AS "applicationId",
      a."selectedTaskItems" AS "selectedTaskItems",
      a."attendanceStatus" AS "attendanceStatus",
      o."id" AS "opportunityId",
      o."title" AS "opportunityTitle",
      o."endAt" AS "opportunityEndAt",
      o."durationMinutes" AS "durationMinutes",
      r."id" AS "reflectionId",
      r."durationMinutes" AS "reflectionDurationMinutes",
      r."accomplishmentSummary" AS "accomplishmentSummary",
      r."shareCardText" AS "shareCardText",
      r."badges" AS "badges",
      r."taskClarityRating" AS "taskClarityRating",
      r."preparationRating" AS "preparationRating",
      r."timeWellSpentRating" AS "timeWellSpentRating",
      r."feedbackComment" AS "feedbackComment"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    LEFT JOIN "PostEventReflection" r ON r."applicationId" = a."id"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${userId}
      AND a."status" = 'ACCEPTED'::"ApplicationStatus"
    LIMIT 1
  `;

  return rows[0] ?? null;
}

function parseBadges(value: unknown): BadgeView[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key : "";
      const name = typeof record.name === "string" ? record.name : "";
      const icon = typeof record.icon === "string" ? record.icon : "Award";
      const description =
        typeof record.description === "string" ? record.description : "";

      if (!key || !name) return null;
      return { key, name, icon, description };
    })
    .filter((item): item is BadgeView => Boolean(item));
}

const englishCopy = {
  back: "Back to My Events",
  eyebrow: "Post-event reflection",
  intro:
    "You showed up. Take two minutes to turn your work into a concrete record.",
  saved: "Reflection saved. Your accomplishment summary and badges are now recorded.",
  promptTitle: "Reflection prompt",
  promptBody:
    "This demo represents the notification volunteers receive shortly after the event ends. A gentle follow-up can be sent once if they do not complete it within 48 hours.",
};

const japaneseCopy = {
  back: "マイイベントに戻る",
  eyebrow: "活動後の振り返り",
  intro:
    "参加した内容を、具体的な成果として短時間で記録できます。",
  saved: "振り返りを保存しました。成果サマリーとバッジが記録されました。",
  promptTitle: "振り返り通知",
  promptBody:
    "このデモでは、活動終了後に届く通知をここで表現しています。48時間以内に未完了の場合、一度だけやさしいリマインダーを送れます。",
};
