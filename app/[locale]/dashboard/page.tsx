import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { OpportunityStatus, UserRole } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import VolunteerApplicationsPanel, {
  type DashboardApplicationView,
} from "./VolunteerApplicationsPanel";

type DashboardApplication = {
  id: string;
  status: string;
  selectedTaskItems: unknown;
  confirmedTimeCommitment: boolean;
  waitlistPosition: number | null;
  createdAt: Date;
  opportunity: {
    title: string;
    city: string | null;
    prefecture: string | null;
    address: string | null;
    startAt: Date | null;
    endAt: Date | null;
    status: OpportunityStatus;
  };
};

type RawDashboardApplication = {
  id: string;
  status: string;
  selectedTaskItems: unknown;
  confirmedTimeCommitment: boolean;
  waitlistPosition: number | null;
  createdAt: Date;
  opportunityTitle: string;
  opportunityCity: string | null;
  opportunityPrefecture: string | null;
  opportunityAddress: string | null;
  opportunityStartAt: Date | null;
  opportunityEndAt: Date | null;
  opportunityStatus: OpportunityStatus;
};

type RequesterOpportunity = {
  id: string;
  title: string;
  status: OpportunityStatus;
  startAt: Date | null;
  city: string | null;
  prefecture: string | null;
  _count: { applications: number };
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

  const [t, user, applications, requesterOpportunities] = await Promise.all([
    getTranslations("dashboard"),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true },
    }),
    getDashboardApplications(session.user.id),
    prisma.opportunity.findMany({
      where: { requesterId: session.user.id },
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        startAt: true,
        city: true,
        prefecture: true,
        _count: { select: { applications: true } },
      },
      take: 6,
    }),
  ]);

  const role = user?.role ?? session.user.role;
  const showVolunteerDashboard = canUseVolunteerDashboard(role);
  const showRequesterDashboard = canUseRequesterDashboard(role);
  const applicationViews = applications.map(serializeDashboardApplication);

  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-950">
              {showVolunteerDashboard
                ? t("volunteer.title")
                : t("requester.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {showVolunteerDashboard
                ? t("volunteer.intro")
                : t("requester.intro")}
            </p>
          </div>
          <Link
            href={
              showVolunteerDashboard
                ? `/${locale}/opportunities`
                : `/${locale}/opportunities/new`
            }
            className="inline-flex items-center justify-center rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {showVolunteerDashboard
              ? t("volunteer.findMore")
              : t("requester.postOpportunity")}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          {showVolunteerDashboard && (
            <VolunteerApplicationsPanel
              applications={applicationViews}
              locale={locale}
              labels={{
                myApplications: t("volunteer.myApplications"),
                applicationSummary: t("volunteer.applicationSummary", {
                  count: applications.length,
                }),
                upcoming: t("volunteer.upcoming"),
                past: t("volunteer.past"),
                noUpcoming: t("volunteer.noUpcoming"),
                noPast: t("volunteer.noPast"),
                listView: t("volunteer.listView"),
                calendarView: t("volunteer.calendarView"),
                calendarEmpty: t("volunteer.calendarEmpty"),
              }}
            />
          )}

          <aside className="space-y-6">
            {showRequesterDashboard && (
              <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-950">
                  {t("requester.myOpportunities")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {t("requester.intro")}
                </p>
                <div className="mt-5 space-y-3">
                  {requesterOpportunities.length === 0 ? (
                    <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
                      {t("requester.empty")}
                    </p>
                  ) : (
                    requesterOpportunities.map((opportunity) => (
                      <RequesterOpportunityRow
                        key={opportunity.id}
                        opportunity={opportunity}
                        locale={locale}
                      />
                    ))
                  )}
                </div>
              </section>
            )}

            <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-stone-950">
                {t("volunteer.recommended")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {t("volunteer.recommendedIntro")}
              </p>
              <Link
                href={`/${locale}/opportunities`}
                className="mt-4 inline-flex text-sm font-semibold text-green-700 hover:text-green-600"
              >
                {t("volunteer.findMore")}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function serializeDashboardApplication(
  application: DashboardApplication,
): DashboardApplicationView {
  return {
    id: application.id,
    status: application.status,
    selectedTaskItems: application.selectedTaskItems,
    waitlistPosition: application.waitlistPosition,
    createdAt: application.createdAt.toISOString(),
    opportunity: {
      title: application.opportunity.title,
      city: application.opportunity.city,
      prefecture: application.opportunity.prefecture,
      address: application.opportunity.address,
      startAt: application.opportunity.startAt?.toISOString() ?? null,
      endAt: application.opportunity.endAt?.toISOString() ?? null,
      status: application.opportunity.status,
    },
  };
}

async function getDashboardApplications(userId: string): Promise<DashboardApplication[]> {
  const rows = await prisma.$queryRaw<RawDashboardApplication[]>`
    SELECT
      a."id",
      a."status"::text AS "status",
      a."selectedTaskItems" AS "selectedTaskItems",
      a."confirmedTimeCommitment" AS "confirmedTimeCommitment",
      a."waitlistPosition" AS "waitlistPosition",
      a."createdAt" AS "createdAt",
      o."title" AS "opportunityTitle",
      o."city" AS "opportunityCity",
      o."prefecture" AS "opportunityPrefecture",
      o."address" AS "opportunityAddress",
      o."startAt" AS "opportunityStartAt",
      o."endAt" AS "opportunityEndAt",
      o."status" AS "opportunityStatus"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."volunteerId" = ${userId}
    ORDER BY o."startAt" ASC NULLS LAST, a."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    selectedTaskItems: row.selectedTaskItems,
    confirmedTimeCommitment: row.confirmedTimeCommitment,
    waitlistPosition: row.waitlistPosition,
    createdAt: row.createdAt,
    opportunity: {
      title: row.opportunityTitle,
      city: row.opportunityCity,
      prefecture: row.opportunityPrefecture,
      address: row.opportunityAddress,
      startAt: row.opportunityStartAt,
      endAt: row.opportunityEndAt,
      status: row.opportunityStatus,
    },
  }));
}

function RequesterOpportunityRow({
  opportunity,
  locale,
}: {
  opportunity: RequesterOpportunity;
  locale: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-stone-950">{opportunity.title}</h3>
        <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
          {opportunity.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {formatDateTime(opportunity.startAt, locale)} ·{" "}
        {formatLocation(opportunity.city, opportunity.prefecture, locale)}
      </p>
      <p className="mt-2 text-sm font-medium text-stone-700">
        {locale === "en"
          ? `${opportunity._count.applications} applicant(s)`
          : `応募者 ${opportunity._count.applications} 名`}
      </p>
    </div>
  );
}

function canUseVolunteerDashboard(role?: UserRole | null) {
  return role === "VOLUNTEER" || role === "BOTH" || role === "ADMIN";
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
