// ─── lib/ai/agents/scoreApplicants.ts ────────────────────────────────────────
//
// Agent: scoreApplicants
//
// Takes an opportunity and its list of applicants, then returns a match score
// (0–100), a recommended flag, and a short reasoning note for each applicant.
//
// The requester triggers this from the "Run AI Match" button on their dashboard.
// Scores are stored in Application.matchScore and Application.aiRecommended.
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
  ScoreApplicantsInput,
  ScoreApplicantsOutput,
  ApplicantScore,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────
//
// Returns plausible-looking scores without calling Gemini.
// The applicationIds are taken from the real input so the UI can
// match scores back to the correct applicant cards.

function buildMockOutput(input: ScoreApplicantsInput): ScoreApplicantsOutput {
  const sorted = [...input.applicants].map((applicant, index) => ({
    applicationId: applicant.applicationId,
    // Spread scores across the range so the list looks ranked
    matchScore: Math.max(55, 95 - index * 10),
    recommended: index < input.volunteersNeeded,
    reasoning:
      index === 0
        ? "Strong skill overlap with the opportunity requirements and relevant experience note."
        : index < input.volunteersNeeded
          ? "Good general fit. Skills align with most of the listed requirements."
          : "Moderate fit. May be better suited for a different type of opportunity.",
  }));

  return { scores: sorted };
}

// ── Response schema ───────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    scores: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          applicationId: { type: SchemaType.STRING },
          matchScore: { type: SchemaType.NUMBER },
          recommended: { type: SchemaType.BOOLEAN },
          reasoning: { type: SchemaType.STRING },
        },
      },
    },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: ScoreApplicantsInput): string {
  const opportunitySummary = [
    `Title: ${input.opportunityTitle}`,
    `Description: ${input.opportunityDescription}`,
    `Skills needed: ${input.opportunitySkills.join(", ") || "none specified"}`,
    `Volunteers needed: ${input.volunteersNeeded}`,
  ].join("\n");

  const applicantSummaries = input.applicants
    .map((applicant, index) => {
      const lines = [
        `Applicant ${index + 1} — applicationId: "${applicant.applicationId}"`,
        applicant.selectedTaskNames.length > 0
          ? `Selected tasks: ${applicant.selectedTaskNames.join(", ")}`
          : "Selected tasks: not specified",
        applicant.skillTags.length > 0
          ? `Self-reported skills: ${applicant.skillTags.join(", ")}`
          : "Self-reported skills: none",
        applicant.volunteerSkills.length > 0
          ? `Profile skills: ${applicant.volunteerSkills.join(", ")}`
          : null,
        applicant.volunteerInterests.length > 0
          ? `Interests: ${applicant.volunteerInterests.join(", ")}`
          : null,
        applicant.experienceNote
          ? `Experience note: "${applicant.experienceNote}"`
          : null,
        applicant.volunteerBio
          ? `Bio: "${applicant.volunteerBio}"`
          : null,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n");

  return `You are a volunteer coordinator helping a requester select the best volunteers for an opportunity.

Opportunity:
${opportunitySummary}

Applicants:
${applicantSummaries}

For each applicant, return:
- applicationId: exactly as given above
- matchScore: integer 0–100 (higher = better fit)
- recommended: true for the top ${input.volunteersNeeded} applicant(s), false for the rest
- reasoning: 1–2 sentences explaining the score in neutral, constructive language

Rules:
- Base scores on skill overlap, task selection, experience notes, and bio
- If you have very little information about an applicant, score them 50–60
- Never score below 30 unless there is a clear mismatch
- reasoning must be in English, respectful, and useful to the requester
- Return every applicationId that was given — do not skip any

Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(
  raw: unknown,
  expectedIds: Set<string>,
): ScoreApplicantsOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");

  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.scores)) throw new Error("Missing field: scores");

  const scores: ApplicantScore[] = (obj.scores as Record<string, unknown>[]).map(
    (item) => {
      const applicationId = String(item.applicationId ?? "");
      const matchScore = Math.min(100, Math.max(0, Math.round(Number(item.matchScore ?? 50))));
      const recommended = Boolean(item.recommended);
      const reasoning = String(item.reasoning ?? "");
      return { applicationId, matchScore, recommended, reasoning };
    },
  );

  // Warn if Gemini dropped any applicant IDs — fill them in with a neutral score
  for (const id of expectedIds) {
    if (!scores.find((s) => s.applicationId === id)) {
      console.warn(`[scoreApplicants] Gemini omitted applicationId: ${id} — inserting neutral score`);
      scores.push({
        applicationId: id,
        matchScore: 50,
        recommended: false,
        reasoning: "Score could not be determined for this applicant.",
      });
    }
  }

  return { scores };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scoreApplicants(
  input: ScoreApplicantsInput,
  ctx: AgentContext,
): Promise<AgentResult<ScoreApplicantsOutput>> {
  // ── 1. Input validation ───────────────────────────────────────────────────
  if (input.applicants.length === 0) {
    return {
      ok: false,
      error: "There are no applicants to score.",
      code: "INVALID_INPUT",
    };
  }

  if (!input.opportunityTitle.trim()) {
    return {
      ok: false,
      error: "Opportunity title is missing.",
      code: "INVALID_INPUT",
    };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (
    process.env.MOCK_AI === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log("[scoreApplicants] MOCK_AI=true — returning mock output");
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
    const expectedIds = new Set(input.applicants.map((a) => a.applicationId));

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // low temperature — scoring needs consistency, not creativity
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    // ── 4. Parse and validate ─────────────────────────────────────────────
    let data: ScoreApplicantsOutput;
    try {
      const raw = JSON.parse(result.response.text());
      data = validate(raw, expectedIds);
    } catch (parseError) {
      console.error("[scoreApplicants] Parse error:", parseError);
      return {
        ok: false,
        error: "The AI response was not in the expected format. Please try again.",
        code: "PARSE_ERROR",
      };
    }

    // ── 5. Log usage ──────────────────────────────────────────────────────
    await logAiInteraction({
      userId: ctx.userId,
      type: "SCORE_APPLICANTS",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[scoreApplicants] Gemini error:", error);

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
