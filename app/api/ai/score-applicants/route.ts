// ─── app/api/ai/score-applicants/route.ts ────────────────────────────────────
//
// POST /api/ai/score-applicants
//
// Called by the "Run AI Match" button on the requester's opportunity review page.
//
// What this route does:
//  1. Verifies the requester owns the opportunity
//  2. Fetches all PENDING applications with volunteer profile data
//  3. Calls the scoreApplicants agent
//  4. Writes matchScore and aiRecommended back to each Application row
//  5. Returns the scored list to the client
//
// Request body (JSON):
//   { opportunityId: string }
//
// Response (JSON):
//   AgentResult<ScoreApplicantsOutput>
//
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreApplicants } from "@/lib/ai";
import type { AgentContext, ApplicantForScoring } from "@/lib/ai";

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
  let opportunityId: string;
  let locale: "ja" | "en";

  try {
    const body = await request.json() as { opportunityId?: unknown; locale?: unknown };
    opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : "";
    locale = body.locale === "en" ? "en" : "ja";
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request body.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  if (!opportunityId) {
    return Response.json(
      { ok: false, error: "opportunityId is required.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // ── 3. Verify ownership ───────────────────────────────────────────────────
  // Only the requester who posted the opportunity can trigger AI matching.
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, requesterId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      skills: true,
      volunteersNeeded: true,
    },
  });

  if (!opportunity) {
    return Response.json(
      {
        ok: false,
        error: "Opportunity not found or you do not have permission.",
        code: "UNAUTHORIZED",
      },
      { status: 403 },
    );
  }

  // ── 4. Fetch applicants with profile data ─────────────────────────────────
  // We only score PENDING applicants — ACCEPTED/REJECTED ones are already decided.
  type RawApplicant = {
    applicationId: string;
    skillTags: string[];
    experienceNote: string | null;
    selectedTaskItems: unknown;
    volunteerBio: string | null;
    volunteerSkills: string[];
    volunteerInterests: string[];
  };

  const rows = await prisma.$queryRaw<RawApplicant[]>`
    SELECT
      a."id"                       AS "applicationId",
      a."skillTags"                AS "skillTags",
      a."experienceNote"           AS "experienceNote",
      a."selectedTaskItems"        AS "selectedTaskItems",
      vp."bio"                     AS "volunteerBio",
      COALESCE(vp."skills", '{}')  AS "volunteerSkills",
      COALESCE(vp."interests", '{}') AS "volunteerInterests"
    FROM "Application" a
    LEFT JOIN "VolunteerProfile" vp ON vp."userId" = a."volunteerId"
    WHERE a."opportunityId" = ${opportunityId}
      AND a."status" = 'PENDING'::"ApplicationStatus"
  `;

  if (rows.length === 0) {
    return Response.json(
      {
        ok: false,
        error: "No pending applicants to score.",
        code: "INVALID_INPUT",
      },
    );
  }

  // Shape the raw DB rows into the type the agent expects
  const applicants: ApplicantForScoring[] = rows.map((row) => {
    // selectedTaskItems is stored as JSONB — extract the task names
    const taskItems = Array.isArray(row.selectedTaskItems)
      ? (row.selectedTaskItems as { name?: string }[])
          .map((t) => t.name ?? "")
          .filter(Boolean)
      : [];

    return {
      applicationId: row.applicationId,
      skillTags: row.skillTags ?? [],
      experienceNote: row.experienceNote,
      volunteerBio: row.volunteerBio,
      volunteerSkills: row.volunteerSkills ?? [],
      volunteerInterests: row.volunteerInterests ?? [],
      selectedTaskNames: taskItems,
    };
  });

  // ── 5. Call the agent ─────────────────────────────────────────────────────
  const ctx: AgentContext = {
    userId: session.user.id,
    locale,
    opportunityId,
  };

  const result = await scoreApplicants(
    {
      opportunityTitle: opportunity.title,
      opportunityDescription: opportunity.description,
      opportunitySkills: opportunity.skills,
      volunteersNeeded: opportunity.volunteersNeeded,
      applicants,
    },
    ctx,
  );

  // ── 6. Write scores back to the database ──────────────────────────────────
  // Only runs if the agent succeeded.
  if (result.ok) {
    await Promise.all(
      result.data.scores.map((score) =>
        prisma.$executeRaw`
          UPDATE "Application"
          SET "matchScore"    = ${score.matchScore},
              "aiRecommended" = ${score.recommended},
              "updatedAt"     = NOW()
          WHERE "id" = ${score.applicationId}
            AND "opportunityId" = ${opportunityId}
        `,
      ),
    );
  }

  return Response.json(result);
}
