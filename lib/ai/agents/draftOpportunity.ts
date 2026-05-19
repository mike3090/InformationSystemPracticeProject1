// ─── lib/ai/agents/draftOpportunity.ts ───────────────────────────────────────
//
// Agent: draftOpportunity
//
// Takes a requester's rough description and returns a fully structured,
// bilingual volunteer opportunity posting ready for the creation form.
//
// Real API calls only happen when MOCK_AI is not "true".
// Set MOCK_AI=true in .env.local during UI development to avoid using quota.
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  DraftOpportunityInput,
  DraftOpportunityOutput,
  DraftedTask,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────
//
// Returned immediately when MOCK_AI=true in .env.local.
// Lets the frontend team build and style the form pre-fill without
// spending any API quota. Replace the text to test different scenarios.

const MOCK_OUTPUT: DraftOpportunityOutput = {
  title: "Community Park Cleanup — Kamogawa Delta",
  titleJa: "地域公園清掃 — 鴨川デルタ",
  description:
    "Join neighbours to refresh the riverside park before summer. " +
    "Tasks are split into small friendly groups — litter picking, " +
    "path sweeping, and a short rest together afterward. " +
    "No experience needed; all tools are provided on the day.",
  descriptionJa:
    "夏前に近隣住民と一緒に川沿いの公園をきれいにしましょう。" +
    "ゴミ拾い・通路清掃など小グループに分かれて作業します。" +
    "経験不要、道具はすべて当日用意します。",
  skills: ["outdoor", "beginner friendly", "physical"],
  thingsToBring: ["Comfortable shoes", "Hat or sun cover", "Water bottle"],
  taskFlow: [
    {
      name: "Litter picking",
      nameJa: "ゴミ拾い",
      startTime: "09:30",
      durationMinutes: 60,
      shortDescription: "Collect litter along the main riverside path.",
      shortDescriptionJa: "川沿いのメイン通路でゴミを収集します。",
    },
    {
      name: "Path sweeping",
      nameJa: "通路の清掃",
      startTime: "10:30",
      durationMinutes: 45,
      shortDescription: "Sweep leaves and dust from the walking paths.",
      shortDescriptionJa: "歩道の落ち葉やほこりを掃き清めます。",
    },
    {
      name: "Rest and debrief",
      nameJa: "休憩と振り返り",
      startTime: "11:15",
      durationMinutes: 30,
      shortDescription: "Share tea and a short thank-you from the organiser.",
      shortDescriptionJa: "主催者からのお礼とともにお茶でひと休みします。",
    },
  ],
};

// ── Response schema ───────────────────────────────────────────────────────────
//
// Tells Gemini the exact JSON shape we expect. When a responseSchema is
// provided, Gemini is constrained to only produce that structure —
// no prose, no markdown, no extra fields. This prevents parse errors.

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    titleJa: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    descriptionJa: { type: SchemaType.STRING },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    thingsToBring: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    taskFlow: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          nameJa: { type: SchemaType.STRING },
          startTime: { type: SchemaType.STRING },
          durationMinutes: { type: SchemaType.INTEGER },
          shortDescription: { type: SchemaType.STRING },
          shortDescriptionJa: { type: SchemaType.STRING },
        },
      },
    },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────
//
// Builds the text sent to Gemini. Keeping it in a separate function makes it
// easy to iterate on the prompt without touching the agent logic.

