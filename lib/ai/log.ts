// ─── lib/ai/log.ts ────────────────────────────────────────────────────────────
//
// Writes a row to the AiInteraction table in the database after each Gemini
// call. This lets the team track usage, cost, and which features are most used.
//
// Rules:
//  1. This function is always awaited by agents — but it NEVER throws.
//     A failure here must not crash the feature that called it.
//  2. Never call this file's function from client-side (browser) code.
//     It imports Prisma, which is a server-only library.
//  3. Agents call this after the Gemini response arrives, passing the token
//     counts from response.usageMetadata.
//
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { AiLogInput } from "@/lib/ai/types";

// ── Gemini pricing constants ──────────────────────────────────────────────────
//
// These are approximate values for gemini-2.0-flash as of 2025.
// Update them if the model or pricing changes.
// Prices are in USD per token (not per 1 million tokens).
//
// Official pricing: https://ai.google.dev/pricing

const COST_PER_INPUT_TOKEN = 0.075 / 1_000_000;   // $0.075 per 1M input tokens
const COST_PER_OUTPUT_TOKEN = 0.30 / 1_000_000;   // $0.30  per 1M output tokens

function estimateCost(inputTokens: number, outputTokens: number): number {
  const cost =
    inputTokens * COST_PER_INPUT_TOKEN +
    outputTokens * COST_PER_OUTPUT_TOKEN;

  // Round to 8 decimal places to avoid floating-point noise in the DB.
  return Math.round(cost * 1e8) / 1e8;
}

// ── Main export ───────────────────────────────────────────────────────────────
//
// Called at the end of every agent function, whether the call succeeded or not.
//
// Example (inside an agent):
//   await logAiInteraction({
//     userId: ctx.userId,
//     type: "DRAFT_OPPORTUNITY",
//     opportunityId: ctx.opportunityId ?? null,
//     inputTokens: response.response.usageMetadata?.promptTokenCount ?? 0,
//     outputTokens: response.response.usageMetadata?.candidatesTokenCount ?? 0,
//   });

export async function logAiInteraction(input: AiLogInput): Promise<void> {
  const cost = estimateCost(input.inputTokens, input.outputTokens);

  try {
    // Using $executeRaw (raw SQL) instead of prisma.aiInteraction.create()
    // for consistency with the rest of the codebase, and to handle the case
    // where the AiInteraction table migration has not yet been applied.
    await prisma.$executeRaw`
      INSERT INTO "AiInteraction" (
        "id",
        "userId",
        "opportunityId",
        "type",
        "inputTokens",
        "outputTokens",
        "cost",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.userId},
        ${input.opportunityId ?? null},
        ${input.type},
        ${input.inputTokens},
        ${input.outputTokens},
        ${cost},
        NOW()
      )
    `;
  } catch (error) {
    // Log the failure to the server console so it shows up in Vercel logs,
    // but do NOT re-throw. The calling agent's result is unaffected.
    console.error("[lib/ai/log] Failed to write AiInteraction row:", error);
  }
}
