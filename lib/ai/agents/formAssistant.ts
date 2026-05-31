import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentContext,
  AgentResult,
  FormAssistantInput,
  FormAssistantOutput,
} from "@/lib/ai/types";

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    isValid: { type: SchemaType.BOOLEAN },
    normalizedValue: { type: SchemaType.STRING },
    assistantMessage: { type: SchemaType.STRING },
  },
} as const;

export async function formAssistant(
  input: FormAssistantInput,
  ctx: AgentContext,
): Promise<AgentResult<FormAssistantOutput>> {
  if (!input.rawValue.trim()) {
    return {
      ok: false,
      error: "Please enter an answer before sending.",
      code: "INVALID_INPUT",
    };
  }

  if (process.env.MOCK_AI === "true" && process.env.NODE_ENV !== "production") {
    return {
      ok: true,
      data: {
        isValid: true,
        normalizedValue: input.rawValue.trim(),
        assistantMessage:
          input.locale === "ja"
            ? "ありがとうございます。この内容で進めます。"
            : "Thanks. I will use that and continue.",
      },
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  try {
    const model = getModel();
    const prompt = buildPrompt(input);
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.response.text();
    const parsed = validate(JSON.parse(text));
    const usage = response.response.usageMetadata;

    await logAiInteraction({
      userId: ctx.userId,
      type: "FORM_ASSISTANT",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    });

    return {
      ok: true,
      data: parsed,
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: usage?.candidatesTokenCount ?? 0,
      },
    };
  } catch {
    return {
      ok: false,
      error: "The assistant could not review this answer right now.",
      code: "MODEL_ERROR",
    };
  }
}

function buildPrompt(input: FormAssistantInput) {
  const language = input.locale === "ja" ? "Japanese" : "English";
  return `You are a concise form-filling assistant for an organizer volunteer platform.

Review one answer for one field. Return JSON only.

Flow: ${input.flowType}
Step: ${input.stepId}
Field label: ${input.fieldLabel}
Field type: ${input.fieldType}
User answer:
"""
${input.rawValue}
"""

Rules:
- Do not invent facts.
- If the answer is clearly unusable for this field, set isValid=false and ask one short clarification in ${language}.
- If the answer is usable, set isValid=true.
- normalizedValue should be a clean value suitable for a form field.
- For list fields, normalize to comma-separated items.
- For datetime fields, prefer YYYY-MM-DDTHH:mm if the answer contains a clear date and time.
- assistantMessage should be short, friendly, and in ${language}.`;
}

function validate(raw: unknown): FormAssistantOutput {
  const object = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    isValid: object.isValid === true,
    normalizedValue:
      typeof object.normalizedValue === "string" ? object.normalizedValue.trim() : "",
    assistantMessage:
      typeof object.assistantMessage === "string"
        ? object.assistantMessage.trim()
        : "",
  };
}
