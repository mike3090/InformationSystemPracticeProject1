import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import EventApplicationPanel from "./EventApplicationPanel";
import TaskDetailCards from "./TaskDetailCards";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getMockOpportunity,
  getOpportunityCoverImage,
} from "@/lib/mockOpportunities";
import { localizeMockOpportunity } from "@/lib/mockOpportunityI18n";
import {
  hasArrivalGuidance,
  type ArrivalGuidance,
} from "@/lib/preEventCommunication";

type ExistingApplication = {
  status: string;
  selectedTaskItems: unknown;
  waitlistPosition: number | null;
} | null;

type VolunteerProfileSummary = {
  skills: string[];
} | null;

type FeedbackSummary = {
  count: bigint;
  taskClarity: number | null;
  preparation: number | null;
  timeWellSpent: number | null;
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("opportunities.detail");
  const rawOpportunity = getMockOpportunity(id);

  if (!rawOpportunity) {
    notFound();
  }
  const opportunity = localizeMockOpportunity(rawOpportunity, locale);

  const session = await auth();
  const userId = session?.user?.id;
  let existingApplication: ExistingApplication = null;
  let volunteerProfile: VolunteerProfileSummary = null;
  let activeApplications: {
    opportunity: { startAt: Date | null; endAt: Date | null };
  }[] = [];

  if (userId) {
    const [application, profile, conflicts] = await Promise.all([
      getExistingApplication(opportunity.id, userId),
      prisma.volunteerProfile.findUnique({
        where: { userId },
        select: { skills: true },
      }),
      getActiveApplicationTimes(opportunity.id, userId),
    ]);
    existingApplication = application;
    volunteerProfile = profile;
    activeApplications = conflicts.map((conflict) => ({
      opportunity: conflict,
    }));
  }
  const opportunityStart = new Date(opportunity.startsAt);
  const opportunityEnd = new Date(opportunity.endsAt);
  const hasScheduleConflict = activeApplications.some(({ opportunity }) => {
    if (!opportunity.startAt || !opportunity.endAt) return false;
    return opportunity.startAt < opportunityEnd && opportunity.endAt > opportunityStart;
  });
  const callbackPath = `/${locale}/opportunities/${opportunity.id}`;
  const signInHref = `/${locale}/auth/signin?callbackUrl=${encodeURIComponent(
    callbackPath,
  )}`;

  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    opportunity.address,
  )}&output=embed`;
  const arrivalGuidance = getMockArrivalGuidance(opportunity);
  const feedbackSummary = await getFeedbackSummary(opportunity.id);
  const showArrivalGuidance =
    existingApplication?.status === "ACCEPTED" &&
    hasArrivalGuidance(arrivalGuidance);

  return (
    <div className="bg-stone-50 pb-28 md:pb-0">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href={`/${locale}/opportunities`}
          className="text-sm font-semibold text-green-700 hover:text-green-600"
        >
          {t("back")}
        </Link>

        <article className="mt-6 space-y-6">
          <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="relative">
              <img
                src={getOpportunityCoverImage(opportunity)}
                alt=""
                className="h-72 w-full object-cover md:h-96"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-6 text-white">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-sm bg-white/20 px-2.5 py-1">
                    {opportunity.category}
                  </span>
                  {opportunity.trustedOrganizer && (
                    <span className="rounded-sm bg-green-600 px-2.5 py-1 text-white">
                      {locale === "en" ? "Trusted" : "信頼済み"}
                    </span>
                  )}
                  <span className="rounded-sm bg-white/20 px-2.5 py-1">
                    {t("spotsLeft", { count: opportunity.spotsRemaining })}
                  </span>
                </div>
                <h1 className="mt-3 max-w-3xl text-3xl font-bold md:text-5xl">
                  {opportunity.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-100 md:text-base">
                  {opportunity.shortDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-6 border-b border-stone-200 p-6 md:grid-cols-[1.4fr_1fr]">
              <div>
                <SectionLabel number="1" title={t("basic.title")} />
                <p className="text-sm font-semibold text-stone-500">
                  {t("basic.organizedBy", { name: opportunity.organizerName })}
                  {opportunity.trustedOrganizer && (
                    <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                      {locale === "en" ? "Trusted" : "信頼済み"}
                    </span>
                  )}
                </p>
                <p className="mt-4 text-base leading-7 text-stone-700">
                  {opportunity.description}
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 md:grid-cols-1">
                <InfoItem
                  label={t("facts.dateTime")}
                  value={formatDateRange(opportunity.startsAt, opportunity.endsAt, locale)}
                />
                <InfoItem
                  label={t("facts.duration")}
                  value={formatDuration(opportunity.startsAt, opportunity.endsAt, locale)}
                />
                <InfoItem
                  label={t("facts.capacity")}
                  value={t("capacityValue", {
                    remaining: opportunity.spotsRemaining,
                    total: opportunity.volunteersNeeded,
                  })}
                />
                <InfoItem
                  label={t("facts.location")}
                  value={`${opportunity.city}, ${opportunity.prefecture}`}
                />
              </dl>
            </div>
          </section>

          <section className="grid gap-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel number="2" title={t("location.title")} />
              <h2 className="mt-2 text-2xl font-bold text-stone-950">
                {t("location.heading")}
              </h2>
              <a
                href={opportunity.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-semibold text-green-700 hover:text-green-600"
              >
                {opportunity.address}
              </a>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {t("location.body")}
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
              <iframe
                title={t("location.mapTitle", { title: opportunity.title })}
                src={mapEmbedUrl}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <SectionLabel number="3" title={t("photos.title")} />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {opportunity.workspaceImageUrls.map((imageUrl, index) => (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={t("photos.alt", { number: index + 1 })}
                  loading="lazy"
                  className="h-56 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </section>

          {showArrivalGuidance && (
            <ArrivalGuidanceSection
              guidance={arrivalGuidance}
              locale={locale}
            />
          )}

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionLabel number="4" title={t("flow.title")} />
                <h2 className="mt-2 text-2xl font-bold text-stone-950">
                  {t("flow.heading")}
                </h2>
              </div>
              {opportunity.aiGenerated && (
                <p className="text-xs font-medium text-stone-500">
                  {t("flow.aiSuggested")}
                </p>
              )}
            </div>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {opportunity.taskFlow.map((task, index) => (
                <li
                  key={task.id}
                  className="relative rounded-lg border border-stone-200 p-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-green-700 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 font-semibold text-stone-950">{task.name}</h3>
                  <p className="mt-1 text-sm text-stone-600">
                    {task.startTime} · {formatMinutes(task.durationMinutes, locale)} ·{" "}
                    {t("people", { count: task.peopleNeeded })}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-stone-700">
                    {task.shortDescription}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <SectionLabel number="6" title={t("cards.title")} />
            <div className="mt-2 max-w-3xl">
              <h2 className="text-2xl font-bold text-stone-950">
                {t("cards.heading")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {t("cards.body")}
              </p>
            </div>
            <div className="mt-6">
              <TaskDetailCards tasks={opportunity.taskFlow} />
            </div>
          </section>

          {feedbackSummary && Number(feedbackSummary.count) > 0 && (
            <FeedbackSummarySection
              summary={feedbackSummary}
              locale={locale}
            />
          )}
        </article>
      </div>
      <EventApplicationPanel
        locale={locale}
        opportunity={opportunity}
        isSignedIn={Boolean(userId)}
        signInHref={signInHref}
        existingApplication={existingApplication}
        profileSkills={volunteerProfile?.skills ?? []}
        hasScheduleConflict={hasScheduleConflict}
      />
    </div>
  );
}

async function getFeedbackSummary(opportunityId: string) {
  try {
    const rows = await prisma.$queryRaw<FeedbackSummary[]>`
      SELECT
        COUNT(*)::bigint AS "count",
        AVG("taskClarityRating") AS "taskClarity",
        AVG("preparationRating") AS "preparation",
        AVG("timeWellSpentRating") AS "timeWellSpent"
      FROM "PostEventReflection"
      WHERE "opportunityId" = ${opportunityId}
        AND (
          "taskClarityRating" IS NOT NULL
          OR "preparationRating" IS NOT NULL
          OR "timeWellSpentRating" IS NOT NULL
        )
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function FeedbackSummarySection({
  summary,
  locale,
}: {
  summary: FeedbackSummary;
  locale: string;
}) {
  const items = [
    {
      label: locale === "en" ? "Task clarity" : "タスクの明確さ",
      value: summary.taskClarity,
    },
    {
      label: locale === "en" ? "Preparation" : "準備",
      value: summary.preparation,
    },
    {
      label: locale === "en" ? "Time well spent" : "充実した時間",
      value: summary.timeWellSpent,
    },
  ];

  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
      <SectionLabel
        number="7"
        title={locale === "en" ? "Volunteer feedback" : "参加者フィードバック"}
      />
      <h2 className="mt-2 text-2xl font-bold text-stone-950">
        {locale === "en"
          ? "What past volunteers reported"
          : "過去の参加者による評価"}
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        {locale === "en"
          ? `${Number(summary.count)} anonymous reflection(s)`
          : `${Number(summary.count)}件の匿名フィードバック`}
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-stone-950">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">
              {formatRating(item.value)}
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              {locale === "en" ? "3-point quick rating" : "3段階の簡単評価"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatRating(value: number | null) {
  if (value === null) return "-";
  return `${Number(value).toFixed(1)} / 3`;
}

function getMockArrivalGuidance(
  opportunity: NonNullable<ReturnType<typeof getMockOpportunity>>,
): ArrivalGuidance {
  return {
    arrivalGuidance: opportunity.arrivalGuidance ?? null,
    firstLandmarkDescription: opportunity.firstLandmarkDescription ?? null,
    firstLandmarkImageUrl: opportunity.firstLandmarkImageUrl ?? null,
    firstContactName: opportunity.firstContactName ?? null,
    firstContactRole: opportunity.firstContactRole ?? null,
    firstContactImageUrl: opportunity.firstContactImageUrl ?? null,
    thingsToBring: opportunity.thingsToBring ?? [],
  };
}

function ArrivalGuidanceSection({
  guidance,
  locale,
}: {
  guidance: ArrivalGuidance;
  locale: string;
}) {
  return (
    <section className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
      <SectionLabel
        number="3A"
        title={locale === "en" ? "When you arrive" : "到着したら"}
      />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {guidance.arrivalGuidance && (
            <p className="text-sm leading-6 text-green-950">
              {guidance.arrivalGuidance}
            </p>
          )}
          {guidance.firstLandmarkDescription && (
            <div className="mt-4 rounded-lg border border-green-200 bg-white/70 p-4">
              <h3 className="font-semibold text-green-950">
                {locale === "en" ? "First landmark" : "最初の目印"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-green-900">
                {guidance.firstLandmarkDescription}
              </p>
            </div>
          )}
          {(guidance.firstContactName || guidance.firstContactRole) && (
            <div className="mt-4 flex items-center gap-4 rounded-lg border border-green-200 bg-white/70 p-4">
              {guidance.firstContactImageUrl && (
                <img
                  src={guidance.firstContactImageUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="font-semibold text-green-950">
                  {guidance.firstContactName ||
                    (locale === "en" ? "First contact" : "最初に会う人")}
                </h3>
                {guidance.firstContactRole && (
                  <p className="mt-1 text-sm text-green-900">
                    {guidance.firstContactRole}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        {guidance.firstLandmarkImageUrl && (
          <img
            src={guidance.firstLandmarkImageUrl}
            alt=""
            className="h-72 w-full rounded-lg object-cover"
          />
        )}
      </div>
    </section>
  );
}

async function getExistingApplication(
  opportunityId: string,
  userId: string,
): Promise<ExistingApplication> {
  try {
    const applications = await prisma.$queryRaw<NonNullable<ExistingApplication>[]>`
      SELECT
        "status",
        "selectedTaskItems" AS "selectedTaskItems",
        "waitlistPosition" AS "waitlistPosition"
      FROM "Application"
      WHERE "opportunityId" = ${opportunityId}
        AND "volunteerId" = ${userId}
      LIMIT 1
    `;
    return applications[0] ?? null;
  } catch {
    const applications = await prisma.application.findUnique({
      where: {
        opportunityId_volunteerId: {
          opportunityId,
          volunteerId: userId,
        },
      },
      select: { status: true },
    });

    return applications
      ? {
          status: applications.status,
          selectedTaskItems: [],
          waitlistPosition: null,
        }
      : null;
  }
}

async function getActiveApplicationTimes(opportunityId: string, userId: string) {
  try {
    return await prisma.$queryRaw<{ startAt: Date | null; endAt: Date | null }[]>`
      SELECT o."startAt", o."endAt"
      FROM "Application" a
      INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
      WHERE a."volunteerId" = ${userId}
        AND a."opportunityId" <> ${opportunityId}
        AND a."status" IN ('PENDING', 'ACCEPTED', 'WAITLISTED')
    `;
  } catch {
    return prisma.application.findMany({
      where: {
        volunteerId: userId,
        opportunityId: { not: opportunityId },
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      select: {
        opportunity: {
          select: {
            startAt: true,
            endAt: true,
          },
        },
      },
    }).then((applications) =>
      applications.map((application) => application.opportunity),
    );
  }
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function SectionLabel({ number, title }: { number: string; title: string }) {
  return (
    <p className="text-xs font-bold uppercase text-green-700">
      {number}. {title}
    </p>
  );
}

function formatDateRange(startValue: string, endValue: string, locale: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const startLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

function formatDuration(startValue: string, endValue: string, locale: string) {
  const minutes = Math.round(
    (new Date(endValue).getTime() - new Date(startValue).getTime()) / 60000,
  );
  return formatMinutes(minutes, locale);
}

function formatMinutes(minutes: number, locale: string) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (locale === "en") {
    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
  }

  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}
