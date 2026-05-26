"use client";

import { useState } from "react";

type AccommodationOption = {
  type: string;
  typeJa: string;
  priceRangePerNightPerPerson: string;
  recommendedArea: string;
  whyRecommended: string;
  tips: string[];
};

type PlanAccommodationsOutput = {
  summary: string;
  summaryJa: string;
  options: AccommodationOption[];
  bookingAdvice: string[];
  disclaimer: string;
};

type ApiResult =
  | { ok: true; data: PlanAccommodationsOutput }
  | { ok: false; error?: string };

export default function EventAccommodationsPanel({
  eventCity,
  eventPrefecture,
  checkInDate,
  checkOutDate,
  volunteerCount,
  locale,
}: {
  eventCity: string | null;
  eventPrefecture: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  volunteerCount: number;
  locale: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<PlanAccommodationsOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!eventCity && !eventPrefecture) return null;
  if (!checkInDate) return null;

  const isEn = locale === "en";

  async function fetchPlan() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai/plan-accommodations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCity: eventCity ?? "",
          eventPrefecture: eventPrefecture ?? "",
          checkInDate: checkInDate ?? "",
          checkOutDate: checkOutDate ?? checkInDate ?? "",
          volunteerCount,
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
              ? "Failed to get accommodation suggestions."
              : "宿泊プランの取得に失敗しました。"),
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
            {isEn ? "Accommodation options" : "宿泊オプション"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {isEn
              ? `Suggested places to stay near ${eventCity ?? eventPrefecture}.`
              : `${eventCity ?? eventPrefecture}周辺の宿泊施設を提案します。`}
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
                ? "Searching…"
                : "検索中…"
              : isEn
                ? "Find accommodation"
                : "宿泊施設を探す"}
          </button>
        )}
      </div>

      {state === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {state === "done" && data && (
        <div className="mt-5 space-y-6">
          <p className="text-sm leading-6 text-stone-700">
            {isEn ? data.summary : data.summaryJa}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.options.map((option, i) => (
              <div key={i} className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-stone-950">
                    {isEn ? option.type : option.typeJa}
                  </h3>
                  <span className="shrink-0 text-xs font-semibold text-green-700">
                    {option.priceRangePerNightPerPerson}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{option.recommendedArea}</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {option.whyRecommended}
                </p>
                {option.tips.length > 0 && (
                  <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-stone-600">
                    {option.tips.map((tip, j) => (
                      <li key={j}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {data.bookingAdvice.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-950">
                {isEn ? "Booking tips" : "予約のコツ"}
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-700">
                {data.bookingAdvice.map((tip, i) => (
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
