// ─── lib/ai/agents/translateText.ts ──────────────────────────────────────────
//
// Agent: translateText
//
// Translates any text between Japanese and English. Used by both volunteers
// (reading opportunity descriptions posted in Japanese) and organisers
// (reading volunteer messages written in Japanese or English).
//
// Includes an optional nuanceNote when the translation involves cultural
// context worth surfacing — e.g. keigo (polite register), regional dialect,
// or an idiomatic phrase that doesn't translate directly.
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  TranslateTextInput,
  TranslateTextOutput,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────

function buildMockOutput(input: TranslateTextInput): TranslateTextOutput {
  // In mock mode, return a placeholder that makes it obvious AI was bypassed.
  // The original text is echoed so the UI still has something to display.
  return {
    translation:
      input.targetLocale === "en"
        ? `[Mock translation → English] ${input.text}`
        : `[モック翻訳 → 日本語] ${input.text}`,
    detectedSourceLocale: input.targetLocale === "en" ? "ja" : "en",
    nuanceNote: null,
  };
}

// ── Response schema ───────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    translation: { type: SchemaType.STRING },
    detectedSourceLocale: { type: SchemaType.STRING },
    nuanceNote: { type: SchemaType.STRING },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(input: TranslateTextInput): string {
  const targetLangLabel = input.targetLocale === "en" ? "English" : "Japanese";
  const contextLine = input.context
    ? `Context about this text: ${input.context}`
    : "No additional context provided.";

  return `You are a bilingual Japanese–English translator working for a community volunteer platform in Japan.
Translate the following text into ${targetLangLabel}.

Text to translate:
"""
${input.text}
"""

${contextLine}

Rules:
- Produce a natural, accurate translation — not a word-for-word literal conversion
- Match the register of the original (casual → casual, formal → formal)
- For Japanese → English: use plain, clear English suitable for a general audience
- For English → Japanese: use polite but approachable Japanese (丁寧語, not 敬語)
- detectedSourceLocale: "ja" if the input was Japanese, "en" if English, "other" if neither
- nuanceNote: if there is a cultural nuance, idiomatic phrase, or register consideration worth surfacing, provide a short note in English. Otherwise return null.

Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function validate(raw: unknown): TranslateTextOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");
  const obj = raw as Record<string, unknown>;

  if (typeof obj.translation !== "string" || !obj.translation)
    throw new Error("Missing: translation");

  const detectedSourceLocale =
    obj.detectedSourceLocale === "ja" ? "ja"
    : obj.detectedSourceLocale === "en" ? "en"
    : "other";

  const nuanceNote =
    typeof obj.nuanceNote === "string" && obj.nuanceNote.trim()
      ? obj.nuanceNote.trim()
      : null;

  return {
    translation: obj.translation,
    detectedSourceLocale,
    nuanceNote,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function translateText(
  input: TranslateTextInput,
  ctx: AgentContext,
): Promise<AgentResult<TranslateTextOutput>> {
  // ── 1. Validate ───────────────────────────────────────────────────────────
  if (!input.text.trim()) {
    return { ok: false, error: "Text to translate cannot be empty.", code: "INVALID_INPUT" };
  }

  if (input.text.length > 5000) {
    return {
      ok: false,
      error: "Text is too long. Please translate in smaller sections (max 5,000 characters).",
      code: "INVALID_INPUT",
    };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  if (process.env.MOCK_AI === "true" && process.env.NODE_ENV !== "production") {
    console.log("[translateText] MOCK_AI=true — returning mock output");
    return { ok: true, data: buildMockOutput(input), usage: { inputTokens: 0, outputTokens: 0 } };
  }

  // ── 3. Gemini call ────────────────────────────────────────────────────────
  try {
    const model = getModel();
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // Very low temperature — translations should be consistent and accurate,
        // not creative. Different calls with the same input should produce
        // the same translation.
        temperature: 0.1,
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    let data: TranslateTextOutput;
    try {
      data = validate(JSON.parse(result.response.text()));
    } catch (e) {
      console.error("[translateText] Parse error:", e);
      return { ok: false, error: "The translation could not be processed. Please try again.", code: "PARSE_ERROR" };
    }

    await logAiInteraction({
      userId: ctx.userId,
      type: "TRANSLATE_TEXT",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[translateText] Gemini error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
      return { ok: false, error: "The translation service is temporarily unavailable. Please try again later.", code: "QUOTA_EXCEEDED" };
    }
    return { ok: false, error: "Translation failed. Please try again.", code: "MODEL_ERROR" };
  }
}
