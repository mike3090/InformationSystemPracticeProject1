// ─── lib/ai/agents/rankOpportunities.ts ──────────────────────────────────────
//
// Agent: rankOpportunities
//
// Takes a volunteer's profile and a list of open opportunities, then returns
// a score (0–100), an "AI Pick" flag, and a short reason per opportunity.
//
// Triggered by the "AI Recommendations" button on the opportunity discovery page.
// Scores are ephemeral — they are NOT written to the database.
//
// Real API calls only happen when MOCK_AI is not "true".
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  RankOpportunitiesInput,
  RankOpportunitiesOutput,
  OpportunityRanking,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────

function buildMockOutput(input: RankOpportunitiesInput): RankOpportunitiesOutput {
  const rankings: OpportunityRanking[] = input.opportunities.map((opp, index) => ({
    opportunityId: opp.opportunityId,
    score: Math.max(45, 92 - index * 7),
    aiPick: index < 3,
    reason:
      index === 0
        ? "Strong match with your skills and interests — highly recommended."
        : index < 3
          ? "Good fit based on your profile preferences."
          : "Moderate overlap with your listed interests.",
  }));
  return { rankings };
}

// ── Response schema ───────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    rankings: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          opportunityId: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          aiPick: { type: SchemaType.BOOLEAN },
          reason: { type: SchemaType.STRING },
        },
      },
    },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: RankOpportunitiesInput): string {
  const profileLines = [
    input.volunteerBio ? `Bio: "${input.volunteerBio}"` : null,
    input.volunteerSkills.length > 0
      ? `Skills: ${input.volunteerSkills.join(", ")}`
      : null,
    input.volunteerInterests.length > 0
      ? `Interests: ${input.volunteerInterests.join(", ")}`
      : null,
    input.volunteerPreferredTaskTypes.length > 0
      ? `Preferred task types: ${input.volunteerPreferredTaskTypes.join(", ")}`
      : null,
    input.volunteerPreferredEnvironment
      ? `Preferred environment: ${input.volunteerPreferredEnvironment}`
      : null,
    input.volunteerCity || input.volunteerPrefecture
      ? `Location: ${[input.volunteerCity, input.volunteerPrefecture].filter(Boolean).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const opportunitySummaries = input.opportunities
    .map((opp) =>
      [
        `Opportunity — opportunityId: "${opp.opportunityId}"`,
        `Title: ${opp.title}`,
        `Category: ${opp.category || "unspecified"}`,
        opp.tags.length > 0 ? `Tags: ${opp.tags.join(", ")}` : null,
        opp.skills.length > 0 ? `Skills needed: ${opp.skills.join(", ")}` : null,
        opp.shortDescription ? `Description: ${opp.shortDescription}` : null,
        `Location: ${[opp.city, opp.prefecture].filter(Boolean).join(", ") || "unspecified"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  return `You are a volunteer matching assistant helping a volunteer find opportunities that suit them.

Volunteer profile:
${profileLines || "No profile information available."}

Opportunities to rank:
${opportunitySummaries}

For each opportunity, return:
- opportunityId: exactly as given above
- score: integer 0–100 (higher = better match for this volunteer)
- aiPick: true for the top 3 best-matching opportunities, false for the rest
- reason: 1–2 sentences explaining the match, written directly to the volunteer (use "you" / "your")

Rules:
- Base scores on skill overlap, interest alignment, preferred task types, location proximity, and environment style
- If the volunteer has little or no profile information, distribute scores evenly around 60
- reason must be encouraging, specific, and in English
- Return every opportunityId that was given — do not skip any

Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(
  raw: unknown,
  expectedIds: Set<string>,
): RankOpportunitiesOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");

  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.rankings)) throw new Error("Missing field: rankings");

  const rankings: OpportunityRanking[] = (
    obj.rankings as Record<string, unknown>[]
  ).map((item) => ({
    opportunityId: String(item.opportunityId ?? ""),
    score: Math.min(100, Math.max(0, Math.round(Number(item.score ?? 50)))),
    aiPick: Boolean(item.aiPick),
    reason: String(item.reason ?? ""),
  }));

  for (const id of expectedIds) {
    if (!rankings.find((r) => r.opportunityId === id)) {
      console.warn(`[rankOpportunities] Gemini omitted opportunityId: ${id} — inserting neutral score`);
      rankings.push({
        opportunityId: id,
        score: 50,
        aiPick: false,
        reason: "Score could not be determined for this opportunity.",
      });
    }
  }

  return { rankings };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function rankOpportunities(
  input: RankOpportunitiesInput,
  ctx: AgentContext,
): Promise<AgentResult<RankOpportunitiesOutput>> {
  // ── 1. Input validation ───────────────────────────────────────────────────
  if (input.opportunities.length === 0) {
    return {
      ok: false,
      error: "No opportunities to rank.",
      code: "INVALID_INPUT",
    };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (
    process.env.MOCK_AI === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log("[rankOpportunities] MOCK_AI=true — returning mock output");
    return {
      ok: true,
      data: buildMockOutput(input),
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // ── 3. Real Gemini call ───────────────────────────────────────────────────
  try {
    const model = getModel();
    const prompt = buildPrompt(input);
    const expectedIds = new Set(input.opportunities.map((o) => o.opportunityId));

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3,
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    // ── 4. Parse and validate ─────────────────────────────────────────────
    let data: RankOpportunitiesOutput;
    try {
      const raw = JSON.parse(result.response.text());
      data = validate(raw, expectedIds);
    } catch (parseError) {
      console.error("[rankOpportunities] Parse error:", parseError);
      return {
        ok: false,
        error: "The AI response was not in the expected format. Please try again.",
        code: "PARSE_ERROR",
      };
    }

    // ── 5. Log usage ──────────────────────────────────────────────────────
    await logAiInteraction({
      userId: ctx.userId,
      type: "RANK_OPPORTUNITIES",
      opportunityId: null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };
  } catch (error) {
    console.error("[rankOpportunities] Gemini error:", error);

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      return {
        ok: false,
        error: "The AI service is temporarily unavailable. Please try again later.",
        code: "QUOTA_EXCEEDED",
      };
    }

    return {
      ok: false,
      error: "The AI service encountered an error. Please try again.",
      code: "MODEL_ERROR",
    };
  }
}
