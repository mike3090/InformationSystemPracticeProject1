import Link from "next/link";
import { redirect } from "next/navigation";
import type { OpportunityStatus, UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  copyOpportunity,
  submitOrganizationCertification,
  updateOpportunityStatus,
} from "./actions";

type RequesterOpportunity = {
  id: string;
  title: string;
  status: OpportunityStatus;
  startAt: Date | null;
  endAt: Date | null;
  city: string | null;
  prefecture: string | null;
  volunteersNeeded: number;
  applications: {
    status: string;
    attendanceStatus: string;
  }[];
  _count: { applications: number };
};

type OrganizationCertificationSummary = {
  id: string;
  name: string;
  certificationStatus: string;
  certificationSubmittedAt: Date | null;
  certificationReviewedAt: Date | null;
  certificationReviewNote: string | null;
  certificationSource: string | null;
  certifiedAt: Date | null;
  managerPhone: string | null;
  managerLegalName: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  legalName: string | null;
  legalAddress: string | null;
  termsAccepted: boolean;
  type: string;
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/dashboard`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      name: true,
      organization: {
        select: {
          id: true,
          name: true,
          certificationStatus: true,
          certificationSubmittedAt: true,
          certificationReviewedAt: true,
          certificationReviewNote: true,
          certificationSource: true,
          certifiedAt: true,
          managerPhone: true,
          managerLegalName: true,
          contactPersonEmail: true,
          contactPersonPhone: true,
          legalName: true,
          legalAddress: true,
          termsAccepted: true,
          type: true,
        },
      },
    },
  });

  const role = user?.role ?? session.user.role;
  if (!canUseRequesterDashboard(role)) {
    redirect(`/${locale}/opportunities`);
  }

  const requesterOpportunities = await prisma.opportunity.findMany({
    where: { requesterId: session.user.id },
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      startAt: true,
      endAt: true,
      city: true,
      prefecture: true,
      volunteersNeeded: true,
      applications: {
        select: {
          status: true,
          attendanceStatus: true,
        },
      },
      _count: { select: { applications: true } },
    },
  });

  return (
    <RequesterDashboard
      locale={locale}
      opportunities={requesterOpportunities}
      organization={user?.organization ?? null}
      isAdmin={role === "ADMIN"}
    />
  );
}

function RequesterDashboard({
  locale,
  opportunities,
  organization,
  isAdmin,
}: {
  locale: string;
  opportunities: RequesterOpportunity[];
  organization: OrganizationCertificationSummary | null;
  isAdmin: boolean;
}) {
  const totalApplicants = opportunities.reduce(
    (sum, opportunity) => sum + opportunity._count.applications,
    0,
  );
  const openCount = opportunities.filter((opportunity) => opportunity.status === "OPEN").length;
  const draftCount = opportunities.filter((opportunity) => opportunity.status === "DRAFT").length;
  const completedCount = opportunities.filter(
    (opportunity) => opportunity.status === "COMPLETED",
  ).length;

  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              {locale === "en" ? "Organizer dashboard" : "主催者ダッシュボード"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950">
              {locale === "en" ? "Task management" : "募集管理"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {locale === "en"
                ? "Manage task status, applications, and quick operations from one work-focused view."
                : "募集ステータス、応募者数、操作をひとつの画面で管理できます。"}
            </p>
          </div>
          <Link
            href={`/${locale}/opportunities/new`}
            className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            {locale === "en" ? "Create task" : "募集を作成"}
          </Link>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-4">
          <DashboardMetric label={locale === "en" ? "All tasks" : "全募集"} value={String(opportunities.length)} />
          <DashboardMetric label={locale === "en" ? "Open" : "募集中"} value={String(openCount)} />
          <DashboardMetric label={locale === "en" ? "Drafts" : "下書き"} value={String(draftCount)} />
          <DashboardMetric label={locale === "en" ? "Applicants" : "応募者"} value={String(totalApplicants)} />
        </dl>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 p-5">
              <h2 className="text-lg font-bold text-stone-950">
                {locale === "en" ? "Tasks" : "募集"}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {locale === "en"
                  ? "Publish, pause, copy, complete, or open the applicant review page."
                  : "公開、停止、コピー、完了、応募者確認をここから操作できます。"}
              </p>
            </div>
            {opportunities.length === 0 ? (
              <p className="m-5 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
                {locale === "en"
                  ? "No tasks yet. Create your first draft to start recruiting."
                  : "まだ募集はありません。最初の下書きを作成しましょう。"}
              </p>
            ) : (
              <div className="divide-y divide-stone-200">
                {opportunities.map((opportunity) => (
                  <RequesterTaskRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <CertificationPanel locale={locale} organization={organization} />

            {isAdmin && (
              <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-stone-950">
                  {locale === "en" ? "Admin review" : "管理者レビュー"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {locale === "en"
                    ? "Review organizer verification requests before granting the certified badge."
                    : "認証バッジ付与前に主催者の認証申請を確認します。"}
                </p>
                <Link
                  href={`/${locale}/dashboard/certifications`}
                  className="mt-4 inline-flex rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-700 hover:text-green-700"
                >
                  {locale === "en" ? "Open queue" : "審査キューを開く"}
                </Link>
              </section>
            )}

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-stone-950">
                {locale === "en" ? "Status mix" : "ステータス"}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <StatusLine label="Draft" value={draftCount} total={opportunities.length} />
                <StatusLine label="Open" value={openCount} total={opportunities.length} />
                <StatusLine label="Completed" value={completedCount} total={opportunities.length} />
              </div>
            </section>

          </aside>
        </div>
      </div>
    </div>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-stone-950">{value}</dd>
    </div>
  );
}

function StatusLine({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="text-stone-500">{value}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-stone-100">
        <div
          className="h-2 rounded-full bg-green-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CertificationPanel({
  locale,
  organization,
}: {
  locale: string;
  organization: OrganizationCertificationSummary | null;
}) {
  if (!organization) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-stone-950">
          {locale === "en" ? "Organizer verification" : "主催者認証"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {locale === "en"
            ? "Complete your organizer profile before requesting verification."
            : "認証申請の前に主催者プロフィールを完成させてください。"}
        </p>
        <Link
          href={`/${locale}/profile/setup?intent=requester&next=/${locale}/dashboard`}
          className="mt-4 inline-flex rounded-lg bg-stone-950 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          {locale === "en" ? "Set up profile" : "プロフィール設定"}
        </Link>
      </section>
    );
  }

  const isLegalEntity = organization.type !== "INDIVIDUAL";
  const missingItems = [
    [organization.termsAccepted, locale === "en" ? "Terms agreement" : "利用規約同意"],
    [organization.managerPhone, locale === "en" ? "Manager phone" : "責任者電話"],
    [organization.managerLegalName, locale === "en" ? "Manager legal name" : "責任者実名"],
    [organization.contactPersonEmail, locale === "en" ? "Contact email" : "担当者メール"],
    [organization.contactPersonPhone, locale === "en" ? "Contact phone" : "担当者電話"],
    [
      !isLegalEntity || organization.legalName,
      locale === "en" ? "Legal organization name" : "法人正式名称",
    ],
    [
      !isLegalEntity || organization.legalAddress,
      locale === "en" ? "Legal address" : "法人所在地",
    ],
  ]
    .filter(([complete]) => !complete)
    .map(([, label]) => String(label));
  const canSubmit =
    missingItems.length === 0 &&
    !["under_review", "certified"].includes(organization.certificationStatus);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-stone-950">
            {locale === "en" ? "Organizer verification" : "主催者認証"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-stone-700">
            {certificationStatusLabel(organization.certificationStatus, locale)}
          </p>
        </div>
        <span className={certificationBadgeClass(organization.certificationStatus)}>
          {organization.certificationStatus.replace("_", " ")}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-stone-600">
        {locale === "en"
          ? "Verification is private until approved. Certified organizers can later unlock higher-trust publishing flows."
          : "認証情報は承認されるまで非公開です。認証済み主催者は今後、信頼度の高い公開フローを利用できます。"}
      </p>

      {organization.certificationReviewNote && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {organization.certificationReviewNote}
        </p>
      )}

      {missingItems.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
          <p className="text-xs font-bold uppercase text-stone-500">
            {locale === "en" ? "Missing before review" : "申請前の不足項目"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canSubmit ? (
          <form action={submitOrganizationCertification}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              {locale === "en" ? "Submit for review" : "認証審査を申請"}
            </button>
          </form>
        ) : (
          <Link
            href={`/${locale}/profile`}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-700 hover:text-green-700"
          >
            {locale === "en" ? "Edit verification details" : "認証情報を編集"}
          </Link>
        )}
      </div>
    </section>
  );
}

function certificationStatusLabel(status: string, locale: string) {
  const labels: Record<string, { en: string; ja: string }> = {
    uncertified: {
      en: "Not submitted",
      ja: "未申請",
    },
    under_review: {
      en: "Under review",
      ja: "審査中",
    },
    certified: {
      en: "Certified",
      ja: "認証済み",
    },
    rejected: {
      en: "Rejected",
      ja: "却下",
    },
    changes_requested: {
      en: "Changes requested",
      ja: "修正依頼",
    },
  };
  const copy = labels[status] ?? labels.uncertified;
  return locale === "en" ? copy.en : copy.ja;
}

function certificationBadgeClass(status: string) {
  if (status === "certified") {
    return "rounded-full bg-green-700 px-2.5 py-1 text-xs font-semibold text-white";
  }
  if (status === "under_review") {
    return "rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800";
  }
  if (status === "rejected" || status === "changes_requested") {
    return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900";
  }
  return "rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600";
}

function RequesterTaskRow({
  opportunity,
  locale,
}: {
  opportunity: RequesterOpportunity;
  locale: string;
}) {
  return (
    <article className="grid gap-4 p-5 xl:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-stone-950">{opportunity.title}</h3>
          <span className={statusBadgeClass(opportunity.status)}>
            {opportunity.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          {formatDateTime(opportunity.startAt, locale)} ·{" "}
          {formatLocation(opportunity.city, opportunity.prefecture, locale)}
        </p>
        <p className="mt-2 text-sm text-stone-700">
          {locale === "en"
            ? `${opportunity._count.applications} applicant(s), ${opportunity.volunteersNeeded} needed`
            : `応募者 ${opportunity._count.applications} 名 / 募集 ${opportunity.volunteersNeeded} 名`}
        </p>
        {opportunity.status === "COMPLETED" && (
          <CompletedTaskCharts opportunity={opportunity} locale={locale} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <Link
          href={`/${locale}/dashboard/opportunities/${opportunity.id}`}
          className="rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          {locale === "en" ? "Applicants" : "応募者"}
        </Link>
        <Link
          href={`/${locale}/dashboard/opportunities/${opportunity.id}/edit`}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-600 hover:text-green-700"
        >
          {locale === "en" ? "Edit" : "編集"}
        </Link>
        {opportunity.status !== "OPEN" && opportunity.status !== "COMPLETED" && (
          <OpportunityStatusForm
            locale={locale}
            opportunityId={opportunity.id}
            actionName="publish"
            label={locale === "en" ? "Publish" : "公開"}
          />
        )}
        {opportunity.status === "OPEN" && (
          <OpportunityStatusForm
            locale={locale}
            opportunityId={opportunity.id}
            actionName="pause"
            label={locale === "en" ? "Pause" : "停止"}
          />
        )}
        {opportunity.status !== "COMPLETED" && (
          <OpportunityStatusForm
            locale={locale}
            opportunityId={opportunity.id}
            actionName="complete"
            label={locale === "en" ? "Complete" : "完了"}
          />
        )}
        <form action={copyOpportunity}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="opportunityId" value={opportunity.id} />
          <button
            type="submit"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-600 hover:text-green-700"
          >
            {locale === "en" ? "Copy" : "コピー"}
          </button>
        </form>
      </div>
    </article>
  );
}

function CompletedTaskCharts({
  opportunity,
  locale,
}: {
  opportunity: RequesterOpportunity;
  locale: string;
}) {
  const total = opportunity.applications.length;
  const accepted = opportunity.applications.filter(
    (application) => application.status === "ACCEPTED",
  ).length;
  const attended = opportunity.applications.filter(
    (application) => application.attendanceStatus === "ATTENDED",
  ).length;
  const noShow = opportunity.applications.filter(
    (application) => application.attendanceStatus === "NO_SHOW",
  ).length;
  const excused = opportunity.applications.filter(
    (application) => application.attendanceStatus === "EXCUSED",
  ).length;
  const fillRate = percent(accepted, opportunity.volunteersNeeded);
  const attendanceRate = percent(attended, Math.max(accepted, 1));

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-stone-500">
            {locale === "en" ? "Completion analytics" : "完了後の分析"}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {locale === "en"
              ? "Auto-generated from applications and attendance marks."
              : "応募状況と参加実績から自動生成されます。"}
          </p>
        </div>
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-sm font-bold text-stone-950"
          style={{
            background: `conic-gradient(#15803d ${attendanceRate * 3.6}deg, #e7e5e4 0deg)`,
          }}
          aria-label={`Attendance rate ${attendanceRate}%`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-50">
            {attendanceRate}%
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ChartBar
          label={locale === "en" ? "Fill rate" : "充足率"}
          value={`${accepted}/${opportunity.volunteersNeeded}`}
          percentValue={fillRate}
        />
        <ChartBar
          label={locale === "en" ? "Attendance" : "参加率"}
          value={`${attended}/${accepted || 0}`}
          percentValue={attendanceRate}
        />
      </div>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
        <ChartChip label={locale === "en" ? "Applied" : "応募"} value={total} />
        <ChartChip label={locale === "en" ? "Accepted" : "承認"} value={accepted} />
        <ChartChip label={locale === "en" ? "No-show" : "無断欠席"} value={noShow} />
        <ChartChip label={locale === "en" ? "Excused" : "連絡欠席"} value={excused} />
      </div>
    </div>
  );
}

