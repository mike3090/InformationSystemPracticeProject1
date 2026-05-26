import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getApplicationStatusCopy,
  parseSelectedTaskItems,
  type ApplicationStatusView,
} from "../../applicationStatus";
import AiMatchButton from "./AiMatchButton";
import ApplicationReviewForm from "./ApplicationReviewForm";
import { bulkUpdateApplicationReview } from "./actions";
import {
  OrganizerReplyForm,
  OrganizerUpdateForm,
} from "./OrganizerCommunicationForms";
import ParticipantManagementForm from "./ParticipantManagementForm";
import {
  getEventMessages,
  type EventMessageView,
} from "@/lib/preEventCommunication";

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
  matchScore: number | null;
  aiRecommended: boolean;
  participantGroup: string | null;
  participantRole: string;
  accessLevel: string;
  attendanceStatus: string;
  organizerNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  volunteerId: string;
  volunteerName: string | null;
  volunteerEmail: string;
  volunteerCity: string | null;
  volunteerPrefecture: string | null;
  volunteerBio: string | null;
  messages: EventMessageView[];
};

type RawApplicantReview = Omit<ApplicantReview, "messages">;

export default async function RequesterOpportunityReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ status?: string }>;
}) {
  const { locale, id } = await params;
  const { status: rawStatusFilter } = (await searchParams) ?? {};
  const statusFilter = normalizeStatusFilter(rawStatusFilter);
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
  const waitlistedCount = applicants.filter((applicant) => applicant.status === "WAITLISTED").length;
  const displayApplicants = filterApplicants(applicants, statusFilter);
  const participantGroups = summarizeParticipantGroups(applicants);

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

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/opportunities/${opportunity.id}/edit`}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-700 hover:text-green-700"
            >
              {locale === "en" ? "Edit opportunity" : "募集を編集"}
            </Link>
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
          <h2 className="text-xl font-bold text-stone-950">
            {locale === "en" ? "Send organizer update" : "主催者からのお知らせ"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {locale === "en"
              ? "Broadcast a change or announcement to all confirmed volunteers."
              : "参加確定者全員に変更やお知らせを送信できます。"}
          </p>
          <OrganizerUpdateForm locale={locale} opportunityId={opportunity.id} />
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
            <AiMatchButton
              opportunityId={opportunity.id}
              locale={locale}
              pendingCount={pendingCount}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_18rem]">
            <nav className="flex flex-wrap gap-2" aria-label="Application status filters">
              <StatusFilterLink
                href={`/${locale}/dashboard/opportunities/${opportunity.id}`}
                active={statusFilter === "all"}
                label={locale === "en" ? "All" : "すべて"}
                count={applicants.length}
              />
              <StatusFilterLink
                href={`/${locale}/dashboard/opportunities/${opportunity.id}?status=pending`}
                active={statusFilter === "pending"}
                label={locale === "en" ? "Pending" : "審査中"}
                count={pendingCount}
              />
              <StatusFilterLink
                href={`/${locale}/dashboard/opportunities/${opportunity.id}?status=accepted`}
                active={statusFilter === "accepted"}
                label={locale === "en" ? "Accepted" : "承認済み"}
                count={acceptedCount}
              />
              <StatusFilterLink
                href={`/${locale}/dashboard/opportunities/${opportunity.id}?status=waitlisted`}
                active={statusFilter === "waitlisted"}
                label={locale === "en" ? "Waitlisted" : "待機"}
                count={waitlistedCount}
              />
              <StatusFilterLink
                href={`/${locale}/dashboard/opportunities/${opportunity.id}?status=closed`}
                active={statusFilter === "closed"}
                label={locale === "en" ? "Closed" : "終了"}
                count={
                  applicants.filter((applicant) =>
                    ["REJECTED", "WITHDRAWN"].includes(applicant.status),
                  ).length
                }
              />
            </nav>

            <aside className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-sm font-bold text-stone-950">
                {locale === "en" ? "Participant groups" : "参加者グループ"}
              </h3>
              {participantGroups.length === 0 ? (
                <p className="mt-2 text-sm text-stone-600">
                  {locale === "en"
                    ? "No groups assigned yet."
                    : "まだグループ設定はありません。"}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {participantGroups.map((group) => (
                    <div key={group.name} className="flex justify-between text-sm">
                      <span className="font-medium text-stone-700">{group.name}</span>
                      <span className="text-stone-500">{group.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>

          {displayApplicants.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
              {applicants.length === 0
                ? locale === "en"
                  ? "No one has applied yet."
                  : "まだ応募者はいません。"
                : locale === "en"
                  ? "No applicants match this filter."
                  : "この条件に一致する応募者はいません。"}
            </p>
          ) : (
            <>
              <BulkReviewForm
                applicants={displayApplicants}
                locale={locale}
                opportunityId={opportunity.id}
              />
              <div className="mt-6 grid gap-4">
                {displayApplicants.map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    opportunity={opportunity}
                    locale={locale}
                  />
                ))}
              </div>
            </>
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
      a."matchScore" AS "matchScore",
      a."aiRecommended" AS "aiRecommended",
      a."participantGroup" AS "participantGroup",
      a."participantRole" AS "participantRole",
      a."accessLevel" AS "accessLevel",
      a."attendanceStatus" AS "attendanceStatus",
      a."organizerNote" AS "organizerNote",
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
      CASE WHEN a."status" = 'PENDING' THEN a."matchScore" END DESC NULLS LAST,
      a."createdAt" ASC
  `;

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      messages: await getEventMessages(row.id),
    })),
  );
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
          {applicant.matchScore !== null && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                applicant.matchScore >= 75
                  ? "bg-green-100 text-green-800"
                  : applicant.matchScore >= 50
                    ? "bg-amber-100 text-amber-800"
                    : "bg-stone-100 text-stone-600"
              }`}
            >
              AI {applicant.matchScore}
            </span>
          )}
          {applicant.aiRecommended && (
            <span className="rounded-full bg-green-700 px-2.5 py-1 text-xs font-semibold text-white">
              {locale === "en" ? "Recommended" : "推薦"}
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

        <ParticipantManagementForm
          locale={locale}
          opportunityId={opportunity.id}
          applicationId={applicant.id}
          participantGroup={applicant.participantGroup}
          participantRole={applicant.participantRole}
          accessLevel={applicant.accessLevel}
          attendanceStatus={applicant.attendanceStatus}
          organizerNote={applicant.organizerNote}
        />

        {applicant.status === "ACCEPTED" && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h4 className="font-semibold text-stone-950">
              {locale === "en" ? "Message thread" : "メッセージ"}
            </h4>
            {applicant.messages.length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">
                {locale === "en"
                  ? "No direct messages yet."
                  : "まだ直接メッセージはありません。"}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {applicant.messages.map((message) => (
                  <p
                    key={message.id}
                    className="rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-700"
                  >
                    <span className="font-semibold text-stone-950">
                      {message.senderName ||
                        (message.senderId === applicant.volunteerId
                          ? volunteerName
                          : locale === "en"
                            ? "Organizer"
                            : "主催者")}
                      :{" "}
                    </span>
                    {message.body}
                  </p>
                ))}
              </div>
            )}
            <OrganizerReplyForm
              locale={locale}
              opportunityId={opportunity.id}
              applicationId={applicant.id}
            />
          </div>
        )}
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

function BulkReviewForm({
  applicants,
  locale,
  opportunityId,
}: {
  applicants: ApplicantReview[];
  locale: string;
  opportunityId: string;
}) {
  return (
    <form
      action={bulkUpdateApplicationReview}
      className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-4"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-950">
            {locale === "en" ? "Bulk review" : "一括審査"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {locale === "en"
              ? "Select applicants from the current filter and apply one review decision."
              : "現在の絞り込み対象から応募者を選び、同じ審査結果を一括適用します。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            name="nextStatus"
            value="ACCEPTED"
            className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            {locale === "en" ? "Accept selected" : "選択を承認"}
          </button>
          <button
            name="nextStatus"
            value="WAITLISTED"
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
          >
            {locale === "en" ? "Waitlist selected" : "選択を待機"}
          </button>
          <button
            name="nextStatus"
            value="REJECTED"
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            {locale === "en" ? "Reject selected" : "選択を不採用"}
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {applicants.map((applicant) => {
          const volunteerName =
            applicant.volunteerName || applicant.volunteerEmail || applicant.volunteerId;
          return (
            <label
              key={applicant.id}
              className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm"
            >
              <input
                name="applicationIds"
                value={applicant.id}
                type="checkbox"
                className="h-4 w-4"
              />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-900">
                  {volunteerName}
                </span>
                <span className="block text-xs text-stone-500">
                  {applicant.status}
                  {applicant.participantGroup ? ` · ${applicant.participantGroup}` : ""}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </form>
  );
}

function getApplicantReviewStatusView(status: string): ApplicationStatusView {
  if (status === "ACCEPTED") return "confirmed";
  if (status === "WAITLISTED") return "waitlisted";
  if (status === "REJECTED" || status === "WITHDRAWN") return "cancelled";
  return "pending";
}

function StatusFilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-green-700 bg-green-700 text-white"
          : "border-stone-300 text-stone-700 hover:border-green-700 hover:text-green-700"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}

function normalizeStatusFilter(value: string | undefined) {
  if (
    value === "pending" ||
    value === "accepted" ||
    value === "waitlisted" ||
    value === "closed"
  ) {
    return value;
  }
  return "all";
}

function filterApplicants(
  applicants: ApplicantReview[],
  statusFilter: ReturnType<typeof normalizeStatusFilter>,
) {
  if (statusFilter === "pending") {
    return applicants.filter((applicant) => applicant.status === "PENDING");
  }
  if (statusFilter === "accepted") {
    return applicants.filter((applicant) => applicant.status === "ACCEPTED");
  }
  if (statusFilter === "waitlisted") {
    return applicants.filter((applicant) => applicant.status === "WAITLISTED");
  }
  if (statusFilter === "closed") {
    return applicants.filter((applicant) =>
      ["REJECTED", "WITHDRAWN"].includes(applicant.status),
    );
  }
  return applicants;
}

function summarizeParticipantGroups(applicants: ApplicantReview[]) {
  const groups = new Map<string, number>();
  applicants.forEach((applicant) => {
    if (!applicant.participantGroup) return;
    groups.set(
      applicant.participantGroup,
      (groups.get(applicant.participantGroup) ?? 0) + 1,
    );
  });
  return Array.from(groups, ([name, count]) => ({ name, count })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
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
