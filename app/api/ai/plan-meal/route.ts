// POST /api/ai/plan-meal
// Called from the organiser's event management page.
// Body: { volunteerCount, eventCity, eventPrefecture, timeOfDay, eventDurationHours, dietaryNotes?, budget?, locale? }

import { auth } from "@/lib/auth";
import { planMeal } from "@/lib/ai";
import type { AgentContext, PlanMealInput } from "@/lib/ai";
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

  let body: PlanMealInput & { locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body.", code: "INVALID_INPUT" }, { status: 400 });
  }

  const validTimesOfDay = ["morning", "midday", "afternoon", "evening"];
  const validBudgets = ["low", "medium", "high"];

  const ctx: AgentContext = {
    userId: session.user.id,
    locale: body.locale === "en" ? "en" : "ja",
  };

  const result = await planMeal(
    {
      volunteerCount: Number(body.volunteerCount ?? 1),
      eventCity: String(body.eventCity ?? ""),
      eventPrefecture: String(body.eventPrefecture ?? ""),
      timeOfDay: validTimesOfDay.includes(String(body.timeOfDay))
        ? (body.timeOfDay as PlanMealInput["timeOfDay"])
        : "midday",
      eventDurationHours: Number(body.eventDurationHours ?? 3),
      dietaryNotes: typeof body.dietaryNotes === "string" ? body.dietaryNotes : undefined,
      budget: validBudgets.includes(String(body.budget))
        ? (body.budget as PlanMealInput["budget"])
        : "medium",
    },
    ctx,
  );

  return Response.json(result);
}
