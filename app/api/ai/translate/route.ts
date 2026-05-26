// POST /api/ai/translate
// Body: { text, targetLocale, context?, locale? }
// targetLocale accepts any supported language code: "ja", "en", "zh", "ko", "es", "fr"

import { auth } from "@/lib/auth";
import { translateText } from "@/lib/ai";
import type { AgentContext } from "@/lib/ai";

const SUPPORTED_LOCALES = new Set(["ja", "en", "zh", "ko", "es", "fr"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: { text?: unknown; targetLocale?: unknown; context?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body.", code: "INVALID_INPUT" }, { status: 400 });
  }

  const rawTarget = typeof body.targetLocale === "string" ? body.targetLocale : "";
  const targetLocale = SUPPORTED_LOCALES.has(rawTarget) ? rawTarget : "ja";

  const ctx: AgentContext = {
    userId: session.user.id,
    locale: body.locale === "en" ? "en" : "ja",
    opportunityId: undefined,
  };

  const result = await translateText(
    {
      text: String(body.text ?? ""),
      targetLocale,
      context: typeof body.context === "string" ? body.context : undefined,
    },
    ctx,
  );

  return Response.json(result);
}