function buildPrompt(input: DraftOpportunityInput, locale: "ja" | "en"): string {
  const extra = input.organizerContext
    ? `\n\nExtra context about the organiser: ${input.organizerContext}`
    : "";

  return `You are a bilingual (Japanese and English) volunteer coordinator for small towns in Japan.
A requester has described a volunteer opportunity in rough terms.
Your job is to expand it into a complete, welcoming, and accurate opportunity posting.

Requester's rough description:
"${input.roughDescription}"${extra}

Rules:
- title and titleJa: short, specific, appealing (max 10 words)
- description and descriptionJa: warm, clear prose, 80–120 words each
- skills: 3–6 short tags in lowercase English (e.g. "outdoor", "beginner friendly")
- thingsToBring: practical items only, 2–5 items in ${locale === "ja" ? "Japanese" : "English"}
- taskFlow: 2–4 tasks that represent how the volunteer day is structured
  - startTime: realistic "HH:MM" based on a typical morning or afternoon event
  - durationMinutes: realistic integer (30–120)
  - shortDescription and shortDescriptionJa: one clear sentence each

Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────
//
// Even with responseSchema, Gemini can occasionally return unexpected shapes.
// This function checks the minimum required fields and throws if they are missing.
// The throw is caught by the try/catch in the main function below.

function validate(raw: unknown): DraftOpportunityOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");

  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== "string" || !obj.title)
    throw new Error("Missing field: title");
  if (typeof obj.titleJa !== "string" || !obj.titleJa)
    throw new Error("Missing field: titleJa");
  if (typeof obj.description !== "string" || !obj.description)
    throw new Error("Missing field: description");
  if (typeof obj.descriptionJa !== "string" || !obj.descriptionJa)
    throw new Error("Missing field: descriptionJa");
  if (!Array.isArray(obj.skills))
    throw new Error("Missing field: skills");
  if (!Array.isArray(obj.thingsToBring))
    throw new Error("Missing field: thingsToBring");
  if (!Array.isArray(obj.taskFlow) || obj.taskFlow.length === 0)
    throw new Error("Missing field: taskFlow");

  return {
    title: obj.title,
    titleJa: obj.titleJa,
    description: obj.description,
    descriptionJa: obj.descriptionJa,
    skills: (obj.skills as unknown[]).map(String),
    thingsToBring: (obj.thingsToBring as unknown[]).map(String),
    taskFlow: (obj.taskFlow as Record<string, unknown>[]).map(
      (task): DraftedTask => ({
        name: String(task.name ?? ""),
        nameJa: String(task.nameJa ?? ""),
        startTime: String(task.startTime ?? "09:00"),
        durationMinutes: Number(task.durationMinutes ?? 60),
        shortDescription: String(task.shortDescription ?? ""),
        shortDescriptionJa: String(task.shortDescriptionJa ?? ""),
      }),
    ),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function draftOpportunity(
  input: DraftOpportunityInput,
  ctx: AgentContext,
): Promise<AgentResult<DraftOpportunityOutput>> {
  // ── 1. Input validation ───────────────────────────────────────────────────
  if (!input.roughDescription.trim()) {
    return {
      ok: false,
      error: "Please describe the opportunity before drafting.",
      code: "INVALID_INPUT",
    };
  }

  if (input.roughDescription.trim().length < 10) {
    return {
      ok: false,
      error: "The description is too short. Add a few more details.",
      code: "INVALID_INPUT",
    };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  // Safe to use during UI development. Set MOCK_AI=true in .env.local.
  // This branch never runs in production (NODE_ENV check).
  if (
    process.env.MOCK_AI === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log("[draftOpportunity] MOCK_AI=true — returning mock output");
    return {
      ok: true,
      data: MOCK_OUTPUT,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // ── 3. Real Gemini call ───────────────────────────────────────────────────
  try {
    const model = getModel();
    const prompt = buildPrompt(input, ctx.locale);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7, // slight creativity, not too random
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    // ── 4. Parse and validate ─────────────────────────────────────────────
    let data: DraftOpportunityOutput;
    try {
      const raw = JSON.parse(result.response.text());
      data = validate(raw);
    } catch (parseError) {
      console.error("[draftOpportunity] Parse error:", parseError);
      return {
        ok: false,
        error: "The AI response was not in the expected format. Please try again.",
        code: "PARSE_ERROR",
      };
    }

    // ── 5. Log usage to AiInteraction table ───────────────────────────────
    await logAiInteraction({
      userId: ctx.userId,
      type: "DRAFT_OPPORTUNITY",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[draftOpportunity] Gemini error:", error);

    // Check if this looks like a quota or billing error
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      return {
        ok: false,
        error: "The AI service is temporarily unavailable due to usage limits. Please try again later.",
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
