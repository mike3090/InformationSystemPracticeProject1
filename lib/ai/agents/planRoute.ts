// ─── lib/ai/agents/planRoute.ts ───────────────────────────────────────────────
//
// Agent: planRoute
//
// Given a volunteer's city and the event site address, suggests realistic
// travel options in Japan (train, bus, bicycle, walking) with step-by-step
// directions, estimated times, and IC card/fare tips.
//
// ⚠️  Gemini has no live transit data. Output is advisory — volunteers
//     should confirm schedules with Google Maps or the transit operator.
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  PlanRouteInput,
  PlanRouteOutput,
  RouteOption,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────

const MOCK_OUTPUT: PlanRouteOutput = {
  summary: "About 45 minutes from central Kyoto by train and a short walk.",
  summaryJa: "京都中心部から電車と徒歩で約45分です。",
  options: [
    {
      mode: "Train + Walk",
      estimatedMinutes: 45,
      suggestedDeparture: "08:45",
      steps: [
        "Walk to Kyoto Station (or take a local bus).",
        "Take the JR Nara Line toward Nara — get off at Tofukuji Station (8 min, ¥220).",
        "Transfer to City Bus No. 202 toward Kamogawa Delta (12 min, ¥230).",
        "Walk 5 min from the Kamogawa-Ohashi bus stop to the garden sign.",
      ],
      fare: "¥450",
      notes: "IC cards (Suica, ICOCA, PiTaPa) accepted on all legs. Trains run every 10–15 min on weekday mornings.",
    },
    {
      mode: "Bicycle",
      estimatedMinutes: 30,
      suggestedDeparture: "09:00",
      steps: [
        "Cycle south along the Kamo River cycling path from central Kyoto.",
        "Follow the riverside path to Kamogawa Delta — it is well signposted.",
        "Bicycle parking is available near the wooden garden sign.",
      ],
      fare: null,
      notes: "A pleasant flat ride in good weather. Rental bicycles available from most major hotels.",
    },
  ],
  generalTips: [
    "Arrive 10 minutes before the listed start time for check-in.",
    "IC cards work on all trains and buses in Kyoto Prefecture.",
    "Google Maps Japan transit mode gives accurate real-time schedules.",
    "Weekend schedules may differ — check the day before.",
  ],
  disclaimer:
    "This route plan is based on general knowledge and is for planning purposes only. Fares and schedules change — confirm with Google Maps or the transit operator before travelling.",
};

// ── Response schema ───────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    summaryJa: { type: SchemaType.STRING },
    options: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          mode: { type: SchemaType.STRING },
          estimatedMinutes: { type: SchemaType.INTEGER },
          suggestedDeparture: { type: SchemaType.STRING },
          steps: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          fare: { type: SchemaType.STRING },
          notes: { type: SchemaType.STRING },
        },
      },
    },
    generalTips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    disclaimer: { type: SchemaType.STRING },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: PlanRouteInput, locale: "ja" | "en"): string {
  // Parse the event start time to suggest a realistic departure window
  const eventDate = new Date(input.eventStartAt);
  const eventTimeLabel = eventDate.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  return `You are a Japan travel assistant helping a volunteer plan their journey to a community event.

Volunteer's location:
- City: ${input.fromCity}
- Prefecture: ${input.fromPrefecture}

Event site:
- Address: ${input.toAddress}
- City: ${input.toCity}
- Prefecture: ${input.toPrefecture}
- Start time: ${eventTimeLabel} (Japan time)

Plan 1–3 realistic travel options from the volunteer's city to the event site.
Use your knowledge of Japan's train, bus, and local transit networks.

For each option:
- mode: short label (e.g. "Train + Walk", "Bus", "Bicycle", "Taxi")
- estimatedMinutes: realistic total door-to-door travel time
- suggestedDeparture: "HH:MM" — time to leave to arrive 10 min before event start
- steps: 3–6 clear steps in ${locale === "ja" ? "Japanese" : "English"}, including line names, station names, and estimated segment times
- fare: total estimated fare (e.g. "¥450") or null if not applicable
- notes: IC card tips, platform numbers, service frequency, or null

Also provide:
- summary and summaryJa: one sentence each (e.g. "About 45 min by train from central Kyoto")
- generalTips: 3–5 practical travel tips relevant to this route
- disclaimer: a short note that this is advisory and schedules should be confirmed

Rules:
- Only suggest routes that are realistic for this origin and destination
- Prefer train over bus where both are available
- If origin and destination are in the same city, include walking or cycling options
- Use Japanese station and line names correctly
- Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(raw: unknown): PlanRouteOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");
  const obj = raw as Record<string, unknown>;

  if (typeof obj.summary !== "string") throw new Error("Missing: summary");
  if (typeof obj.summaryJa !== "string") throw new Error("Missing: summaryJa");
  if (!Array.isArray(obj.options) || obj.options.length === 0) throw new Error("Missing: options");
  if (!Array.isArray(obj.generalTips)) throw new Error("Missing: generalTips");

  const options: RouteOption[] = (obj.options as Record<string, unknown>[]).map((o) => ({
    mode: String(o.mode ?? ""),
    estimatedMinutes: Number(o.estimatedMinutes ?? 0),
    suggestedDeparture: String(o.suggestedDeparture ?? ""),
    steps: Array.isArray(o.steps) ? (o.steps as unknown[]).map(String) : [],
    fare: o.fare != null ? String(o.fare) : null,
    notes: o.notes != null ? String(o.notes) : null,
  }));

  return {
    summary: obj.summary,
    summaryJa: obj.summaryJa,
    options,
    generalTips: (obj.generalTips as unknown[]).map(String),
    disclaimer: typeof obj.disclaimer === "string"
      ? obj.disclaimer
      : "Confirm schedules with Google Maps or the transit operator before travelling.",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function planRoute(
  input: PlanRouteInput,
  ctx: AgentContext,
): Promise<AgentResult<PlanRouteOutput>> {
  // ── 1. Validate ───────────────────────────────────────────────────────────
  if (!input.fromCity.trim() || !input.toAddress.trim()) {
    return { ok: false, error: "Origin city and destination address are required.", code: "INVALID_INPUT" };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (process.env.MOCK_AI === "true" && process.env.NODE_ENV !== "production") {
    console.log("[planRoute] MOCK_AI=true — returning mock output");
    return { ok: true, data: MOCK_OUTPUT, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  // ── 3. Gemini call ────────────────────────────────────────────────────────
  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(input, ctx.locale) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // low — transit information needs accuracy over creativity
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    let data: PlanRouteOutput;
    try {
      data = validate(JSON.parse(result.response.text()));
    } catch (e) {
      console.error("[planRoute] Parse error:", e);
      return { ok: false, error: "The AI response was not in the expected format. Please try again.", code: "PARSE_ERROR" };
    }

    await logAiInteraction({
      userId: ctx.userId,
      type: "PLAN_ROUTE",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[planRoute] Gemini error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return { ok: false, error: "The AI service is temporarily unavailable. Please try again later.", code: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "The AI service encountered an error. Please try again.", code: "MODEL_ERROR" };
  }
}
