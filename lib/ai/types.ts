// ─── lib/ai/types.ts ──────────────────────────────────────────────────────────
//
// Shared TypeScript types for the AI agent layer.
//
// This file contains NO logic — only type definitions.
// It is safe to import in any context (server, edge, client).
//
// Other modules should import types like this:
//   import type { AgentResult, AgentContext } from "@/lib/ai";
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Result wrapper ────────────────────────────────────────────────────────────
//
// Every agent function returns AgentResult<T>.
// Callers check result.ok before reading result.data.
// No try/catch is needed outside the agent files themselves.
//
// Example usage:
//   const result = await draftOpportunity(input, ctx);
//   if (!result.ok) {
//     showError(result.error); // safe string for the UI
//     return;
//   }
//   console.log(result.data.title); // fully typed

export type AgentOk<T> = {
  ok: true;
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

export type AgentError = {
  ok: false;
  error: string; // Human-readable message, safe to show to users
  code:
    | "QUOTA_EXCEEDED"  // Gemini rate limit or billing cap hit
    | "INVALID_INPUT"   // The input failed validation before calling Gemini
    | "MODEL_ERROR"     // Gemini returned an error or timed out
    | "PARSE_ERROR";    // Gemini responded but the output wasn't valid JSON
};

// AgentResult<T> is either a success (AgentOk) or a failure (AgentError).
// The <T> is a placeholder filled in per-agent, e.g. AgentResult<DraftOpportunityOutput>.
export type AgentResult<T> = AgentOk<T> | AgentError;

// ── Agent context ─────────────────────────────────────────────────────────────
//
// Passed into every agent. Carries the caller's identity for DB logging
// and the locale for bilingual output.
// Never put raw session objects here — only serialisable primitives.

export type AgentContext = {
  userId: string;
  locale: "ja" | "en";
  opportunityId?: string; // present when the action relates to a specific opportunity
};

// ── Log input ─────────────────────────────────────────────────────────────────
//
// Passed to logAiInteraction() after each Gemini call.
// Matches the AiInteraction model in schema.prisma.

export type AiLogInput = {
  userId: string;
  type: AiInteractionType;
  opportunityId?: string | null;
  inputTokens: number;
  outputTokens: number;
};

// Each agent has a fixed type string so the AiInteraction table stays queryable.
export type AiInteractionType =
  | "DRAFT_OPPORTUNITY"
  | "SCORE_APPLICANTS"
  | "BUILD_CONFIRMATION"
  | "PLAN_ROUTE"
  | "PLAN_MEAL"
  | "PLAN_ACCOMMODATIONS"
  | "TRANSLATE_TEXT"
  | "RANK_OPPORTUNITIES"
  | "FORM_ASSISTANT";

// ── Agent: draftOpportunity ───────────────────────────────────────────────────
//
// Input:  a rough text description from the requester
// Output: a structured opportunity ready to populate the creation form

export type DraftOpportunityInput = {
  roughDescription: string;   // What the requester typed — any language, any length
  organizerContext?: string;  // Optional extra context: org name, location, past events
};

export type DraftOpportunityOutput = {
  title: string;
  titleJa: string;
  shortDescription: string;
  description: string;        // English prose, 80–150 words
  descriptionJa: string;
  category: string;
  tags: string[];
  skills: string[];           // e.g. ["gardening", "outdoor", "beginner friendly"]
  schedule: DraftSchedule;
  location: DraftLocation;
  capacity: DraftCapacity;
  thingsToBring: string[];    // e.g. ["Comfortable shoes", "Water bottle"]
  toolsProvided: string[];
  preApplicationQuestions: string[];
  arrivalGuidance: string;
  firstLandmarkDescription: string;
  firstContactName: string;
  firstContactRole: string;
  visuals: DraftVisualPrompts;
  display: DraftDisplaySignals;
  missingDetails: DraftMissingDetail[];
  confidence: DraftConfidence;
  taskFlow: DraftedTask[];
};

export type DraftedTask = {
  name: string;
  nameJa: string;
  startTime: string;          // "HH:MM" or "" when unknown
  durationMinutes: number | null;
  peopleNeeded: number | null;
  shortDescription: string;   // One sentence
  shortDescriptionJa: string;
  steps: string[];
};

export type DraftSchedule = {
  startAt: string;
  endAt: string;
  arrivalTime: string;
  scheduleNote: string;
};

export type DraftLocation = {
  prefecture: string;
  city: string;
  address: string;
  googleMapsUrl: string;
  locationNote: string;
};

export type DraftCapacity = {
  volunteersNeeded: number | null;
  maxApplicants: number | null;
  allowWaitlist: boolean;
};

export type DraftVisualPrompts = {
  coverPhotoPrompt: string;
  workspacePhotoPrompts: string[];
  landmarkPhotoPrompt: string;
  contactPhotoPrompt: string;
};

export type DraftDisplaySignals = {
  taskTypeColor: "green" | "blue" | "orange";
  environmentShape: "relaxed" | "structured";
  physicalEffort: "low" | "medium" | "high";
  mentalEffort: "low" | "medium" | "high";
};

export type DraftMissingDetail = {
  field: string;
  severity: "required" | "recommended";
  message: string;
};

export type DraftConfidence = {
  overall: "low" | "medium" | "high";
  notes: string[];
};

// ── Agent: formAssistant ─────────────────────────────────────────────────────

export type FormAssistantInput = {
  flowType: "profile" | "opportunity";
  stepId: string;
  fieldLabel: string;
  fieldType: string;
  rawValue: string;
  locale: "ja" | "en";
};

export type FormAssistantOutput = {
  isValid: boolean;
  normalizedValue: string;
  assistantMessage: string;
};

// ── Agent: scoreApplicants ────────────────────────────────────────────────────
//
// Input:  opportunity details + all pending applicants with their profiles
// Output: a score (0–100) and recommendation flag per applicant

export type ApplicantForScoring = {
  applicationId: string;
  skillTags: string[];           // Tags the applicant self-selected on the application
  experienceNote: string | null; // Free-text note from the application form
  volunteerBio: string | null;   // From VolunteerProfile
  volunteerSkills: string[];     // From VolunteerProfile
  volunteerInterests: string[];  // From VolunteerProfile
  selectedTaskNames: string[];   // Which tasks they chose
};

export type ScoreApplicantsInput = {
  opportunityTitle: string;
  opportunityDescription: string;
  opportunitySkills: string[];
  volunteersNeeded: number;
  applicants: ApplicantForScoring[];
};

export type ApplicantScore = {
  applicationId: string;
  matchScore: number;   // 0–100
  recommended: boolean; // true for the top-N applicants where N = volunteersNeeded
  reasoning: string;    // 1–2 sentences shown to the requester
};

export type ScoreApplicantsOutput = {
  scores: ApplicantScore[];
};

// ── Agent: buildConfirmation ──────────────────────────────────────────────────
//
// Input:  booking details after a requester accepts an application
// Output: a warm, bilingual confirmation message for the volunteer

export type BuildConfirmationInput = {
  eventName: string;
  dateTime: string;             // Pre-formatted date/time string
  location: string;
  taskNames: string[];
  thingsToBring: string[];
  arrivalGuidance: string | null;
  volunteerName: string | null; // Used to personalise the message
};

export type BuildConfirmationOutput = {
  subject: string;    // Email subject line (English)
  bodyEn: string;     // English confirmation body
  bodyJa: string;     // Japanese confirmation body
};

// ── Agent: planRoute ──────────────────────────────────────────────────────────
//
// Input:  volunteer's location and event site details
// Output: suggested travel options with steps, timing, and practical tips
//
// ⚠️  Gemini does not have live transit data. Output is advisory — based on
//     general knowledge of Japan's transit network. Volunteers should confirm
//     times and fares with Google Maps or the transit operator on the day.

export type PlanRouteInput = {
  fromCity: string;
  fromPrefecture: string;
  toAddress: string;
  toCity: string;
  toPrefecture: string;
  eventStartAt: string;   // ISO datetime — used to suggest a realistic departure time
};

export type RouteOption = {
  mode: string;           // e.g. "Train + Walk", "Bus", "Bicycle"
  estimatedMinutes: number;
  suggestedDeparture: string; // "HH:MM" — when to leave to arrive on time
  steps: string[];        // Turn-by-turn in plain language
  fare: string | null;    // e.g. "¥450" or null if unknown
  notes: string | null;   // IC card tips, platform numbers, etc.
};

export type PlanRouteOutput = {
  summary: string;        // e.g. "About 45 min from central Kyoto by train"
  summaryJa: string;
  options: RouteOption[]; // 1–3 realistic options
  generalTips: string[];  // e.g. "IC cards (Suica/ICOCA) accepted throughout"
  disclaimer: string;     // Remind user this is advisory, not live data
};

// ── Agent: planMeal ───────────────────────────────────────────────────────────
//
// Input:  volunteer count, event location, time of day, dietary notes
// Output: meal suggestions rooted in local Japanese cuisine

export type PlanMealInput = {
  volunteerCount: number;
  eventCity: string;
  eventPrefecture: string;
  timeOfDay: "morning" | "midday" | "afternoon" | "evening";
  eventDurationHours: number;
  dietaryNotes?: string;  // e.g. "some vegetarians, no shellfish"
  budget?: "low" | "medium" | "high";
};

export type MealSuggestion = {
  name: string;           // English dish/option name
  nameJa: string;
  description: string;    // What it is and why it suits volunteers
  portionNote: string;    // e.g. "1 bento box per person"
  localRelevance: string; // Why this makes sense for the prefecture/city
};

export type PlanMealOutput = {
  overallRecommendation: string;    // Short summary of the meal plan
  overallRecommendationJa: string;
  suggestions: MealSuggestion[];    // 2–4 concrete options
  sourcingTips: string[];           // Where/how to obtain the food locally
  estimatedCostPerPerson: string;   // e.g. "¥600–900"
  disclaimer: string;               // Prices/availability vary — check locally
};

// ── Agent: planAccommodations ─────────────────────────────────────────────────
//
// Input:  event location, dates, volunteer count, budget level
// Output: accommodation options suited to the location and group size
//
// ⚠️  Output is advisory. Availability and pricing should be confirmed
//     through booking platforms before committing.

export type PlanAccommodationsInput = {
  eventCity: string;
  eventPrefecture: string;
  checkInDate: string;    // ISO date string "YYYY-MM-DD"
  checkOutDate: string;
  volunteerCount: number;
  budget?: "budget" | "standard" | "comfortable";
  notes?: string;         // e.g. "prefer walking distance to the venue", "mixed group"
};

export type AccommodationOption = {
  type: string;                   // e.g. "Business hotel", "Ryokan", "Guesthouse"
  typeJa: string;
  priceRangePerNightPerPerson: string; // e.g. "¥5,000–8,000"
  recommendedArea: string;        // Neighbourhood or district name
  whyRecommended: string;         // Brief reasoning for this suggestion
  tips: string[];                 // Booking advice, what to look for, cultural notes
};

export type PlanAccommodationsOutput = {
  summary: string;
  summaryJa: string;
  options: AccommodationOption[];   // 2–3 options at different price points
  bookingAdvice: string[];          // General tips: book early, cancellation policy, etc.
  disclaimer: string;
};

// ── Agent: rankOpportunities ──────────────────────────────────────────────────
//
// Input:  volunteer profile + list of open opportunities
// Output: scored and ranked list with an "AI Pick" flag for the top matches
//
// Used by the "AI Recommendations" button on the opportunity discovery page.
// Scores are computed per-session in the client — they are NOT persisted to DB.

export type OpportunityForRanking = {
  opportunityId: string;
  title: string;
  category: string;
  tags: string[];
  skills: string[];
  shortDescription: string;
  city: string;
  prefecture: string;
};

export type RankOpportunitiesInput = {
  volunteerBio: string | null;
  volunteerSkills: string[];
  volunteerInterests: string[];
  volunteerPreferredTaskTypes: string[];
  volunteerPreferredEnvironment: string | null;
  volunteerCity: string | null;
  volunteerPrefecture: string | null;
  opportunities: OpportunityForRanking[];
};

export type OpportunityRanking = {
  opportunityId: string;
  score: number;   // 0–100 — how well the opportunity matches this volunteer
  aiPick: boolean; // true for the top 3 recommendations
  reason: string;  // 1–2 sentences addressed to the volunteer
};

export type RankOpportunitiesOutput = {
  rankings: OpportunityRanking[];
};

// ── Agent: translateText ──────────────────────────────────────────────────────
//
// Input:  any text + target language
// Output: translated text with optional cultural nuance note
//
// Used by both volunteers (reading opportunity descriptions) and organizers
// (reading volunteer messages). Primarily Japanese ↔ English.

export type TranslateTextInput = {
  text: string;
  /** BCP-47-style code: "ja", "en", "zh", "ko", "es", "fr", … */
  targetLocale: string;
  context?: string; // Optional hint: e.g. "volunteer opportunity title", "chat message"
};

export type TranslateTextOutput = {
  translation: string;
  detectedSourceLocale: "ja" | "en" | "other";
  nuanceNote: string | null; // Cultural or linguistic note worth surfacing, or null
};
