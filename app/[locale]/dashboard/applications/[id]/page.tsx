import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { OpportunityStatus } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getApplicationStatusCopy,
  getApplicationStatusView,
  parseSelectedTaskItems,
} from "../../applicationStatus";

type ApplicationDetail = {
  id: string;
  status: string;
  selectedTaskItems: unknown;
  confirmedTimeCommitment: boolean;
  skillTags: string[];
  experienceNote: string | null;
  message: string | null;
  waitlistPosition: number | null;
  reviewedAt: Date | null;
  createdAt: Date;
  opportunity: {
    id: string;
    title: string;
    description: string;
    city: string | null;
    prefecture: string | null;
    address: string | null;
    startAt: Date | null;
    endAt: Date | null;
    status: OpportunityStatus;
    skills: string[];
  };
};

type RawApplicationDetail = {
  id: string;
  status: string;
  selectedTaskItems: unknown;
  confirmedTimeCommitment: boolean;
  skillTags: string[];
  experienceNote: string | null;
  message: string | null;
  waitlistPosition: number | null;
  reviewedAt: Date | null;
  createdAt: Date;
  opportunityId: string;
  opportunityTitle: string;
  opportunityDescription: string;
  opportunityCity: string | null;
  opportunityPrefecture: string | null;
  opportunityAddress: string | null;
  opportunityStartAt: Date | null;
  opportunityEndAt: Date | null;
  opportunityStatus: OpportunityStatus;
  opportunitySkills: string[];
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?callbackUrl=/${locale}/dashboard/applications/${id}`,
    );
  }

  const application = await getApplicationDetail(id, session.user.id);

  if (!application) {
    notFound();
  }

  return (
    <ApplicationDetailView
      application={application}
      locale={locale}
    />
  );
}

async function getApplicationDetail(
  id: string,
  userId: string,
): Promise<ApplicationDetail | null> {
  const rows = await prisma.$queryRaw<RawApplicationDetail[]>`
    SELECT
      a."id",
      a."status"::text AS "status",
      a."selectedTaskItems" AS "selectedTaskItems",
      a."confirmedTimeCommitment" AS "confirmedTimeCommitment",
      a."skillTags" AS "skillTags",
      a."experienceNote" AS "experienceNote",
      a."message",
      a."waitlistPosition" AS "waitlistPosition",
      a."reviewedAt" AS "reviewedAt",
      a."createdAt" AS "createdAt",
      o."id" AS "opportunityId",
      o."title" AS "opportunityTitle",
      o."description" AS "opportunityDescription",
      o."city" AS "opportunityCity",
      o."prefecture" AS "opportunityPrefecture",
      o."address" AS "opportunityAddress",
      o."startAt" AS "opportunityStartAt",
      o."endAt" AS "opportunityEndAt",
      o."status" AS "opportunityStatus",
      o."skills" AS "opportunitySkills"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${id}
      AND a."volunteerId" = ${userId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    selectedTaskItems: row.selectedTaskItems,
    confirmedTimeCommitment: row.confirmedTimeCommitment,
    skillTags: row.skillTags,
    experienceNote: row.experienceNote,
    message: row.message,
    waitlistPosition: row.waitlistPosition,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    opportunity: {
      id: row.opportunityId,
      title: row.opportunityTitle,
      description: row.opportunityDescription,
      city: row.opportunityCity,
      prefecture: row.opportunityPrefecture,
      address: row.opportunityAddress,
      startAt: row.opportunityStartAt,
      endAt: row.opportunityEndAt,
      status: row.opportunityStatus,
      skills: row.opportunitySkills,
    },
  };
}

