import { auth } from "@/lib/auth";
import { organizerToolForbiddenResponse, userCanUseOrganizerTools } from "@/lib/authz";
import { formAssistant } from "@/lib/ai";
import type { AgentContext } from "@/lib/ai";
import {
  getAllProfileAssistantSteps,
  opportunityRequiredSteps,
  splitList,
  validateAssistantAnswer,
  type AssistantFlowType,
  type AssistantValues,
} from "@/lib/formAssistant/flows";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (!(await userCanUseOrganizerTools(session.user.id))) {
    return organizerToolForbiddenResponse();
  }

  let body: {
    flowType?: unknown;
    stepId?: unknown;
    value?: unknown;
    values?: unknown;
    locale?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request body.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const flowType = body.flowType === "opportunity" ? "opportunity" : "profile";
  const stepId = typeof body.stepId === "string" ? body.stepId : "";
  const value = typeof body.value === "string" ? body.value : "";
  const locale = body.locale === "ja" ? "ja" : "en";
  const values = normalizeValues(body.values);
  const step = findStep(flowType, stepId, values);

  if (!step) {
    return Response.json(
      { ok: false, error: "Unknown assistant step.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const local = validateAssistantAnswer(step, value, values);
  if (!local.ok) {
    return Response.json({
      ok: true,
      data: {
        accepted: false,
        normalizedValue: "",
        assistantMessage: locale === "ja" ? local.messageJa : local.messageEn,
      },
    });
  }

  if (!process.env.GEMINI_API_KEY && process.env.MOCK_AI !== "true") {
    return Response.json({
      ok: true,
      data: {
        accepted: true,
        normalizedValue: local.normalizedValue,
        assistantMessage:
          locale === "ja"
            ? "ありがとうございます。この内容で進めます。"
            : "Thanks. I will use that and continue.",
      },
    });
  }

  const ctx: AgentContext = { userId: session.user.id, locale };
  const result = await formAssistant(
    {
      flowType,
      stepId,
      fieldLabel: locale === "ja" ? step.labelJa : step.labelEn,
      fieldType: step.type,
      rawValue: local.normalizedValue,
      locale,
    },
    ctx,
  );

  if (!result.ok) {
    return Response.json({
      ok: true,
      data: {
        accepted: true,
        normalizedValue: local.normalizedValue,
        assistantMessage:
          locale === "ja"
            ? "ありがとうございます。この内容で進めます。"
            : "Thanks. I will use that and continue.",
      },
    });
  }

  if (!result.data.isValid) {
    return Response.json({
      ok: true,
      data: {
        accepted: false,
        normalizedValue: "",
        assistantMessage:
          result.data.assistantMessage ||
          (locale === "ja"
            ? "もう少し具体的に教えてください。"
            : "Please add a little more detail."),
      },
    });
  }

  const normalizedValue =
    step.type === "list"
      ? splitList(result.data.normalizedValue || local.normalizedValue).join(", ")
      : result.data.normalizedValue || local.normalizedValue;

  return Response.json({
    ok: true,
    data: {
      accepted: true,
      normalizedValue,
      assistantMessage:
        result.data.assistantMessage ||
        (locale === "ja"
          ? "ありがとうございます。この内容で進めます。"
          : "Thanks. I will use that and continue."),
    },
  });
}

function findStep(flowType: AssistantFlowType, stepId: string, values: AssistantValues) {
  const steps =
    flowType === "profile"
      ? getAllProfileAssistantSteps(values)
      : opportunityRequiredSteps;
  return steps.find((step) => step.id === stepId);
}

function normalizeValues(value: unknown): AssistantValues {
  if (!value || typeof value !== "object") return {};
  const values = value as Record<string, unknown>;
  const normalized: AssistantValues = {};
  for (const [key, item] of Object.entries(values)) {
    if (typeof item === "string" || typeof item === "boolean") {
      normalized[key] = item;
    }
  }
  return normalized;
}
