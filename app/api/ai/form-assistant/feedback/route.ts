import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { organizerToolForbiddenResponse, userCanUseOrganizerTools } from "@/lib/authz";

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
    locale?: unknown;
    userAnswer?: unknown;
    botMessage?: unknown;
    context?: unknown;
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
  const locale = body.locale === "ja" ? "ja" : "en";
  const userAnswer = typeof body.userAnswer === "string" ? body.userAnswer : "";
  const botMessage = typeof body.botMessage === "string" ? body.botMessage : "";
  const context = safeContext(body.context);

  try {
    await prisma.$executeRaw`
      INSERT INTO "AiAssistantFeedback" (
        "id",
        "userId",
        "flowType",
        "stepId",
        "locale",
        "userAnswer",
        "botMessage",
        "context",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${session.user.id},
        ${flowType},
        ${stepId},
        ${locale},
        ${userAnswer || null},
        ${botMessage || null},
        ${JSON.stringify(context)}::jsonb,
        NOW()
      )
    `;
  } catch (error) {
    console.error("[form-assistant/feedback] Failed to persist feedback:", error);
  }

  return Response.json({ ok: true });
}

function safeContext(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return JSON.parse(JSON.stringify(value));
}