function ApplicationDetailView({
  application,
  locale,
}: {
  application: ApplicationDetail;
  locale: string;
}) {
  const statusView = getApplicationStatusView(
    application.status,
    application.opportunity.status,
    application.opportunity.endAt,
  );
  const status = getApplicationStatusCopy(statusView, locale);
  const selectedTasks = parseSelectedTaskItems(application.selectedTaskItems);

  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm font-semibold text-green-700 hover:text-green-600"
        >
          {locale === "en" ? "Back to dashboard" : "ダッシュボードへ戻る"}
        </Link>

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                {locale === "en" ? "Application status" : "応募ステータス"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950">
                {application.opportunity.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                {application.opportunity.description}
              </p>
            </div>
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${status.tone}`}
            >
              <span className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              <p className="mt-1 text-xs font-medium">{status.description}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-stone-950">
              {locale === "en" ? "Assigned task and role" : "担当タスクと役割"}
            </h2>
            {selectedTasks.length === 0 ? (
              <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
                {locale === "en"
                  ? "The organizer has not assigned a specific task yet."
                  : "主催者による具体的な担当タスクはまだ未確定です。"}
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {selectedTasks.map((task) => (
                  <div
                    key={`${task.name}-${task.startTime}`}
                    className="rounded-lg border border-stone-200 p-4"
                  >
                    <h3 className="font-semibold text-stone-950">{task.name}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {task.startTime || (locale === "en" ? "Time TBD" : "時間未定")}
                      {task.durationMinutes
                        ? ` · ${task.durationMinutes} min`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoItem
                label={locale === "en" ? "Time commitment" : "参加時間"}
                value={
                  application.confirmedTimeCommitment
                    ? locale === "en"
                      ? "Confirmed by volunteer"
                      : "ボランティアが確認済み"
                    : locale === "en"
                      ? "Not confirmed"
                      : "未確認"
                }
              />
              <InfoItem
                label={locale === "en" ? "Waitlist position" : "待機順"}
                value={
                  application.waitlistPosition
                    ? `#${application.waitlistPosition}`
                    : locale === "en"
                      ? "Not waitlisted"
                      : "対象外"
                }
              />
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-stone-950">
                {locale === "en" ? "Event information" : "イベント情報"}
              </h2>
              <dl className="mt-4 space-y-3">
                <InfoItem
                  label={locale === "en" ? "Date and time" : "日時"}
                  value={formatDateRange(
                    application.opportunity.startAt,
                    application.opportunity.endAt,
                    locale,
                  )}
                />
                <InfoItem
                  label={locale === "en" ? "Location" : "場所"}
                  value={
                    application.opportunity.address ||
                    formatLocation(
                      application.opportunity.city,
                      application.opportunity.prefecture,
                      locale,
                    )
                  }
                />
                <InfoItem
                  label={locale === "en" ? "Applied on" : "応募日"}
                  value={formatDateTime(application.createdAt, locale)}
                />
              </dl>
            </section>

            {statusView === "confirmed" && (
              <section className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-green-950">
                  {locale === "en" ? "Before you arrive" : "当日の準備"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-green-900">
                  {locale === "en"
                    ? "Arrive 10 minutes before the start time, check the location, and bring any items listed for your selected task."
                    : "開始10分前を目安に到着し、場所を確認してください。選択したタスクに必要な持ち物があれば忘れずに持参してください。"}
                </p>
              </section>
            )}

            <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-stone-950">
                {locale === "en" ? "Your application note" : "応募メモ"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {application.experienceNote ||
                  application.message ||
                  (locale === "en" ? "No note submitted." : "メモはありません。")}
              </p>
              {application.skillTags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {application.skillTags.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatDateRange(startAt: Date | null, endAt: Date | null, locale: string) {
  if (!startAt) return locale === "en" ? "Date TBD" : "日時未定";

  const start = formatDateTime(startAt, locale);
  if (!endAt) return start;

  return `${start} - ${new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : "ja-JP",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(endAt)}`;
}

function formatLocation(
  city: string | null,
  prefecture: string | null,
  locale: string,
) {
  return (
    [city, prefecture].filter(Boolean).join(", ") ||
    (locale === "en" ? "Location TBD" : "場所未定")
  );
}
