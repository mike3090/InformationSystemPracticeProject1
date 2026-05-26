"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export type EffortLevel = "low" | "medium" | "high";

export type DiscoveryOpportunity = {
  id: string;
  title: string;
  organizerName: string;
  trustedOrganizer: boolean;
  category: string;
  city: string;
  prefecture: string;
  shortDescription: string;
  description: string;
  coverImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  volunteersNeeded: number;
  spotsRemaining: number;
  tags: string[];
  physicalEffort: EffortLevel;
  mentalEffort: EffortLevel;
  matchScore?: number; // 0–100, server-side Jaccard score; undefined = not signed in / no profile
};

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1400&q=80";

type DateFilter = "this-week" | "this-weekend" | "next-week";
type DurationFilter = "under-2" | "half-day" | "full-day";
type EffortFilter = EffortLevel;
type SortMode = "date" | "match";

type AiRanking = { score: number; aiPick: boolean; reason: string };
type AiStatus = "idle" | "loading" | "done" | "error";

export default function OpportunityDiscovery({
  locale,
  opportunities,
  hasVolunteerProfile,
}: {
  locale: string;
  opportunities: DiscoveryOpportunity[];
  hasVolunteerProfile?: boolean;
}) {
  const t = useTranslations("opportunities.discovery");
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
  const [sortMode, setSortMode] = useState<SortMode>("date");

  // AI recommendations state
  const [aiRankings, setAiRankings] = useState<Record<string, AiRanking>>({});
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");

  // Restore AI rankings from sessionStorage on mount (survives page refresh)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("opportunity-ai-rankings");
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, AiRanking>;
        setAiRankings(parsed);
        setAiStatus("done");
        setSortMode("match");
      }
    } catch {
      // ignore — storage unavailable or corrupt
    }
  }, []);

  // Persist AI rankings to sessionStorage whenever they are updated
  useEffect(() => {
    if (aiStatus === "done" && Object.keys(aiRankings).length > 0) {
      try {
        sessionStorage.setItem("opportunity-ai-rankings", JSON.stringify(aiRankings));
      } catch {
        // ignore — storage quota or unavailable
      }
    }
  }, [aiRankings, aiStatus]);

  const isEn = locale === "en";
  const showMatchFeature = hasVolunteerProfile || opportunities.some((o) => o.matchScore !== undefined);

  const dateFilterLabels: Record<DateFilter, string> = {
    "this-week": t("date.thisWeek"),
    "this-weekend": t("date.thisWeekend"),
    "next-week": t("date.nextWeek"),
  };
  const durationFilterLabels: Record<DurationFilter, string> = {
    "under-2": t("duration.under2"),
    "half-day": t("duration.halfDay"),
    "full-day": t("duration.fullDay"),
  };
  const effortFilterLabels: Record<EffortFilter, string> = {
    low: t("effort.low"),
    medium: t("effort.medium"),
    high: t("effort.high"),
  };

  const categories = useMemo(
    () => unique(opportunities.map((opportunity) => opportunity.category)),
    [opportunities],
  );
  const locations = useMemo(
    () =>
      unique(
        opportunities
          .filter((opportunity) => opportunity.city || opportunity.prefecture)
          .map((opportunity) =>
            !opportunity.city || opportunity.city === opportunity.prefecture
              ? opportunity.prefecture
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
          : selectedEfforts.includes(opportunity.physicalEffort) ||
            selectedEfforts.includes(opportunity.mentalEffort),
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
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((first, second) => {
        if (sortMode === "match") {
          const scoreA = aiRankings[first.id]?.score ?? first.matchScore ?? 0;
          const scoreB = aiRankings[second.id]?.score ?? second.matchScore ?? 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
        }
        return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
      })
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
    sortMode,
    aiRankings,
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

  async function fetchAiRecommendations() {
    setAiStatus("loading");
    try {
      const res = await fetch("/api/ai/rank-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityIds: filteredOpportunities.map((o) => o.id),
          locale,
        }),
      });
      const result = await res.json() as
        | { ok: true; data: { rankings: { opportunityId: string; score: number; aiPick: boolean; reason: string }[] } }
        | { ok: false; error?: string };

      if (result.ok) {
        const map: Record<string, AiRanking> = {};
        for (const r of result.data.rankings) {
          map[r.opportunityId] = { score: r.score, aiPick: r.aiPick, reason: r.reason };
        }
        setAiRankings(map);
        setAiStatus("done");
        setSortMode("match");
      } else {
        setAiStatus("error");
      }
    } catch {
      setAiStatus("error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-semibold uppercase text-stone-500">
              {t("searchLabel")}
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen((isOpen) => !isOpen)}
            className="rounded-lg border border-green-700 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? t("hideFilters") : t("showFilters")}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-5 grid gap-4 border-t border-stone-200 pt-5 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-4">
              <FilterGroup title={t("category")}>
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={selectedCategories.includes(category)}
                    onClick={() => toggleValue(category, selectedCategories, setSelectedCategories)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title={t("date.label")}>
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
                    aria-label={t("startDate")}
                  />
                  <input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(event) => setDateRangeEnd(event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label={t("endDate")}
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
                      {t("clearDates")}
                    </button>
                  )}
                </div>
              </FilterGroup>

              <FilterGroup title={t("duration.label")}>
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

              <FilterGroup title={t("location")}>
                {locations.map((location) => (
                  <FilterChip
                    key={location}
                    label={location}
                    active={selectedLocations.includes(location)}
                    onClick={() => toggleValue(location, selectedLocations, setSelectedLocations)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title={t("effort.label")}>
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
                  {t("resetAll")}
                </button>
              )}
            </div>

            <aside className="overflow-hidden rounded-lg border border-stone-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2">
                <p className="text-xs font-semibold uppercase text-stone-500">
                  {t("mapView")}
                </p>
                <p className="text-xs text-stone-400">
                  {filteredOpportunities.length}{" "}
                  {isEn ? "shown" : "件表示中"}
                </p>
              </div>
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=135.58%2C34.88%2C135.90%2C35.12&layer=mapnik"
                className="h-52 w-full border-0"
                title={t("mapView")}
                loading="lazy"
              />
              {filteredOpportunities.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-stone-200 bg-white px-4 py-2">
                  {filteredOpportunities.slice(0, 9).map((opportunity, index) => (
                    <span
                      key={opportunity.id}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        opportunity.spotsRemaining === 0
                          ? "bg-stone-300 text-stone-700"
                          : "bg-green-700 text-white"
                      }`}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-600">
          {t("showing", { count: filteredOpportunities.length })}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort toggle — visible when match scores exist */}
          {showMatchFeature && (
            <div className="flex rounded-lg border border-stone-300 text-sm font-medium overflow-hidden">
              <button
                type="button"
                onClick={() => setSortMode("date")}
                className={`px-3 py-1.5 transition ${
                  sortMode === "date"
                    ? "bg-stone-800 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {isEn ? "By date" : "日付順"}
              </button>
              <button
                type="button"
                onClick={() => setSortMode("match")}
                className={`px-3 py-1.5 transition ${
                  sortMode === "match"
                    ? "bg-green-700 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {isEn ? "Best match" : "マッチ順"}
              </button>
            </div>
          )}

          {/* AI Recommendations button */}
          {showMatchFeature && (
            <button
              type="button"
              onClick={fetchAiRecommendations}
              disabled={aiStatus === "loading"}
              className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {aiStatus === "loading"
                ? isEn ? "Ranking…" : "分析中…"
                : aiStatus === "done"
                  ? isEn ? "AI ranked ✓" : "AI完了 ✓"
                  : aiStatus === "error"
                    ? isEn ? "Retry AI" : "再試行"
                    : isEn ? "AI Recommendations" : "AIおすすめ"}
            </button>
          )}
        </div>
      </div>

      {filteredOpportunities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              locale={locale}
              opportunity={opportunity}
              aiRanking={aiRankings[opportunity.id]}
              labels={{
                location: t("card.location"),
                when: t("card.when"),
                duration: t("card.duration"),
                full: t("card.full"),
                spotsLeft: t("card.spotsLeft", {
                  count: opportunity.spotsRemaining,
                }),
                viewDetails: t("card.viewDetails"),
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">
            {t("noMatchingTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
            {t("noMatchingBody")}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              {t("clearFilters")}
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
  aiRanking,
  labels,
}: {
  locale: string;
  opportunity: DiscoveryOpportunity;
  aiRanking?: AiRanking;
  labels: {
    location: string;
    when: string;
    duration: string;
    full: string;
    spotsLeft: string;
    viewDetails: string;
  };
}) {
  const isFull = opportunity.spotsRemaining <= 0;
  const isEn = locale === "en";

  // Badge score: only show when AI has ranked (avoids showing low Jaccard defaults)
  // The raw matchScore still powers sorting silently via the parent component.
  const displayScore = aiRanking?.score;

  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <img
        src={opportunity.coverImageUrl ?? DEFAULT_COVER_IMAGE}
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
          {/* AI Pick badge */}
          {aiRanking?.aiPick && (
            <span className="rounded-full bg-green-700 px-2.5 py-1 text-xs font-semibold text-white">
              {isEn ? "AI Pick" : "AIおすすめ"}
            </span>
          )}
          {/* Match score badge — only shown after AI ranking has been run */}
          {displayScore !== undefined && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                displayScore >= 70
                  ? "bg-green-100 text-green-800"
                  : displayScore >= 40
                    ? "bg-amber-100 text-amber-800"
                    : "bg-stone-100 text-stone-600"
              }`}
            >
              {isEn ? `${displayScore}% match` : `${displayScore}%マッチ`}
            </span>
          )}
        </div>
        <h2 className="text-lg font-semibold text-stone-900">
          <Link
            href={`/${locale}/opportunities/${opportunity.id}`}
            className="hover:text-green-700 transition-colors"
          >
            {opportunity.title}
          </Link>
        </h2>
        <dl className="mt-3 grid gap-2 text-sm text-stone-600">
          <CardFact label={labels.location} value={`${opportunity.city}, ${opportunity.prefecture}`} />
          <CardFact label={labels.when} value={formatDateRange(opportunity.startsAt, opportunity.endsAt, locale)} />
          <CardFact label={labels.duration} value={formatDuration(opportunity.startsAt, opportunity.endsAt, locale)} />
        </dl>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          {opportunity.shortDescription}
        </p>
        {/* AI reason tooltip (shown when AI ranking is available) */}
        {aiRanking?.reason && (
          <p className="mt-2 text-xs italic text-stone-500">
            {aiRanking.reason}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className={`rounded-sm px-2.5 py-1 text-xs font-semibold uppercase ${
              isFull
                ? "bg-stone-200 text-stone-700"
                : "bg-green-700 text-white"
            }`}
          >
            {isFull ? labels.full : labels.spotsLeft}
          </span>
          <Link
            href={`/${locale}/opportunities/${opportunity.id}`}
            className="text-sm font-semibold text-green-700 hover:text-green-600"
          >
            {labels.viewDetails}
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

function getDurationMinutes(opportunity: DiscoveryOpportunity) {
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
