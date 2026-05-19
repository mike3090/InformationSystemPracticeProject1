// ─── app/api/ai/draft-opportunity/route.ts ────────────────────────────────────
//
// POST /api/ai/draft-opportunity
//
// Thin HTTP wrapper around the draftOpportunity agent.
// Called by the "Draft with AI" button on the new opportunity form.
//
// Request body (JSON):
//   { roughDescription: string, organizerContext?: string, locale?: "ja" | "en" }
//
// Response (JSON):
//   AgentResult<DraftOpportunityOutput>
//   Includes extracted fields, missingDetails, visual photo prompts, and
//   display signals for the opportunity creation form.
//   — check result.ok before reading result.data
//
// ─────────────────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import { draftOpportunity } from "@/lib/ai";
import type { AgentContext } from "@/lib/ai";
import {
  organizerToolForbiddenResponse,
  userCanUseOrganizerTools,
} from "@/lib/authz";

export async function POST(request: Request) {
  // ── 1. Auth check ─────────────────────────────────────────────────────────
  // Only signed-in users can call this endpoint.
  // The requester role check is handled by the form page itself.
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json(
      {
        ok: false,
        error: "You must be signed in to use AI drafting.",
        code: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  if (!(await userCanUseOrganizerTools(session.user.id))) {
    return organizerToolForbiddenResponse();
  }

  // ── 2. Parse request body ─────────────────────────────────────────────────
  let roughDescription: string;
  let organizerContext: string | undefined;
  let locale: "ja" | "en";

  try {
    const body = await request.json() as {
      roughDescription?: unknown;
      organizerContext?: unknown;
      locale?: unknown;
    };

    roughDescription = typeof body.roughDescription === "string"
      ? body.roughDescription
      : "";

    organizerContext = typeof body.organizerContext === "string"
      ? body.organizerContext
      : undefined;

    locale = body.locale === "en" ? "en" : "ja";

  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid request body.",
        code: "INVALID_INPUT",
      },
      { status: 400 },
    );
  }

  // ── 3. Call the agent ─────────────────────────────────────────────────────
  const ctx: AgentContext = {
    userId: session.user.id,
    locale,
  };

  const result = await draftOpportunity(
    { roughDescription, organizerContext },
    ctx,
  );

  // ── 4. Return the result ──────────────────────────────────────────────────
  // The agent result is returned as-is. The client checks result.ok.
  // HTTP status is always 200 — errors are in the JSON body, not the status code.
  // This keeps the client-side fetch logic simple (no need to handle HTTP errors
  // separately from AI errors).
  return Response.json(result);
}
