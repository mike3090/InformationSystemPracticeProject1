// ─── lib/ai/agents/planMeal.ts ────────────────────────────────────────────────
//
// Agent: planMeal
//
// Suggests a meal plan for volunteers at an event — rooted in local Japanese
// cuisine for the event's prefecture, scaled to the group size, and adapted
// to the time of day and any dietary notes.
//
// Called by organisers who want to arrange food for their volunteers.
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  PlanMealInput,
  PlanMealOutput,
  MealSuggestion,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────

const MOCK_OUTPUT: PlanMealOutput = {
  overallRecommendation:
    "A mix of local Kyoto-style bento boxes and onigiri works well for a midday outdoor event. Light, portable, and easy to distribute.",
  overallRecommendationJa:
    "屋外イベントの昼食には、京都風の幕の内弁当とおにぎりの組み合わせがおすすめです。持ち運びやすく配布も簡単です。",
  suggestions: [
    {
      name: "Kyoto-style bento (Makunouchi)",
      nameJa: "京都風幕の内弁当",
      description:
        "A traditional box with rice, grilled fish or tofu, pickled vegetables, and seasonal sides. Reflects Kyoto's refined but accessible food culture.",
      portionNote: "One box per person. Order from a local bento shop the day before.",
      localRelevance: "Makunouchi bento is a Kyoto staple available from most depachika and bento shops.",
    },
    {
      name: "Onigiri assortment",
      nameJa: "おにぎりセット",
      description:
        "Assorted rice balls with fillings like salted salmon, pickled plum, and tuna. Easy to eat standing up and suitable for vegetarians when ordered with vegetable fillings.",
      portionNote: "2–3 onigiri per person depending on event length.",
      localRelevance: "Available from any convenience store or local rice shop (okomeya). Kyoto has several speciality onigiri shops.",
    },
    {
      name: "Warm miso soup (flask)",
      nameJa: "味噌汁（保温ポット）",
      description:
        "A warm flask of miso soup served in small cups. Complements the bento or onigiri and is easy to prepare in bulk.",
      portionNote: "1 cup per person. Prepare at home or purchase from a local restaurant.",
      localRelevance: "Kyoto-style miso (Saikyo miso) is lighter and sweeter — well received in this region.",
    },
  ],
  sourcingTips: [
    "Order bento boxes from a local bento shop 2–3 days in advance for groups of 10 or more.",
    "Convenience stores (7-Eleven, Lawson) can supply onigiri and drinks for smaller groups on the day.",
    "Depachika (department store basement food halls) in Kyoto Station offer high-quality local options.",
    "Inform the supplier of any dietary restrictions when ordering.",
  ],
  estimatedCostPerPerson: "¥700–1,100",
  disclaimer:
    "Prices and availability vary by supplier and season. Confirm with local vendors before the event.",
};

// ── Response schema ───────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    overallRecommendation: { type: SchemaType.STRING },
    overallRecommendationJa: { type: SchemaType.STRING },
    suggestions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          nameJa: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          portionNote: { type: SchemaType.STRING },
          localRelevance: { type: SchemaType.STRING },
        },
      },
    },
    sourcingTips: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    estimatedCostPerPerson: { type: SchemaType.STRING },
    disclaimer: { type: SchemaType.STRING },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: PlanMealInput): string {
  const budgetLabel =
    input.budget === "low" ? "low (under ¥600 per person)"
    : input.budget === "high" ? "comfortable (¥1,200+ per person)"
    : "medium (¥600–1,200 per person)";

  const dietLine = input.dietaryNotes
    ? `Dietary notes from the organiser: ${input.dietaryNotes}`
    : "No specific dietary restrictions noted.";

  return `You are a Japanese event catering advisor helping a community volunteer event organiser plan meals.

Event details:
- Location: ${input.eventCity}, ${input.eventPrefecture}
- Number of volunteers: ${input.volunteerCount}
- Time of day: ${input.timeOfDay}
- Event duration: approximately ${input.eventDurationHours} hour(s)
- Budget: ${budgetLabel}
- ${dietLine}

Suggest a practical meal plan that:
1. Uses local cuisine specific to ${input.eventPrefecture} where possible
2. Is easy to distribute and eat at an outdoor/community event
3. Scales realistically to ${input.volunteerCount} people
4. Fits the ${input.timeOfDay} timing (e.g. light snacks for morning, full meal for midday)
5. Respects any dietary notes

Provide:
- overallRecommendation and overallRecommendationJa: 2–3 sentence summary of the plan
- suggestions: 2–4 specific food options, each with name, nameJa, description, portionNote, and localRelevance
- sourcingTips: 3–5 tips on where and how to obtain the food in ${input.eventCity}
- estimatedCostPerPerson: realistic price range in yen (e.g. "¥700–1,000")
- disclaimer: brief note that prices/availability should be confirmed locally

Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(raw: unknown): PlanMealOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");
  const obj = raw as Record<string, unknown>;

  if (typeof obj.overallRecommendation !== "string") throw new Error("Missing: overallRecommendation");
  if (!Array.isArray(obj.suggestions) || obj.suggestions.length === 0) throw new Error("Missing: suggestions");
  if (!Array.isArray(obj.sourcingTips)) throw new Error("Missing: sourcingTips");

  const suggestions: MealSuggestion[] = (obj.suggestions as Record<string, unknown>[]).map((s) => ({
    name: String(s.name ?? ""),
    nameJa: String(s.nameJa ?? ""),
    description: String(s.description ?? ""),
    portionNote: String(s.portionNote ?? ""),
    localRelevance: String(s.localRelevance ?? ""),
  }));

  return {
    overallRecommendation: obj.overallRecommendation,
    overallRecommendationJa: typeof obj.overallRecommendationJa === "string" ? obj.overallRecommendationJa : "",
    suggestions,
    sourcingTips: (obj.sourcingTips as unknown[]).map(String),
    estimatedCostPerPerson: typeof obj.estimatedCostPerPerson === "string" ? obj.estimatedCostPerPerson : "—",
    disclaimer: typeof obj.disclaimer === "string"
      ? obj.disclaimer
      : "Prices and availability vary — confirm with local vendors before the event.",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function planMeal(
  input: PlanMealInput,
  ctx: AgentContext,
): Promise<AgentResult<PlanMealOutput>> {
  // ── 1. Validate ───────────────────────────────────────────────────────────
  if (input.volunteerCount < 1) {
    return { ok: false, error: "Volunteer count must be at least 1.", code: "INVALID_INPUT" };
  }
  if (!input.eventCity.trim() || !input.eventPrefecture.trim()) {
    return { ok: false, error: "Event city and prefecture are required.", code: "INVALID_INPUT" };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (process.env.MOCK_AI === "true" && process.env.NODE_ENV !== "production") {
    console.log("[planMeal] MOCK_AI=true — returning mock output");
    return { ok: true, data: MOCK_OUTPUT, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  // ── 3. Gemini call ────────────────────────────────────────────────────────
  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.6, // some creativity to surface local specialties, but grounded
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    let data: PlanMealOutput;
    try {
      data = validate(JSON.parse(result.response.text()));
    } catch (e) {
      console.error("[planMeal] Parse error:", e);
      return { ok: false, error: "The AI response was not in the expected format. Please try again.", code: "PARSE_ERROR" };
    }

    await logAiInteraction({
      userId: ctx.userId,
      type: "PLAN_MEAL",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[planMeal] Gemini error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return { ok: false, error: "The AI service is temporarily unavailable. Please try again later.", code: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "The AI service encountered an error. Please try again.", code: "MODEL_ERROR" };
  }
}
