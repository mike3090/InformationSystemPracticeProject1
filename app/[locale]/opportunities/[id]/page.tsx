import Link from "next/link";
import { notFound } from "next/navigation";
import EventApplicationPanel from "./EventApplicationPanel";
import TaskDetailCards from "./TaskDetailCards";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getMockOpportunity,
  getOpportunityCoverImage,
} from "@/lib/mockOpportunities";
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

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const opportunity = getMockOpportunity(id);

  if (!opportunity) {
    notFound();
  }

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
          Back to opportunities
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
                    {opportunity.spotsRemaining} spots left
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
                <SectionLabel number="1" title="Basic information" />
                <p className="text-sm font-semibold text-stone-500">
                  Organized by {opportunity.organizerName}
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
                <InfoItem label="Date & time" value={opportunity.scheduleLabel} />
                <InfoItem label="Duration" value={opportunity.durationLabel} />
                <InfoItem
                  label="Capacity"
                  value={`${opportunity.spotsRemaining} of ${opportunity.volunteersNeeded} spots remaining`}
                />
                <InfoItem
                  label="Location"
                  value={`${opportunity.city}, ${opportunity.prefecture}`}
                />
              </dl>
            </div>
          </section>

          <section className="grid gap-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <SectionLabel number="2" title="Location" />
              <h2 className="mt-2 text-2xl font-bold text-stone-950">
                Plan the trip before applying
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
                The map opens with this destination pre-filled. If details change,
                the organizer will update the address before confirmation.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
              <iframe
                title={`Map preview for ${opportunity.title}`}
                src={mapEmbedUrl}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <SectionLabel number="3" title="Workspace photos" />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {opportunity.workspaceImageUrls.map((imageUrl, index) => (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={`Workspace view ${index + 1}`}
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
                <SectionLabel number="4" title="Task flow" />
                <h2 className="mt-2 text-2xl font-bold text-stone-950">
                  How the day is structured
                </h2>
              </div>
              {opportunity.aiGenerated && (
                <p className="text-xs font-medium text-stone-500">
                  Plan suggested by Restarter AI
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
                    {task.startTime} · {task.durationMinutes} min ·{" "}
                    {task.peopleNeeded} people
                  </p>
                  <p className="mt-3 text-sm leading-6 text-stone-700">
                    {task.shortDescription}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <SectionLabel number="6" title="Task cards" />
            <div className="mt-2 max-w-3xl">
              <h2 className="text-2xl font-bold text-stone-950">
                Choose the part that fits your energy
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Each task includes its effort level, working style, remaining
                places, and the practical details needed before applying.
              </p>
            </div>
            <div className="mt-6">
              <TaskDetailCards tasks={opportunity.taskFlow} />
            </div>
          </section>
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
