"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  getOpportunityCoverImage,
  type EffortLevel,
  type MockOpportunity,
} from "@/lib/mockOpportunities";

type DateFilter = "this-week" | "this-weekend" | "next-week";
type DurationFilter = "under-2" | "half-day" | "full-day";
type EffortFilter = EffortLevel;

const dateFilterLabels: Record<DateFilter, string> = {
  "this-week": "This week",
  "this-weekend": "This weekend",
  "next-week": "Next week",
};

const durationFilterLabels: Record<DurationFilter, string> = {
  "under-2": "Under 2 hours",
  "half-day": "2-4 hours",
  "full-day": "4+ hours",
};

const effortFilterLabels: Record<EffortFilter, string> = {
  low: "Low effort",
  medium: "Moderate effort",
  high: "High effort",
};

export default function OpportunityDiscovery({
  locale,
  opportunities,
}: {
  locale: string;
  opportunities: MockOpportunity[];
}) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<DateFilter[]>([]);
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [selectedDurations, setSelectedDurations] = useState<DurationFilter[]>([]);
  const [selectedEfforts, setSelectedEfforts] = useState<EffortFilter[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentTime] = useState(() => Date.now());

  const categories = useMemo(
    () => unique(opportunities.map((opportunity) => opportunity.category)),
    [opportunities],
  );
  const locations = useMemo(
    () =>
      unique(
        opportunities.map((opportunity) =>
          opportunity.city === opportunity.prefecture
            ? opportunity.city
            : `${opportunity.city}, ${opportunity.prefecture}`,
        ),
      ),
    [opportunities],
  );

  const filteredOpportunities = useMemo(() => {
    return opportunities
      .filter((opportunity) => new Date(opportunity.startsAt).getTime() > currentTime)
      .filter((opportunity) =>
        selectedCategories.length === 0
          ? true
          : selectedCategories.includes(opportunity.category),
      )
      .filter((opportunity) => {
        if (selectedLocations.length === 0) return true;
        const label =
          opportunity.city === opportunity.prefecture
            ? opportunity.city
            : `${opportunity.city}, ${opportunity.prefecture}`;
        return selectedLocations.includes(label);
      })
      .filter((opportunity) =>
        selectedDates.length === 0
          ? true
          : selectedDates.some((dateFilter) => isInDateWindow(opportunity.startsAt, dateFilter)),
      )
      .filter((opportunity) =>
        isInCustomDateRange(opportunity.startsAt, dateRangeStart, dateRangeEnd),
      )
      .filter((opportunity) =>
        selectedDurations.length === 0
          ? true
          : selectedDurations.some((durationFilter) =>
              isInDurationWindow(getDurationMinutes(opportunity), durationFilter),
            ),
      )
      .filter((opportunity) =>
        selectedEfforts.length === 0
          ? true
          : opportunity.taskFlow.some(
              (task) =>
                selectedEfforts.includes(task.physicalEffort) ||
                selectedEfforts.includes(task.mentalEffort),
            ),
      )
      .filter((opportunity) => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return true;

        const searchableText = [
          opportunity.title,
          opportunity.organizerName,
          opportunity.category,
          opportunity.city,
          opportunity.prefecture,
          opportunity.shortDescription,
          opportunity.description,
          ...opportunity.tags,
          ...opportunity.taskFlow.flatMap((task) => [
            task.name,
            task.shortDescription,
            task.fullDescription,
            ...task.toolsProvided,
            ...task.thingsToBring,
          ]),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort(
        (first, second) =>
          new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
      )
      .slice(0, 20);
  }, [
    currentTime,
    opportunities,
    query,
    selectedCategories,
    selectedLocations,
    selectedDates,
    dateRangeStart,
    dateRangeEnd,
    selectedDurations,
    selectedEfforts,
  ]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedCategories.length > 0 ||
    selectedLocations.length > 0 ||
    selectedDates.length > 0 ||
    dateRangeStart.length > 0 ||
    dateRangeEnd.length > 0 ||
    selectedDurations.length > 0 ||
    selectedEfforts.length > 0;

  function resetAllFilters() {
    setQuery("");
    setSelectedCategories([]);
    setSelectedLocations([]);
    setSelectedDates([]);
    setDateRangeStart("");
    setDateRangeEnd("");
    setSelectedDurations([]);
    setSelectedEfforts([]);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-semibold uppercase text-stone-500">Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, category, task, or location"
              className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen((isOpen) => !isOpen)}
            className="rounded-lg border border-green-700 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? "Hide filters" : "Show filters"}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-5 grid gap-4 border-t border-stone-200 pt-5 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-4">
              <FilterGroup title="Category">
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={selectedCategories.includes(category)}
                    onClick={() => toggleValue(category, selectedCategories, setSelectedCategories)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Date">
                {(Object.keys(dateFilterLabels) as DateFilter[]).map((dateFilter) => (
                  <FilterChip
                    key={dateFilter}
                    label={dateFilterLabels[dateFilter]}
                    active={selectedDates.includes(dateFilter)}
                    onClick={() => toggleValue(dateFilter, selectedDates, setSelectedDates)}
                  />
                ))}
                <div className="grid w-full gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    type="date"
                    value={dateRangeStart}
                    onChange={(event) => setDateRangeStart(event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Start date"
                  />
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(event) => setDateRangeEnd(event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="End date"
                  />
                  {(dateRangeStart || dateRangeEnd) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeStart("");
                        setDateRangeEnd("");
                      }}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-600 hover:text-green-700"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </FilterGroup>

              <FilterGroup title="Duration">
                {(Object.keys(durationFilterLabels) as DurationFilter[]).map((durationFilter) => (
                  <FilterChip
                    key={durationFilter}
                    label={durationFilterLabels[durationFilter]}
                    active={selectedDurations.includes(durationFilter)}
                    onClick={() =>
                      toggleValue(durationFilter, selectedDurations, setSelectedDurations)
                    }
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Location">
                {locations.map((location) => (
                  <FilterChip
                    key={location}
                    label={location}
                    active={selectedLocations.includes(location)}
                    onClick={() => toggleValue(location, selectedLocations, setSelectedLocations)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Effort">
                {(Object.keys(effortFilterLabels) as EffortFilter[]).map((effortFilter) => (
                  <FilterChip
                    key={effortFilter}
                    label={effortFilterLabels[effortFilter]}
                    active={selectedEfforts.includes(effortFilter)}
                    onClick={() => toggleValue(effortFilter, selectedEfforts, setSelectedEfforts)}
                  />
                ))}
              </FilterGroup>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-sm font-semibold text-green-700 hover:text-green-600"
                >
                  Reset all filters
                </button>
              )}
            </div>

            <aside className="min-h-56 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4">
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-stone-500">
                    Map view
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-stone-950">
                    Map placeholder
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Pins will appear here after the project connects event latitude
                    and longitude from the database.
                  </p>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {filteredOpportunities.slice(0, 6).map((opportunity, index) => (
                    <span
                      key={opportunity.id}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                        opportunity.spotsRemaining === 0
                          ? "bg-stone-300 text-stone-700"
                          : "bg-green-700 text-white"
                      }`}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-600">
          Showing {filteredOpportunities.length} upcoming event
          {filteredOpportunities.length === 1 ? "" : "s"}
        </p>
      </div>

      {filteredOpportunities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              locale={locale}
              opportunity={opportunity}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">
            No matching events
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
            Try broadening the search, clearing a filter, or checking another
            date window.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  locale,
  opportunity,
}: {
  locale: string;
  opportunity: MockOpportunity;
}) {
  const isFull = opportunity.spotsRemaining <= 0;

  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <img
        src={getOpportunityCoverImage(opportunity)}
        alt=""
        className="h-40 w-full object-cover"
      />
      <div className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
            {opportunity.category}
          </span>
          {opportunity.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700"
            >
              {tag}
            </span>
          ))}
        </div>
        <h2 className="text-lg font-semibold text-stone-900">
          {opportunity.title}
        </h2>
        <dl className="mt-3 grid gap-2 text-sm text-stone-600">
          <CardFact label="Location" value={`${opportunity.city}, ${opportunity.prefecture}`} />
          <CardFact label="When" value={opportunity.scheduleLabel} />
          <CardFact label="Duration" value={opportunity.durationLabel} />
        </dl>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          {opportunity.shortDescription}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className={`rounded-sm px-2.5 py-1 text-xs font-semibold uppercase ${
              isFull
                ? "bg-stone-200 text-stone-700"
                : "bg-green-700 text-white"
            }`}
          >
            {isFull ? "Full" : `${opportunity.spotsRemaining} spots left`}
          </span>
          <Link
            href={`/${locale}/opportunities/${opportunity.id}`}
            className="text-sm font-semibold text-green-700 hover:text-green-600"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

function CardFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-800">{value}</dd>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-green-700 bg-green-700 text-white"
          : "border-stone-300 bg-white text-stone-700 hover:border-green-600 hover:text-green-700"
      }`}
    >
      {label}
    </button>
  );
}

function toggleValue<T>(
  value: T,
  selectedValues: T[],
  setSelectedValues: (values: T[]) => void,
) {
  setSelectedValues(
    selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues, value],
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort((first, second) =>
    first.localeCompare(second),
  );
}

function getDurationMinutes(opportunity: MockOpportunity) {
  return Math.round(
    (new Date(opportunity.endsAt).getTime() -
      new Date(opportunity.startsAt).getTime()) /
      60000,
  );
}

function isInDurationWindow(minutes: number, filter: DurationFilter) {
  if (filter === "under-2") return minutes < 120;
  if (filter === "half-day") return minutes >= 120 && minutes <= 240;
  return minutes > 240;
}

function isInDateWindow(value: string, filter: DateFilter) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = startOfDay(now);

  if (filter === "this-week") {
    const endOfWeek = addDays(startOfToday, 7);
    return date >= startOfToday && date < endOfWeek;
  }

  if (filter === "this-weekend") {
    const saturday = nextDayOfWeek(startOfToday, 6);
    const monday = addDays(saturday, 2);
    return date >= saturday && date < monday;
  }

  const nextWeekStart = addDays(startOfToday, 7);
  const nextWeekEnd = addDays(startOfToday, 14);
  return date >= nextWeekStart && date < nextWeekEnd;
}

function isInCustomDateRange(value: string, startValue: string, endValue: string) {
  if (!startValue && !endValue) return true;

  const date = startOfDay(new Date(value));
  const startDate = startValue ? startOfDay(new Date(startValue)) : null;
  const endDate = endValue ? startOfDay(new Date(endValue)) : null;

  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function nextDayOfWeek(date: Date, targetDay: number) {
  const distance = (targetDay - date.getDay() + 7) % 7;
  return addDays(date, distance);
}
