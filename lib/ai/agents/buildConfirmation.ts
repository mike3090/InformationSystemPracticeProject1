// ─── lib/ai/agents/buildConfirmation.ts ──────────────────────────────────────
//
// Agent: buildConfirmation
//
// When a requester accepts a volunteer's application, this agent writes a warm,
// personalised booking confirmation in both English and Japanese.
//
// It is called server-side from the organiser's accept action — no API route
// is needed. The result replaces the current static template in
// lib/preEventCommunication.ts (buildConfirmationBody).
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
  BuildConfirmationInput,
  BuildConfirmationOutput,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────

const MOCK_OUTPUT: BuildConfirmationOutput = {
  subject: "You're confirmed — Community Park Cleanup",
  bodyEn:
    "Hi Yuki,\n\n" +
    "Great news — your spot is confirmed for the Community Park Cleanup on Saturday, Jun 6 · 9:30–12:30 " +
    "at Kamogawa Delta, Sakyo Ward, Kyoto.\n\n" +
    "You're signed up for: Plant seedlings (09:45, 65 min).\n\n" +
    "Please bring: Comfortable shoes, Hat or sun cover, Water bottle.\n\n" +
    "When you arrive, head to the north side of the delta near the wooden garden sign. " +
    "The check-in table opens 10 minutes before the start time.\n\n" +
    "Thank you for volunteering — see you there!",
  bodyJa:
    "こんにちは、Yukiさん\n\n" +
    "嬉しいお知らせです — 6月6日（土）9:30〜12:30、京都市左京区・鴨川デルタで行われる" +
    "「地域公園清掃」へのご参加が確定しました。\n\n" +
    "担当タスク：苗の植え付け（09:45、65分）\n\n" +
    "持ち物：歩きやすい靴、帽子または日よけ、水筒\n\n" +
    "到着したら、デルタの北側にある木製の案内板付近へお越しください。" +
    "チェックインテーブルは開始10分前から対応しています。\n\n" +
    "ご参加ありがとうございます。当日お会いしましょう！",
};

// ── Response schema ───────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    bodyEn: { type: SchemaType.STRING },
    bodyJa: { type: SchemaType.STRING },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: BuildConfirmationInput): string {
  const taskLine =
    input.taskNames.length > 0
      ? input.taskNames.join(", ")
      : "general volunteer support";

  const bringLine =
    input.thingsToBring.length > 0
      ? input.thingsToBring.join(", ")
      : "nothing specific listed";

  const arrivalLine = input.arrivalGuidance
    ? `Arrival guidance: ${input.arrivalGuidance}`
    : "";

  const greeting = input.volunteerName
    ? `The volunteer's name is ${input.volunteerName}.`
    : "The volunteer's name is not known — use a general greeting.";

  return `You are a warm, bilingual coordinator for a volunteer platform in Japan.
A volunteer has just been accepted for an event. Write a personalised booking confirmation.

Event details:
- Event name: ${input.eventName}
- Date and time: ${input.dateTime}
- Location: ${input.location}
- Task(s): ${taskLine}
- Things to bring: ${bringLine}
${arrivalLine}

${greeting}

Write:
- subject: a short English email subject line (max 10 words)
- bodyEn: a warm English confirmation (3–5 short paragraphs)
- bodyJa: the same message in natural Japanese (3–5 short paragraphs)

Rules:
- Address the volunteer by name if provided
- Mention the task, date, location, and what to bring
- Include the arrival guidance if provided
- Keep the tone friendly, grateful, and clear
- Do not invent details not listed above
- Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(raw: unknown): BuildConfirmationOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");

  const obj = raw as Record<string, unknown>;

  if (typeof obj.subject !== "string" || !obj.subject)
    throw new Error("Missing field: subject");
  if (typeof obj.bodyEn !== "string" || !obj.bodyEn)
    throw new Error("Missing field: bodyEn");
  if (typeof obj.bodyJa !== "string" || !obj.bodyJa)
    throw new Error("Missing field: bodyJa");

  return {
    subject: obj.subject,
    bodyEn: obj.bodyEn,
    bodyJa: obj.bodyJa,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function buildConfirmation(
  input: BuildConfirmationInput,
  ctx: AgentContext,
): Promise<AgentResult<BuildConfirmationOutput>> {
  // ── 1. Input validation ───────────────────────────────────────────────────
  if (!input.eventName.trim() || !input.dateTime.trim() || !input.location.trim()) {
    return {
      ok: false,
      error: "Event name, date, and location are required.",
      code: "INVALID_INPUT",
    };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (
    process.env.MOCK_AI === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log("[buildConfirmation] MOCK_AI=true — returning mock output");
    return {
      ok: true,
      data: MOCK_OUTPUT,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // ── 3. Real Gemini call ───────────────────────────────────────────────────
  try {
    const model = getModel();
    const prompt = buildPrompt(input);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.5, // balanced — warm tone but factually accurate
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    // ── 4. Parse and validate ─────────────────────────────────────────────
    let data: BuildConfirmationOutput;
    try {
      const raw = JSON.parse(result.response.text());
      data = validate(raw);
    } catch (parseError) {
      console.error("[buildConfirmation] Parse error:", parseError);
      return {
        ok: false,
        error: "The AI response was not in the expected format. Please try again.",
        code: "PARSE_ERROR",
      };
    }

    // ── 5. Log usage ──────────────────────────────────────────────────────
    await logAiInteraction({
      userId: ctx.userId,
      type: "BUILD_CONFIRMATION",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[buildConfirmation] Gemini error:", error);

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
      error: "The AI service encountered an error. The standard confirmation will be sent instead.",
      code: "MODEL_ERROR",
    };
  }
}
