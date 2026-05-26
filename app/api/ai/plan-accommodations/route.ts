// POST /api/ai/plan-accommodations
// Called from the organiser's event management page when the event spans multiple days
// or volunteers are travelling from far away.
// Body: { eventCity, eventPrefecture, checkInDate, checkOutDate, volunteerCount, budget?, notes?, locale? }

import { auth } from "@/lib/auth";
import { planAccommodations } from "@/lib/ai";
import type { AgentContext, PlanAccommodationsInput } from "@/lib/ai";
import {
  organizerToolForbiddenResponse,
  userCanUseOrganizerTools,
} from "@/lib/authz";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await userCanUseOrganizerTools(session.user.id))) {
    return organizerToolForbiddenResponse();
  }

  let body: PlanAccommodationsInput & { locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body.", code: "INVALID_INPUT" }, { status: 400 });
  }

  const validBudgets = ["budget", "standard", "comfortable"];

  const ctx: AgentContext = {
    userId: session.user.id,
    locale: body.locale === "en" ? "en" : "ja",
  };

  const result = await planAccommodations(
    {
      eventCity: String(body.eventCity ?? ""),
      eventPrefecture: String(body.eventPrefecture ?? ""),
      checkInDate: String(body.checkInDate ?? ""),
      checkOutDate: String(body.checkOutDate ?? ""),
      volunteerCount: Number(body.volunteerCount ?? 1),
      budget: validBudgets.includes(String(body.budget))
        ? (body.budget as PlanAccommodationsInput["budget"])
        : "standard",
      notes: typeof body.notes === "string" ? body.notes : undefined,
    },
    ctx,
  );

  return Response.json(result);
}
