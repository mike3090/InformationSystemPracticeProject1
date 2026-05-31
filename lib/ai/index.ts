// ─── lib/ai/index.ts ──────────────────────────────────────────────────────────
//
// Public API for the AI agent layer.
// This is the ONLY file that other modules in the project should import from.
//
//   ✅  import { draftOpportunity } from "@/lib/ai";
//   ✅  import type { AgentResult, AgentContext } from "@/lib/ai";
//   ❌  import { getModel } from "@/lib/ai/client";   ← never do this outside lib/ai/
//   ❌  import { GoogleGenerativeAI } from "@google/generative-ai";  ← never outside lib/ai/
//
// Adding a new agent:
//  1. Create lib/ai/agents/yourAgent.ts following the pattern in existing agents.
//  2. Add your input/output types to lib/ai/types.ts.
//  3. Uncomment (or add) the export line below.
//  4. Other modules immediately gain access via "@/lib/ai".
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Types (always available) ──────────────────────────────────────────────────
//
// Frontend and backend code can import these types right now.
// They have no runtime cost — TypeScript erases them during compilation.

export type {
  // Result wrapper — used by every caller
  AgentResult,
  AgentOk,
  AgentError,

  // Context — passed into every agent call
  AgentContext,

  // Logging — used internally by agents, exported for transparency
  AiLogInput,
  AiInteractionType,

  // draftOpportunity
  DraftOpportunityInput,
  DraftOpportunityOutput,
  DraftedTask,

  // scoreApplicants
  ScoreApplicantsInput,
  ScoreApplicantsOutput,
  ApplicantForScoring,
  ApplicantScore,

  // buildConfirmation
  BuildConfirmationInput,
  BuildConfirmationOutput,

  // planRoute
  PlanRouteInput,
  PlanRouteOutput,
  RouteOption,

  // planMeal
  PlanMealInput,
  PlanMealOutput,
  MealSuggestion,

  // planAccommodations
  PlanAccommodationsInput,
  PlanAccommodationsOutput,
  AccommodationOption,

  // translateText
  TranslateTextInput,
  TranslateTextOutput,

  // rankOpportunities
  RankOpportunitiesInput,
  RankOpportunitiesOutput,
  OpportunityForRanking,
  OpportunityRanking,

  // formAssistant
  FormAssistantInput,
  FormAssistantOutput,
} from "./types";

// ── Agents ────────────────────────────────────────────────────────────────────
//
// Each line below will be uncommented as its agent file is implemented.
// Until then, callers can import the types above and build their UI
// against the correct shapes using mock data.

export { draftOpportunity }    from "./agents/draftOpportunity";
export { scoreApplicants }     from "./agents/scoreApplicants";
export { buildConfirmation }   from "./agents/buildConfirmation";
export { planRoute }           from "./agents/planRoute";
export { planMeal }            from "./agents/planMeal";
export { planAccommodations }  from "./agents/planAccommodations";
export { translateText }       from "./agents/translateText";
export { rankOpportunities }   from "./agents/rankOpportunities";
export { formAssistant }       from "./agents/formAssistant";

// ── Internal helpers (not re-exported) ────────────────────────────────────────
//
// lib/ai/client.ts  — getModel()         ← only used inside agent files
// lib/ai/log.ts     — logAiInteraction() ← only used inside agent files
//
// These are intentionally NOT exported here. Agent files import them directly.
// Keeping them internal prevents other parts of the app from bypassing
// the agent abstraction and calling Gemini or the log directly.
