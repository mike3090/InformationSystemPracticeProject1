// ─── app/api/ai/rank-opportunities/route.ts ───────────────────────────────────
//
// POST /api/ai/rank-opportunities
//
// Called by the "AI Recommendations" button on the opportunity discovery page.
//
// What this route does:
//  1. Verifies the caller is signed in
//  2. Fetches the volunteer's profile from the database
//  3. Fetches opportunity details for the requested IDs
//  4. Calls the rankOpportunities agent
//  5. Returns the ranked list to the client (scores are NOT persisted)
//
// Request body (JSON):
//   { opportunityIds: string[]; locale: "en" | "ja" }
//
// Response (JSON):
//   AgentResult<RankOpportunitiesOutput>
//
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rankOpportunities } from "@/lib/ai";
import type { AgentContext, OpportunityForRanking } from "@/lib/ai";

export async function POST(request: Request) {
  // ── 1. Auth check ─────────────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      { ok: false, error: "You must be signed in.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let opportunityIds: string[];
  let locale: "ja" | "en";

  try {
    const body = await request.json() as {
      opportunityIds?: unknown;
      locale?: unknown;
    };
    opportunityIds = Array.isArray(body.opportunityIds)
      ? body.opportunityIds.filter((id): id is string => typeof id === "string")
      : [];
    locale = body.locale === "en" ? "en" : "ja";
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request body.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  if (opportunityIds.length === 0) {
    return Response.json(
      { ok: false, error: "opportunityIds is required.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // ── 3. Fetch volunteer profile and opportunity details in parallel ─────────
  const [profile, opportunities] = await Promise.all([
    prisma.volunteerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        bio: true,
        skills: true,
        interests: true,
        preferredTaskTypes: true,
        preferredEnvironmentStyle: true,
        city: true,
        prefecture: true,
      },
    }),
    prisma.opportunity.findMany({
      where: { id: { in: opportunityIds }, status: "OPEN" },
      select: {
        id: true,
        title: true,
        category: true,
        tags: true,
        skills: true,
        shortDescription: true,
        city: true,
        prefecture: true,
      },
    }),
  ]);

  if (opportunities.length === 0) {
    return Response.json(
      { ok: false, error: "No matching opportunities found.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // ── 4. Shape data for the agent ───────────────────────────────────────────
  const oppsForRanking: OpportunityForRanking[] = opportunities.map((opp) => ({
    opportunityId: opp.id,
    title: opp.title,
    category: opp.category ?? "",
    tags: opp.tags,
    skills: opp.skills,
    shortDescription: opp.shortDescription ?? "",
    city: opp.city ?? "",
    prefecture: opp.prefecture ?? "",
  }));

  // ── 5. Call the agent ─────────────────────────────────────────────────────
  const ctx: AgentContext = { userId: session.user.id, locale };

  const result = await rankOpportunities(
    {
      volunteerBio: profile?.bio ?? null,
      volunteerSkills: profile?.skills ?? [],
      volunteerInterests: profile?.interests ?? [],
      volunteerPreferredTaskTypes: profile?.preferredTaskTypes ?? [],
      volunteerPreferredEnvironment: profile?.preferredEnvironmentStyle ?? null,
      volunteerCity: profile?.city ?? null,
      volunteerPrefecture: profile?.prefecture ?? null,
      opportunities: oppsForRanking,
    },
    ctx,
  );

  return Response.json(result);
}
