// POST /api/ai/plan-route
// Called from the volunteer's confirmed event detail page.
// Body: { fromCity, fromPrefecture, toAddress, toCity, toPrefecture, eventStartAt, locale? }

import { auth } from "@/lib/auth";
import { planRoute } from "@/lib/ai";
import type { AgentContext, PlanRouteInput } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: PlanRouteInput & { locale?: unknown };
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

  const result = await planRoute(
    {
      fromCity: String(body.fromCity ?? ""),
      fromPrefecture: String(body.fromPrefecture ?? ""),
      toAddress: String(body.toAddress ?? ""),
      toCity: String(body.toCity ?? ""),
      toPrefecture: String(body.toPrefecture ?? ""),
      eventStartAt: String(body.eventStartAt ?? ""),
    },
    ctx,
  );

  return Response.json(result);
}
