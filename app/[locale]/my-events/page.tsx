import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSelectedTaskItems } from "../dashboard/applicationStatus";

type MyEventRow = {
  applicationId: string;
  applicationStatus: string;
  selectedTaskItems: unknown;
  waitlistPosition: number | null;
  opportunityId: string;
  opportunityTitle: string;
  opportunityCity: string | null;
  opportunityPrefecture: string | null;
  opportunityAddress: string | null;
  opportunityStartAt: Date | null;
  opportunityEndAt: Date | null;
  opportunityStatus: string;
  volunteersNeeded: number;
  acceptedCount: bigint;
  reflectionId: string | null;
};

export default async function MyEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/my-events`);
  }

  const rows = await getMyEvents(session.user.id);
  const now = new Date();
  const copy = locale === "en" ? englishCopy : japaneseCopy;

  const cancelled = rows.filter(
    (event) =>
      event.applicationStatus === "WITHDRAWN" ||
      event.opportunityStatus === "CANCELLED",
  );
  const active = rows.filter((event) => !cancelled.includes(event));
  const upcoming = active.filter((event) => !isPastEvent(event, now));
  const past = active.filter((event) => isPastEvent(event, now));

  return (
    <main className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
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
            href={`/${locale}/opportunities`}
            className="inline-flex items-center justify-center rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {copy.opportunities}
          </Link>
        </div>

        <div className="mt-8 space-y-8">
          <MyEventSection
            title={copy.upcoming}
            emptyText={copy.noUpcoming}
            events={upcoming}
            locale={locale}
          />
          <MyEventSection
            title={copy.past}
            emptyText={copy.noPast}
            events={past}
            locale={locale}
          />
          <MyEventSection
            title={copy.cancelled}
            emptyText={copy.noCancelled}
            events={cancelled}
            locale={locale}
          />
        </div>
      </div>
    </main>
  );
}

async function getMyEvents(userId: string) {
  try {
    return await prisma.$queryRaw<MyEventRow[]>`
      SELECT
        a."id" AS "applicationId",
        a."status"::text AS "applicationStatus",
        a."selectedTaskItems" AS "selectedTaskItems",
        a."waitlistPosition" AS "waitlistPosition",
        o."id" AS "opportunityId",
        o."title" AS "opportunityTitle",
        o."city" AS "opportunityCity",
        o."prefecture" AS "opportunityPrefecture",
        o."address" AS "opportunityAddress",
        o."startAt" AS "opportunityStartAt",
        o."endAt" AS "opportunityEndAt",
        o."status"::text AS "opportunityStatus",
        o."volunteersNeeded" AS "volunteersNeeded",
        r."id" AS "reflectionId",
        (
          SELECT COUNT(*)::bigint
          FROM "Application" accepted
          WHERE accepted."opportunityId" = o."id"
            AND accepted."status" = 'ACCEPTED'::"ApplicationStatus"
        ) AS "acceptedCount"
      FROM "Application" a
      INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
      LEFT JOIN "PostEventReflection" r ON r."applicationId" = a."id"
      WHERE a."volunteerId" = ${userId}
        AND a."status" IN (
          'ACCEPTED'::"ApplicationStatus",
          'WITHDRAWN'::"ApplicationStatus"
        )
      ORDER BY COALESCE(o."startAt", a."createdAt") ASC
    `;
  } catch {
    return await prisma.$queryRaw<MyEventRow[]>`
      SELECT
        a."id" AS "applicationId",
        a."status"::text AS "applicationStatus",
        a."selectedTaskItems" AS "selectedTaskItems",
        a."waitlistPosition" AS "waitlistPosition",
        o."id" AS "opportunityId",
        o."title" AS "opportunityTitle",
        o."city" AS "opportunityCity",
        o."prefecture" AS "opportunityPrefecture",
        o."address" AS "opportunityAddress",
        o."startAt" AS "opportunityStartAt",
        o."endAt" AS "opportunityEndAt",
        o."status"::text AS "opportunityStatus",
        o."volunteersNeeded" AS "volunteersNeeded",
        NULL AS "reflectionId",
        (
          SELECT COUNT(*)::bigint
          FROM "Application" accepted
          WHERE accepted."opportunityId" = o."id"
            AND accepted."status" = 'ACCEPTED'::"ApplicationStatus"
        ) AS "acceptedCount"
      FROM "Application" a
      INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
      WHERE a."volunteerId" = ${userId}
        AND a."status" IN (
          'ACCEPTED'::"ApplicationStatus",
          'WITHDRAWN'::"ApplicationStatus"
        )
      ORDER BY COALESCE(o."startAt", a."createdAt") ASC
    `;
  }
}

function MyEventSection({
  title,
  emptyText,
  events,
  locale,
}: {
  title: string;
  emptyText: string;
  events: MyEventRow[];
  locale: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-950">{title}</h2>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
          {events.length}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
          {emptyText}
        </p>
      ) : (
        <div className="mt-5 grid gap-4">
          {events.map((event) => (
            <MyEventCard key={event.applicationId} event={event} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}

function MyEventCard({
  event,
  locale,
}: {
  event: MyEventRow;
  locale: string;
}) {
  const copy = locale === "en" ? englishCopy : japaneseCopy;
  const tasks = parseSelectedTaskItems(event.selectedTaskItems);
  const location =
    event.opportunityAddress ||
    [event.opportunityCity, event.opportunityPrefecture].filter(Boolean).join(", ");
  const spotsStatus = `${Number(event.acceptedCount)}/${event.volunteersNeeded}`;
  const cancelled =
    event.applicationStatus === "WITHDRAWN" ||
    event.opportunityStatus === "CANCELLED";
  const isPast = isPastEvent(event, new Date());

  return (
    <article className="rounded-lg border border-stone-200 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-stone-950">
              {event.opportunityTitle}
            </h3>
            {cancelled && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                {copy.cancelledLabel}
              </span>
            )}
          </div>
          <dl className="mt-3 grid gap-3 text-sm text-stone-600 md:grid-cols-2">
            <InfoItem
              label={copy.dateTime}
              value={formatDateRange(
                event.opportunityStartAt,
                event.opportunityEndAt,
                locale,
              )}
            />
            <InfoItem label={copy.location} value={location || copy.notSet} />
            <InfoItem
              label={copy.task}
              value={
                tasks.length > 0
                  ? tasks.map((task) => task.name).join(", ")
                  : copy.taskPending
              }
            />
            <InfoItem label={copy.spots} value={spotsStatus} />
          </dl>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isPast && !cancelled && (
            <Link
              href={`/${locale}/reflections/${event.applicationId}`}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              {locale === "en"
                ? event.reflectionId
                  ? "View record"
                  : "Participation record"
                : "参加記録"}
            </Link>
          )}
          {isPast && !cancelled && (
            <Link
              href={`/${locale}/experiences/new?applicationId=${event.applicationId}`}
              className="rounded-lg border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              {locale === "en" ? "Write experience" : "経験投稿"}
            </Link>
          )}
          <Link
            href={`/${locale}/opportunities/${event.opportunityId}`}
            className={`rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 ${
              isPast && !cancelled ? "hidden" : ""
            }`}
          >
            {copy.viewEvent}
          </Link>
          <Link
            href={`/${locale}/my-events/applications/${event.applicationId}`}
            className={`rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600 ${
              isPast || cancelled ? "hidden" : ""
            }`}
          >
            {copy.communication}
          </Link>
        </div>
      </div>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-stone-800">{value}</dd>
    </div>
  );
}

function isPastEvent(event: MyEventRow, now: Date) {
  return (
    event.opportunityStatus === "COMPLETED" ||
    Boolean(event.opportunityEndAt && event.opportunityEndAt < now)
  );
}

function formatDateRange(startAt: Date | null, endAt: Date | null, locale: string) {
  if (!startAt && !endAt) return locale === "en" ? "Date TBD" : "日時未定";
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en" : "ja", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (startAt && endAt) {
    return `${formatter.format(startAt)} - ${formatter.format(endAt)}`;
  }
  return formatter.format(startAt ?? endAt ?? new Date());
}

const englishCopy = {
  eyebrow: "Pre-event communication",
  title: "My Events",
  intro:
    "See confirmed volunteer commitments in one place, including schedule, location, task, and communication details.",
  opportunities: "Find more opportunities",
  upcoming: "Upcoming Events",
  past: "Past Events",
  cancelled: "Cancelled",
  noUpcoming: "Confirmed upcoming events will appear here.",
  noPast: "Past confirmed events will appear here after they finish.",
  noCancelled: "Withdrawn or cancelled events will appear here.",
  cancelledLabel: "Cancelled",
  dateTime: "Date & time",
  location: "Location",
  task: "Task assigned",
  spots: "Spots status",
  viewEvent: "View event",
  communication: "Guidance & messages",
  reflect: "Reflect",
  viewReflection: "View reflection",
  taskPending: "Task not assigned yet",
  notSet: "Not set",
};

const japaneseCopy = {
  eyebrow: "活動前コミュニケーション",
  title: "マイイベント",
  intro:
    "確認済みの参加予定を一か所で確認できます。日時、場所、担当タスク、連絡情報をまとめて表示します。",
  opportunities: "募集を探す",
  upcoming: "今後のイベント",
  past: "過去のイベント",
  cancelled: "Cancelled",
  noUpcoming: "確認済みの今後の活動がここに表示されます。",
  noPast: "終了した確認済み活動がここに表示されます。",
  noCancelled: "辞退またはキャンセルされた活動がここに表示されます。",
  cancelledLabel: "Cancelled",
  dateTime: "日時",
  location: "場所",
  task: "担当タスク",
  spots: "参加枠",
  viewEvent: "活動を見る",
  communication: "指引・メッセージ",
  taskPending: "タスク未設定",
  notSet: "未設定",
};
