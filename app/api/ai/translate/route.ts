// POST /api/ai/translate
// Called by both volunteers (reading Japanese opportunity descriptions) and
// organisers (reading volunteer messages in Japanese or English).
// Body: { text, targetLocale, context?, locale? }

import { auth } from "@/lib/auth";
import { translateText } from "@/lib/ai";
import type { AgentContext, TranslateTextInput } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: TranslateTextInput & { locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body.", code: "INVALID_INPUT" }, { status: 400 });
  }

  const ctx: AgentContext = {
    userId: session.user.id,
    locale: body.locale === "en" ? "en" : "ja",
    opportunityId: undefined,
  };

  const result = await translateText(
    {
      text: String(body.text ?? ""),
      targetLocale: body.targetLocale === "en" ? "en" : "ja",
      context: typeof body.context === "string" ? body.context : undefined,
    },
    ctx,
  );

  return Response.json(result);
}
