// ─── lib/ai/agents/planAccommodations.ts ─────────────────────────────────────
//
// Agent: planAccommodations
//
// Suggests accommodation options for out-of-town volunteers attending a
// multi-day or distant event. Options are tailored to the event's prefecture,
// group size, and budget level, with Japanese-specific types (ryokan,
// business hotel, guesthouse).
//
// ⚠️  Output is advisory. Availability and pricing must be confirmed through
//     booking platforms (Jalan, Rakuten Travel, Booking.com) before committing.
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  PlanAccommodationsInput,
  PlanAccommodationsOutput,
  AccommodationOption,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────

const MOCK_OUTPUT: PlanAccommodationsOutput = {
  summary:
    "Kyoto has excellent options at every price point. Business hotels near Kyoto Station offer great access to transit. For a more local feel, a guesthouse in the Higashiyama area is a short bus ride from most event sites.",
  summaryJa:
    "京都はあらゆる予算に対応した宿泊施設が揃っています。京都駅周辺のビジネスホテルは交通の便が良く、東山エリアのゲストハウスはイベント会場への移動も便利でローカルな雰囲気が楽しめます。",
  options: [
    {
      type: "Business hotel",
      typeJa: "ビジネスホテル",
      priceRangePerNightPerPerson: "¥6,000–10,000",
      recommendedArea: "Kyoto Station area (Shimogyo Ward)",
      whyRecommended:
        "Excellent transport links to all major event sites. Many chains (Dormy Inn, APA, Toyoko Inn) offer group-friendly rates and late check-out on request.",
      tips: [
        "Book at least 2 weeks ahead for weekend stays — Kyoto fills quickly.",
        "Request adjoining rooms for groups who want to stay together.",
        "Most include a simple breakfast — ask when booking.",
      ],
    },
    {
      type: "Guesthouse / Hostel",
      typeJa: "ゲストハウス・ホステル",
      priceRangePerNightPerPerson: "¥3,000–5,500",
      recommendedArea: "Higashiyama or Nishiki area",
      whyRecommended:
        "Great for younger volunteers or those on a tighter budget. Shared common areas encourage a team atmosphere. Many guesthouses are in restored machiya townhouses.",
      tips: [
        "Shared dormitory beds are the cheapest option — confirm availability for groups.",
        "Some guesthouses offer private rooms at a slight premium.",
        "Check reviews carefully — quality varies widely.",
      ],
    },
    {
      type: "Ryokan (traditional inn)",
      typeJa: "旅館",
      priceRangePerNightPerPerson: "¥10,000–18,000",
      recommendedArea: "Fushimi or Arashiyama",
      whyRecommended:
        "A memorable cultural experience for volunteers travelling from overseas or for post-event celebrations. Includes dinner and breakfast in most cases.",
      tips: [
        "Traditional tatami rooms — bring or borrow a yukata (provided by the inn).",
        "Meals are usually included in the rate; confirm dietary restrictions in advance.",
        "Book 4–6 weeks ahead for peak season (March–May, October–November).",
      ],
    },
  ],
  bookingAdvice: [
    "Use Jalan (じゃらん) or Rakuten Travel for Japanese-language booking with local options.",
    "Booking.com and Expedia work in English and cover most major chains.",
    "For groups of 10 or more, contact the hotel directly — group rates are often available.",
    "Confirm cancellation policies before booking; Kyoto has strict policies during peak periods.",
    "Check if the property is near a bus or subway stop — Kyoto's train network does not cover all areas.",
  ],
  disclaimer:
    "Availability and pricing are subject to change. All accommodation should be confirmed and booked directly through a booking platform or the property.",
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
          type: { type: SchemaType.STRING },
          typeJa: { type: SchemaType.STRING },
          priceRangePerNightPerPerson: { type: SchemaType.STRING },
          recommendedArea: { type: SchemaType.STRING },
          whyRecommended: { type: SchemaType.STRING },
          tips: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
      },
    },
    bookingAdvice: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    disclaimer: { type: SchemaType.STRING },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: PlanAccommodationsInput): string {
  const budgetLabel =
    input.budget === "budget" ? "budget (under ¥5,000 per person per night)"
    : input.budget === "comfortable" ? "comfortable (¥10,000+ per person per night)"
    : "standard (¥5,000–10,000 per person per night)";

  const notesLine = input.notes
    ? `Special requirements: ${input.notes}`
    : "No special requirements noted.";

  return `You are a Japan travel accommodation advisor helping organisers plan overnight stays for community volunteers.

Event details:
- Location: ${input.eventCity}, ${input.eventPrefecture}
- Check-in: ${input.checkInDate}
- Check-out: ${input.checkOutDate}
- Number of volunteers needing accommodation: ${input.volunteerCount}
- Budget level: ${budgetLabel}
- ${notesLine}

Suggest 2–3 accommodation options appropriate for this location and group, covering different price points and styles.

For each option:
- type: accommodation category in English (e.g. "Business hotel", "Ryokan", "Guesthouse")
- typeJa: category in Japanese
- priceRangePerNightPerPerson: realistic price in yen (e.g. "¥6,000–9,000")
- recommendedArea: specific neighbourhood or district in ${input.eventCity}
- whyRecommended: 1–2 sentences explaining why this suits the group
- tips: 2–4 practical tips (booking lead time, group rates, cultural notes)

Also provide:
- summary and summaryJa: 2–3 sentence overview of the accommodation landscape for this location
- bookingAdvice: 4–5 general tips (platforms to use, group booking, cancellation policies)
- disclaimer: brief advisory note about confirming availability

Rules:
- Use your knowledge of ${input.eventPrefecture}'s accommodation options
- Consider proximity to the event site and transit access
- For ryokan, mention whether meals are typically included
- Do not recommend specific property names — suggest types and areas only
- Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(raw: unknown): PlanAccommodationsOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");
  const obj = raw as Record<string, unknown>;

  if (typeof obj.summary !== "string") throw new Error("Missing: summary");
  if (!Array.isArray(obj.options) || obj.options.length === 0) throw new Error("Missing: options");
  if (!Array.isArray(obj.bookingAdvice)) throw new Error("Missing: bookingAdvice");

  const options: AccommodationOption[] = (obj.options as Record<string, unknown>[]).map((o) => ({
    type: String(o.type ?? ""),
    typeJa: String(o.typeJa ?? ""),
    priceRangePerNightPerPerson: String(o.priceRangePerNightPerPerson ?? ""),
    recommendedArea: String(o.recommendedArea ?? ""),
    whyRecommended: String(o.whyRecommended ?? ""),
    tips: Array.isArray(o.tips) ? (o.tips as unknown[]).map(String) : [],
  }));

  return {
    summary: obj.summary,
    summaryJa: typeof obj.summaryJa === "string" ? obj.summaryJa : "",
    options,
    bookingAdvice: (obj.bookingAdvice as unknown[]).map(String),
    disclaimer: typeof obj.disclaimer === "string"
      ? obj.disclaimer
      : "Availability and pricing should be confirmed directly with the property or booking platform.",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function planAccommodations(
  input: PlanAccommodationsInput,
  ctx: AgentContext,
): Promise<AgentResult<PlanAccommodationsOutput>> {
  // ── 1. Validate ───────────────────────────────────────────────────────────
  if (!input.eventCity.trim() || !input.eventPrefecture.trim()) {
    return { ok: false, error: "Event city and prefecture are required.", code: "INVALID_INPUT" };
  }
  if (!input.checkInDate || !input.checkOutDate) {
    return { ok: false, error: "Check-in and check-out dates are required.", code: "INVALID_INPUT" };
  }
  if (input.volunteerCount < 1) {
    return { ok: false, error: "Volunteer count must be at least 1.", code: "INVALID_INPUT" };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (process.env.MOCK_AI === "true" && process.env.NODE_ENV !== "production") {
    console.log("[planAccommodations] MOCK_AI=true — returning mock output");
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
        temperature: 0.3, // mostly factual, but light creativity for area descriptions
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    let data: PlanAccommodationsOutput;
    try {
      data = validate(JSON.parse(result.response.text()));
    } catch (e) {
      console.error("[planAccommodations] Parse error:", e);
      return { ok: false, error: "The AI response was not in the expected format. Please try again.", code: "PARSE_ERROR" };
    }

    await logAiInteraction({
      userId: ctx.userId,
      type: "PLAN_ACCOMMODATIONS",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[planAccommodations] Gemini error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return { ok: false, error: "The AI service is temporarily unavailable. Please try again later.", code: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "The AI service encountered an error. Please try again.", code: "MODEL_ERROR" };
  }
}
