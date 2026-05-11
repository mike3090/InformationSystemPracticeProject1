"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getApplicationStatusCopy,
  getApplicationStatusView,
  parseSelectedTaskItems,
  type ApplicationStatusView,
} from "./applicationStatus";

export type DashboardApplicationView = {
  id: string;
  status: string;
  selectedTaskItems: unknown;
  waitlistPosition: number | null;
  createdAt: string;
  opportunity: {
    id: string;
    title: string;
    city: string | null;
    prefecture: string | null;
    address: string | null;
    startAt: string | null;
    endAt: string | null;
    status: string;
  };
};

type VolunteerApplicationsPanelProps = {
  applications: DashboardApplicationView[];
  locale: string;
  labels: {
    myApplications: string;
    applicationSummary: string;
    upcoming: string;
    past: string;
    noUpcoming: string;
    noPast: string;
    listView: string;
    calendarView: string;
    calendarEmpty: string;
  };
};

type ViewMode = "list" | "calendar";

export default function VolunteerApplicationsPanel({
  applications,
  locale,
  labels,
}: VolunteerApplicationsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [now] = useState(() => new Date());
  const confirmedApplications = applications.filter(
    (application) => application.status === "ACCEPTED",
  );
  const activeApplications = applications.filter(
    (application) =>
      application.status !== "ACCEPTED" &&
      application.status !== "REJECTED" &&
      application.status !== "WITHDRAWN",
  );
  const cancelledApplications = applications.filter(
    (application) =>
      application.status === "REJECTED" ||
      application.status === "WITHDRAWN" ||
      application.opportunity.status === "CANCELLED",
  );
  const upcomingApplications = confirmedApplications.filter((application) => {
    const endAt = parseDate(application.opportunity.endAt);
    return !endAt || endAt >= now;
  });
  const pastApplications = confirmedApplications.filter((application) => {
    const endAt = parseDate(application.opportunity.endAt);
    return endAt ? endAt < now : false;
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-950">
            {labels.myApplications}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {labels.applicationSummary}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <StatusLegend locale={locale} />
          <div className="grid grid-cols-2 rounded-lg border border-stone-200 bg-stone-100 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 ${
                viewMode === "list"
                  ? "bg-white text-stone-950 shadow-sm"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              {labels.listView}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-md px-3 py-1.5 ${
                viewMode === "calendar"
                  ? "bg-white text-stone-950 shadow-sm"
                  : "text-stone-600 hover:text-stone-950"
              }`}
            >
              {labels.calendarView}
            </button>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyApplications locale={locale} />
      ) : viewMode === "calendar" ? (
        <ApplicationsCalendar
          applications={applications}
          locale={locale}
          emptyText={labels.calendarEmpty}
        />
      ) : (
        <div className="mt-6 space-y-8">
          <ApplicationSection
            title={locale === "en" ? "My Events" : "参加予定のイベント"}
            applications={upcomingApplications}
            locale={locale}
            emptyText={labels.noUpcoming}
            linkTarget="event"
          />
          <ApplicationSection
            title={locale === "en" ? "My Applications" : "応募中"}
            applications={activeApplications}
            locale={locale}
            emptyText={
              locale === "en"
                ? "Pending and waitlisted applications will appear here."
                : "審査中・ウェイトリストの応募がここに表示されます。"
            }
          />
          <ApplicationSection
            title={labels.past}
            applications={pastApplications}
            locale={locale}
            emptyText={labels.noPast}
            linkTarget="event"
          />
          <ApplicationSection
            title={locale === "en" ? "Cancelled" : "キャンセル"}
            applications={cancelledApplications}
            locale={locale}
            emptyText={
              locale === "en"
                ? "Cancelled or withdrawn activities will appear here."
                : "キャンセル・辞退した活動がここに表示されます。"
            }
          />
        </div>
      )}
    </section>
  );
}

function ApplicationsCalendar({
  applications,
  locale,
  emptyText,
}: {
  applications: DashboardApplicationView[];
  locale: string;
  emptyText: string;
}) {
  const datedApplications = applications.filter((application) =>
    Boolean(application.opportunity.startAt),
  );
  const [todayMonth] = useState(() => startOfMonth(new Date()));
  const [todayKey] = useState(() => getDayKey(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialMonth(datedApplications),
  );
  const monthCells = getMonthCells(visibleMonth);
  const applicationsByDay = groupApplicationsByDay(datedApplications);
  const monthKey = getMonthKey(visibleMonth);
  const hasVisibleItems = monthCells.some(
    (cell) => cell.inMonth && (applicationsByDay.get(getDayKey(cell.date))?.length ?? 0) > 0,
  );

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold text-stone-950">
          {formatMonth(visibleMonth, locale)}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-sm font-bold text-stone-700 hover:bg-stone-50"
            aria-label={locale === "en" ? "Previous month" : "前の月"}
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth(todayMonth)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            {locale === "en" ? "Today" : "今月"}
          </button>
          <button
            type="button"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-sm font-bold text-stone-700 hover:bg-stone-50"
            aria-label={locale === "en" ? "Next month" : "次の月"}
          >
            {">"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 border-l border-t border-stone-200 text-xs font-semibold text-stone-500">
        {getWeekdays(locale).map((day) => (
          <div key={day} className="border-b border-r border-stone-200 bg-stone-50 px-2 py-2">
            {day}
          </div>
        ))}
        {monthCells.map((cell) => {
          const key = getDayKey(cell.date);
          const dayApplications = applicationsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={`${monthKey}-${key}`}
              className={`min-h-28 border-b border-r border-stone-200 p-2 ${
                cell.inMonth ? "bg-white" : "bg-stone-50 text-stone-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? "bg-green-700 text-white" : ""
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {dayApplications.slice(0, 3).map((application) => (
                  <CalendarApplicationChip
                    key={application.id}
                    application={application}
                    locale={locale}
                  />
                ))}
                {dayApplications.length > 3 && (
                  <p className="text-xs font-semibold text-stone-500">
                    +{dayApplications.length - 3}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!hasVisibleItems && (
        <p className="mt-4 rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function CalendarApplicationChip({
  application,
  locale,
}: {
  application: DashboardApplicationView;
  locale: string;
}) {
  const statusView = getApplicationStatusView(
    application.status,
    application.opportunity.status,
    parseDate(application.opportunity.endAt),
  );
  const statusClass = calendarStatusClasses[statusView];

  return (
    <Link
      href={`/${locale}/dashboard/applications/${application.id}`}
      className={`block truncate rounded-md border px-2 py-1 text-xs font-semibold ${statusClass}`}
      title={application.opportunity.title}
    >
      {formatTime(application.opportunity.startAt, locale)} {application.opportunity.title}
    </Link>
  );
}

function ApplicationSection({
  title,
  applications,
  locale,
  emptyText,
  linkTarget = "application",
}: {
  title: string;
  applications: DashboardApplicationView[];
  locale: string;
  emptyText: string;
  linkTarget?: "application" | "event";
}) {
  return (
    <section>
      <h3 className="text-sm font-bold uppercase text-stone-500">{title}</h3>
      {applications.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 grid gap-3">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              locale={locale}
              linkTarget={linkTarget}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ApplicationCard({
  application,
  locale,
  linkTarget,
}: {
  application: DashboardApplicationView;
  locale: string;
  linkTarget: "application" | "event";
}) {
  const statusView = getApplicationStatusView(
    application.status,
    application.opportunity.status,
    parseDate(application.opportunity.endAt),
  );
  const status = getApplicationStatusCopy(statusView, locale);
  const selectedTasks = parseSelectedTaskItems(application.selectedTaskItems);
  const taskLabel =
    selectedTasks.map((task) => task.name).join(", ") ||
    (locale === "en" ? "Task assignment pending" : "担当タスク未確定");

  return (
    <Link
      href={
        linkTarget === "event"
          ? `/${locale}/opportunities/${application.opportunity.id}`
          : `/${locale}/dashboard/applications/${application.id}`
      }
      className="grid gap-4 rounded-lg border border-stone-200 p-4 transition hover:border-green-300 hover:bg-green-50/40 md:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-stone-950">
            {application.opportunity.title}
          </h4>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-700">{taskLabel}</p>
        <p className="mt-1 text-sm text-stone-500">
          {formatDateTime(application.opportunity.startAt, locale)} ·{" "}
          {formatLocation(
            application.opportunity.city,
            application.opportunity.prefecture,
            locale,
          )}
        </p>
      </div>
      <div className="text-sm font-semibold text-green-700">
        {linkTarget === "event"
          ? locale === "en"
            ? "Open event"
            : "イベントを見る"
          : locale === "en"
            ? "View details"
            : "詳細を見る"}
      </div>
    </Link>
  );
}

function StatusLegend({ locale }: { locale: string }) {
  const views = ["pending", "confirmed", "waitlisted"] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {views.map((view) => {
        const copy = getApplicationStatusCopy(view, locale);
        return (
          <span
            key={view}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${copy.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${copy.dot}`} />
            {copy.label}
          </span>
        );
      })}
    </div>
  );
}

function EmptyApplications({ locale }: { locale: string }) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <h3 className="text-lg font-bold text-stone-950">
        {locale === "en" ? "No applications yet" : "まだ応募はありません"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        {locale === "en"
          ? "When you apply for an activity, its task, time, location, and status will appear here."
          : "活動に応募すると、担当タスク、日時、場所、現在のステータスがここに表示されます。"}
      </p>
    </div>
  );
}

const calendarStatusClasses: Record<ApplicationStatusView, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  confirmed: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
  waitlisted: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
  cancelled: "border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200",
  completed: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
};

function getInitialMonth(applications: DashboardApplicationView[]) {
  const firstUpcoming = applications
    .map((application) => parseDate(application.opportunity.startAt))
    .filter((date): date is Date => Boolean(date))
    .find((date) => date >= new Date());

  return startOfMonth(firstUpcoming ?? new Date());
}

function getMonthCells(month: Date) {
  const firstDay = startOfMonth(month);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function groupApplicationsByDay(applications: DashboardApplicationView[]) {
  const grouped = new Map<string, DashboardApplicationView[]>();

  applications.forEach((application) => {
    const startsAt = parseDate(application.opportunity.startAt);
    if (!startsAt) return;
    const key = getDayKey(startsAt);
    const current = grouped.get(key) ?? [];
    grouped.set(key, [...current, application]);
  });

  grouped.forEach((items) => {
    items.sort((first, second) => {
      const firstTime = parseDate(first.opportunity.startAt)?.getTime() ?? 0;
      const secondTime = parseDate(second.opportunity.startAt)?.getTime() ?? 0;
      return firstTime - secondTime;
    });
  });

  return grouped;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getMonthKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}`;
}

function getDayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function parseDate(value: string | null) {
  return value ? new Date(value) : null;
}

function formatMonth(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: string | null, locale: string) {
  const date = parseDate(value);
  if (!date) return locale === "en" ? "Date TBD" : "日時未定";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: string | null, locale: string) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function getWeekdays(locale: string) {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    weekday: "short",
  });
  const sunday = new Date(2026, 0, 4);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return formatter.format(date);
  });
}
