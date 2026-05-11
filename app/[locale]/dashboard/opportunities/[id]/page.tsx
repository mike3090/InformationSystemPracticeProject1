import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getApplicationStatusCopy,
  parseSelectedTaskItems,
  type ApplicationStatusView,
} from "../../applicationStatus";
import ApplicationReviewForm from "./ApplicationReviewForm";

type OpportunityReview = {
  id: string;
  title: string;
  description: string;
  status: string;
  city: string | null;
  prefecture: string | null;
  address: string | null;
  startAt: Date | null;
  endAt: Date | null;
  volunteersNeeded: number;
};

type ApplicantReview = {
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
  volunteerId: string;
  volunteerName: string | null;
  volunteerEmail: string;
  volunteerCity: string | null;
  volunteerPrefecture: string | null;
  volunteerBio: string | null;
};

type RawApplicantReview = ApplicantReview;

export default async function RequesterOpportunityReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?intent=requester&callbackUrl=/${locale}/dashboard/opportunities/${id}`,
    );
  }

  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id,
      requesterId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      city: true,
      prefecture: true,
      address: true,
      startAt: true,
      endAt: true,
      volunteersNeeded: true,
    },
  });

  if (!opportunity) {
    notFound();
  }

  const applicants = await getApplicants(id);
  const pendingCount = applicants.filter((applicant) => applicant.status === "PENDING").length;
  const acceptedCount = applicants.filter((applicant) => applicant.status === "ACCEPTED").length;

  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm font-semibold text-green-700 hover:text-green-600"
        >
          {locale === "en" ? "Back to dashboard" : "ダッシュボードへ戻る"}
        </Link>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                {locale === "en" ? "Application review" : "応募者確認"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950">
                {opportunity.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                {opportunity.description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-80">
              <Metric
                label={locale === "en" ? "Applicants" : "応募者"}
                value={String(applicants.length)}
              />
              <Metric
                label={locale === "en" ? "Pending" : "審査中"}
                value={String(pendingCount)}
              />
              <Metric
                label={locale === "en" ? "Accepted" : "承認済み"}
                value={`${acceptedCount}/${opportunity.volunteersNeeded}`}
              />
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <InfoItem
              label={locale === "en" ? "Date and time" : "日時"}
              value={formatDateRange(opportunity.startAt, opportunity.endAt, locale)}
            />
            <InfoItem
              label={locale === "en" ? "Location" : "場所"}
              value={
                opportunity.address ||
                formatLocation(opportunity.city, opportunity.prefecture, locale)
              }
            />
            <InfoItem
              label={locale === "en" ? "Opportunity status" : "募集ステータス"}
              value={opportunity.status}
            />
          </dl>
        </section>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-950">
                {locale === "en" ? "Applicants" : "応募者"}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {locale === "en"
                  ? "Review volunteer applications and update the status shown on the volunteer dashboard."
                  : "ボランティアからの応募を確認し、ボランティア側に表示されるステータスを更新できます。"}
              </p>
            </div>
          </div>

          {applicants.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
              {locale === "en"
                ? "No one has applied yet."
                : "まだ応募者はいません。"}
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {applicants.map((applicant) => (
                <ApplicantCard
                  key={applicant.id}
                  applicant={applicant}
                  opportunity={opportunity}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

async function getApplicants(opportunityId: string): Promise<ApplicantReview[]> {
  const rows = await prisma.$queryRaw<RawApplicantReview[]>`
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
      u."id" AS "volunteerId",
      u."name" AS "volunteerName",
      u."email" AS "volunteerEmail",
      vp."city" AS "volunteerCity",
      vp."prefecture" AS "volunteerPrefecture",
      vp."bio" AS "volunteerBio"
    FROM "Application" a
    INNER JOIN "User" u ON u."id" = a."volunteerId"
    LEFT JOIN "VolunteerProfile" vp ON vp."userId" = u."id"
    WHERE a."opportunityId" = ${opportunityId}
    ORDER BY
      CASE a."status"
        WHEN 'PENDING' THEN 0
        WHEN 'WAITLISTED' THEN 1
        WHEN 'ACCEPTED' THEN 2
        ELSE 3
      END,
      a."createdAt" ASC
  `;

  return rows;
}

function ApplicantCard({
  applicant,
  opportunity,
  locale,
}: {
  applicant: ApplicantReview;
  opportunity: OpportunityReview;
  locale: string;
}) {
  const statusView = getApplicantReviewStatusView(applicant.status);
  const status = getApplicationStatusCopy(statusView, locale);
  const selectedTasks = parseSelectedTaskItems(applicant.selectedTaskItems);
  const volunteerName =
    applicant.volunteerName || applicant.volunteerEmail || applicant.volunteerId;

  return (
    <article className="grid gap-4 rounded-lg border border-stone-200 p-4 lg:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-stone-950">{volunteerName}</h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          {applicant.waitlistPosition && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
              #{applicant.waitlistPosition}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-stone-500">
          {applicant.volunteerEmail} ·{" "}
          {formatLocation(applicant.volunteerCity, applicant.volunteerPrefecture, locale)}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-stone-50 p-3">
            <p className="text-xs font-bold uppercase text-stone-500">
              {locale === "en" ? "Selected task" : "希望タスク"}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {selectedTasks.map((task) => task.name).join(", ") ||
                (locale === "en" ? "Not selected" : "未選択")}
            </p>
            {selectedTasks.length > 0 && (
              <p className="mt-1 text-xs text-stone-500">
                {selectedTasks
                  .map((task) =>
                    [task.startTime, task.durationMinutes ? `${task.durationMinutes} min` : ""]
                      .filter(Boolean)
                      .join(" · "),
                  )
                  .join(" / ")}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-stone-50 p-3">
            <p className="text-xs font-bold uppercase text-stone-500">
              {locale === "en" ? "Time commitment" : "参加時間確認"}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {applicant.confirmedTimeCommitment
                ? locale === "en"
                  ? "Confirmed"
                  : "確認済み"
                : locale === "en"
                  ? "Not confirmed"
                  : "未確認"}
            </p>
          </div>
        </div>

        {(applicant.experienceNote || applicant.message || applicant.volunteerBio) && (
          <div className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
            {applicant.experienceNote && (
              <p>
                <span className="font-semibold text-stone-950">
                  {locale === "en" ? "Experience: " : "経験: "}
                </span>
                {applicant.experienceNote}
              </p>
            )}
            {applicant.message && applicant.message !== applicant.experienceNote && (
              <p>
                <span className="font-semibold text-stone-950">
                  {locale === "en" ? "Message: " : "メッセージ: "}
                </span>
                {applicant.message}
              </p>
            )}
            {applicant.volunteerBio && (
              <p>
                <span className="font-semibold text-stone-950">
                  {locale === "en" ? "Profile: " : "プロフィール: "}
                </span>
                {applicant.volunteerBio}
              </p>
            )}
          </div>
        )}

        {applicant.skillTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {applicant.skillTags.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-stone-500">
          {locale === "en" ? "Applied " : "応募日 "}
          {formatDateTime(applicant.createdAt, locale)}
          {applicant.reviewedAt
            ? ` · ${locale === "en" ? "Reviewed " : "審査日 "}${formatDateTime(
                applicant.reviewedAt,
                locale,
              )}`
            : ""}
        </p>
      </div>

      <div className="lg:w-56">
        <ApplicationReviewForm
          locale={locale}
          opportunityId={opportunity.id}
          applicationId={applicant.id}
          currentStatus={applicant.status}
        />
      </div>
    </article>
  );
}

function getApplicantReviewStatusView(status: string): ApplicationStatusView {
  if (status === "ACCEPTED") return "confirmed";
  if (status === "WAITLISTED") return "waitlisted";
  if (status === "REJECTED" || status === "WITHDRAWN") return "cancelled";
  return "pending";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-stone-950">{value}</dd>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-stone-900">{value}</dd>
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