function ChartBar({
  label,
  value,
  percentValue,
}: {
  label: string;
  value: string;
  percentValue: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-stone-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-stone-200">
        <div
          className="h-2 rounded-full bg-green-700"
          style={{ width: `${percentValue}%` }}
        />
      </div>
    </div>
  );
}

function ChartChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2">
      <p className="font-semibold text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-stone-950">{value}</p>
    </div>
  );
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function OpportunityStatusForm({
  locale,
  opportunityId,
  actionName,
  label,
}: {
  locale: string;
  opportunityId: string;
  actionName: string;
  label: string;
}) {
  return (
    <form action={updateOpportunityStatus}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="statusAction" value={actionName} />
      <button
        type="submit"
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-600 hover:text-green-700"
      >
        {label}
      </button>
    </form>
  );
}

function statusBadgeClass(status: OpportunityStatus) {
  if (status === "OPEN") return "rounded-sm bg-green-700 px-2 py-1 text-xs font-semibold text-white";
  if (status === "DRAFT") return "rounded-sm bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600";
  if (status === "PAUSED") return "rounded-sm bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800";
  if (status === "COMPLETED") return "rounded-sm bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800";
  return "rounded-sm bg-stone-200 px-2 py-1 text-xs font-semibold text-stone-700";
}

function canUseRequesterDashboard(role?: UserRole | null) {
  return role === "REQUESTER" || role === "BOTH" || role === "ADMIN";
}

function formatDateTime(value: Date | null, locale: string) {
  if (!value) return locale === "en" ? "Date TBD" : "日時未定";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function formatLocation(
  city: string | null,
  prefecture: string | null,
  locale = "en",
) {
  return (
    [city, prefecture].filter(Boolean).join(", ") ||
    (locale === "en" ? "Location TBD" : "場所未定")
  );
}
