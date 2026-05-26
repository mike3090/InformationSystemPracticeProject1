"use client";

import { useState } from "react";

type MealSuggestion = {
  name: string;
  nameJa: string;
  description: string;
  portionNote: string;
  localRelevance: string;
};

type PlanMealOutput = {
  overallRecommendation: string;
  overallRecommendationJa: string;
  suggestions: MealSuggestion[];
  sourcingTips: string[];
  estimatedCostPerPerson: string;
  disclaimer: string;
};

type ApiResult = { ok: true; data: PlanMealOutput } | { ok: false; error?: string };

export default function EventMealPlanPanel({
  volunteerCount,
  eventCity,
  eventPrefecture,
  timeOfDay,
  eventDurationHours,
  locale,
}: {
  volunteerCount: number;
  eventCity: string | null;
  eventPrefecture: string | null;
  timeOfDay: "morning" | "midday" | "afternoon" | "evening";
  eventDurationHours: number;
  locale: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<PlanMealOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!eventCity && !eventPrefecture) return null;

  const isEn = locale === "en";

  async function fetchPlan() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai/plan-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerCount,
          eventCity: eventCity ?? "",
          eventPrefecture: eventPrefecture ?? "",
          timeOfDay,
          eventDurationHours,
          locale,
        }),
      });
      const result = (await res.json()) as ApiResult;
      if (result.ok) {
        setData(result.data);
        setState("done");
      } else {
        setState("error");
        setErrorMsg(
          result.error ??
            (isEn
              ? "Failed to get meal suggestions."
              : "食事プランの取得に失敗しました。"),
        );
      }
    } catch {
      setState("error");
      setErrorMsg(
        isEn ? "Network error. Please try again." : "ネットワークエラーが発生しました。",
      );
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-950">
            {isEn ? "Meal suggestions" : "食事の提案"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {isEn
              ? `Local food ideas near ${eventCity ?? eventPrefecture}.`
              : `${eventCity ?? eventPrefecture}周辺の地域フードを提案します。`}
          </p>
        </div>
        {state !== "done" && (
          <button
            onClick={fetchPlan}
            disabled={state === "loading"}
            className="shrink-0 rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "loading"
              ? isEn
                ? "Suggesting…"
                : "提案中…"
              : isEn
                ? "Suggest meals"
                : "食事を提案"}
          </button>
        )}
      </div>

      {state === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {state === "done" && data && (
        <div className="mt-5 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-6 text-stone-700">
              {isEn ? data.overallRecommendation : data.overallRecommendationJa}
            </p>
            <span className="shrink-0 self-start rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              {isEn ? "Est." : "目安"} {data.estimatedCostPerPerson}
              {isEn ? "/person" : "/人"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {data.suggestions.map((suggestion, i) => (
              <div key={i} className="rounded-lg border border-stone-200 p-4">
                <h3 className="font-semibold text-stone-950">
                  {isEn ? suggestion.name : suggestion.nameJa}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {suggestion.description}
                </p>
                <p className="mt-2 rounded bg-stone-50 p-2 text-xs text-stone-600">
                  {suggestion.portionNote}
                </p>
                <p className="mt-2 text-xs text-stone-500">{suggestion.localRelevance}</p>
              </div>
            ))}
          </div>

          {data.sourcingTips.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-950">
                {isEn ? "Where to get it" : "入手方法"}
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-700">
                {data.sourcingTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-stone-400">{data.disclaimer}</p>

          <button
            onClick={() => {
              setState("idle");
              setData(null);
            }}
            className="text-xs text-stone-500 underline hover:text-stone-700"
          >
            {isEn ? "Refresh" : "再取得"}
          </button>
        </div>
      )}
    </section>
  );
}
