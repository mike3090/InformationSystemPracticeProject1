"use client";

import { useState } from "react";

type RouteOption = {
  mode: string;
  estimatedMinutes: number;
  suggestedDeparture: string;
  steps: string[];
  fare: string | null;
  notes: string | null;
};

type PlanRouteOutput = {
  summary: string;
  summaryJa: string;
  options: RouteOption[];
  generalTips: string[];
  disclaimer: string;
};

type ApiResult = { ok: true; data: PlanRouteOutput } | { ok: false; error?: string };

export default function EventRoutePlanPanel({
  fromCity,
  fromPrefecture,
  toAddress,
  toCity,
  toPrefecture,
  eventStartAt,
  locale,
}: {
  fromCity: string | null;
  fromPrefecture: string | null;
  toAddress: string | null;
  toCity: string | null;
  toPrefecture: string | null;
  eventStartAt: string | null;
  locale: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<PlanRouteOutput | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!fromCity && !fromPrefecture) return null;

  const isEn = locale === "en";

  async function fetchPlan() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai/plan-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCity: fromCity ?? "",
          fromPrefecture: fromPrefecture ?? "",
          toAddress: toAddress ?? "",
          toCity: toCity ?? "",
          toPrefecture: toPrefecture ?? "",
          eventStartAt: eventStartAt ?? new Date().toISOString(),
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
            (isEn ? "Failed to get route plan." : "ルートプランの取得に失敗しました。"),
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
            {isEn ? "Route to venue" : "会場へのルート"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {isEn
              ? `AI-suggested travel options from ${fromCity ?? fromPrefecture} to the event site.`
              : `${fromCity ?? fromPrefecture}から会場へのAI提案ルートです。`}
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
                ? "Planning…"
                : "計画中…"
              : isEn
                ? "Plan my route"
                : "ルートを提案"}
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

          <div className="grid gap-4 sm:grid-cols-2">
            {data.options.map((option, i) => (
              <div key={i} className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-stone-950">{option.mode}</h3>
                  <span className="text-sm font-semibold text-green-700">
                    {option.estimatedMinutes} min
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                  <span>
                    {isEn ? "Depart" : "出発"} {option.suggestedDeparture}
                  </span>
                  {option.fare && (
                    <>
                      <span>·</span>
                      <span>{option.fare}</span>
                    </>
                  )}
                </div>
                <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-stone-700">
                  {option.steps.map((step, j) => (
                    <li key={j}>{step}</li>
                  ))}
                </ol>
                {option.notes && (
                  <p className="mt-3 rounded bg-stone-50 p-2 text-xs text-stone-600">
                    {option.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {data.generalTips.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-stone-950">
                {isEn ? "General tips" : "一般的なヒント"}
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-700">
                {data.generalTips.map((tip, i) => (
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
