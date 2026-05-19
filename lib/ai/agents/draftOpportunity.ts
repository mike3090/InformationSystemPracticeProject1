// ─── lib/ai/agents/draftOpportunity.ts ───────────────────────────────────────
//
// Agent: draftOpportunity
//
// Takes a requester's rough description and returns a fully structured,
// bilingual volunteer opportunity posting ready for the creation form.
//
// Real API calls only happen when MOCK_AI is not "true".
// Set MOCK_AI=true in .env.local during UI development to avoid using quota.
//
// ─────────────────────────────────────────────────────────────────────────────

import { SchemaType } from "@google/generative-ai";
import { getModel } from "@/lib/ai/client";
import { logAiInteraction } from "@/lib/ai/log";
import type {
  AgentResult,
  AgentContext,
  DraftOpportunityInput,
  DraftOpportunityOutput,
  DraftedTask,
} from "@/lib/ai/types";

// ── Mock output ───────────────────────────────────────────────────────────────
//
// Returned immediately when MOCK_AI=true in .env.local.
// Lets the frontend team build and style the form pre-fill without
// spending any API quota. Replace the text to test different scenarios.

const MOCK_OUTPUT: DraftOpportunityOutput = {
  title: "Community Park Cleanup — Kamogawa Delta",
  titleJa: "地域公園清掃 — 鴨川デルタ",
  shortDescription: "Help refresh the riverside park with simple outdoor cleanup tasks.",
  description:
    "Join neighbours to refresh the riverside park before summer. " +
    "Tasks are split into small friendly groups — litter picking, " +
    "path sweeping, and a short rest together afterward. " +
    "No experience needed; all tools are provided on the day.",
  descriptionJa:
    "夏前に近隣住民と一緒に川沿いの公園をきれいにしましょう。" +
    "ゴミ拾い・通路清掃など小グループに分かれて作業します。" +
    "経験不要、道具はすべて当日用意します。",
  category: "Community cleanup",
  tags: ["beginner friendly", "outdoor", "morning", "local community"],
  skills: ["outdoor", "beginner friendly", "physical"],
  schedule: {
    startAt: "",
    endAt: "",
    arrivalTime: "",
    scheduleNote: "Morning cleanup; exact date and time should be confirmed.",
  },
  location: {
    prefecture: "Kyoto",
    city: "Kyoto",
    address: "",
    googleMapsUrl: "",
    locationNote: "Kamogawa Delta area; exact meeting point should be confirmed.",
  },
  capacity: {
    volunteersNeeded: 3,
    maxApplicants: null,
    allowWaitlist: true,
  },
  thingsToBring: ["Comfortable shoes", "Hat or sun cover", "Water bottle"],
  toolsProvided: ["Trash bags", "Gloves", "Brooms"],
  preApplicationQuestions: ["Are you comfortable doing light outdoor cleanup?"],
  arrivalGuidance: "",
  firstLandmarkDescription: "",
  firstContactName: "",
  firstContactRole: "",
  visuals: {
    coverPhotoPrompt: "Add a clear photo of the riverside park or cleanup area.",
    workspacePhotoPrompts: [
      "Photo of the main path volunteers will clean",
      "Photo of the meeting point",
      "Photo of tools provided on the day",
    ],
    landmarkPhotoPrompt: "Add the landmark volunteers should look for when they arrive.",
    contactPhotoPrompt: "Add a photo of the organizer who will greet volunteers, if appropriate.",
  },
  display: {
    taskTypeColor: "green",
    environmentShape: "relaxed",
    physicalEffort: "medium",
    mentalEffort: "low",
  },
  missingDetails: [
    {
      field: "schedule.startAt",
      severity: "required",
      message: "Confirm the exact date and start time.",
    },
    {
      field: "location.address",
      severity: "required",
      message: "Confirm the exact meeting place or address.",
    },
    {
      field: "arrivalGuidance",
      severity: "recommended",
      message: "Add what volunteers should look for when they arrive.",
    },
  ],
  confidence: {
    overall: "medium",
    notes: ["The task flow is plausible, but exact schedule and meeting point are missing."],
  },
  taskFlow: [
    {
      name: "Litter picking",
      nameJa: "ゴミ拾い",
      startTime: "09:30",
      durationMinutes: 60,
      peopleNeeded: 2,
      shortDescription: "Collect litter along the main riverside path.",
      shortDescriptionJa: "川沿いのメイン通路でゴミを収集します。",
      steps: ["Meet the organizer", "Pick up litter along the path", "Return tools and bags"],
    },
    {
      name: "Path sweeping",
      nameJa: "通路の清掃",
      startTime: "10:30",
      durationMinutes: 45,
      peopleNeeded: 1,
      shortDescription: "Sweep leaves and dust from the walking paths.",
      shortDescriptionJa: "歩道の落ち葉やほこりを掃き清めます。",
      steps: ["Collect broom", "Sweep the assigned path", "Gather leaves near collection point"],
    },
    {
      name: "Rest and debrief",
      nameJa: "休憩と振り返り",
      startTime: "11:15",
      durationMinutes: 30,
      peopleNeeded: null,
      shortDescription: "Share tea and a short thank-you from the organiser.",
      shortDescriptionJa: "主催者からのお礼とともにお茶でひと休みします。",
      steps: ["Return tools", "Share a short debrief", "Confirm cleanup is complete"],
    },
  ],
};

// ── Response schema ───────────────────────────────────────────────────────────
//
// Tells Gemini the exact JSON shape we expect. When a responseSchema is
// provided, Gemini is constrained to only produce that structure —
// no prose, no markdown, no extra fields. This prevents parse errors.

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    titleJa: { type: SchemaType.STRING },
    shortDescription: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    descriptionJa: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    schedule: {
      type: SchemaType.OBJECT,
      properties: {
        startAt: { type: SchemaType.STRING },
        endAt: { type: SchemaType.STRING },
        arrivalTime: { type: SchemaType.STRING },
        scheduleNote: { type: SchemaType.STRING },
      },
    },
    location: {
      type: SchemaType.OBJECT,
      properties: {
        prefecture: { type: SchemaType.STRING },
        city: { type: SchemaType.STRING },
        address: { type: SchemaType.STRING },
        googleMapsUrl: { type: SchemaType.STRING },
        locationNote: { type: SchemaType.STRING },
      },
    },
    capacity: {
      type: SchemaType.OBJECT,
      properties: {
        volunteersNeeded: { type: SchemaType.INTEGER },
        maxApplicants: { type: SchemaType.INTEGER },
        allowWaitlist: { type: SchemaType.BOOLEAN },
      },
    },
    thingsToBring: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    toolsProvided: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    preApplicationQuestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    arrivalGuidance: { type: SchemaType.STRING },
    firstLandmarkDescription: { type: SchemaType.STRING },
    firstContactName: { type: SchemaType.STRING },
    firstContactRole: { type: SchemaType.STRING },
    visuals: {
      type: SchemaType.OBJECT,
      properties: {
        coverPhotoPrompt: { type: SchemaType.STRING },
        workspacePhotoPrompts: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        landmarkPhotoPrompt: { type: SchemaType.STRING },
        contactPhotoPrompt: { type: SchemaType.STRING },
      },
    },
    display: {
      type: SchemaType.OBJECT,
      properties: {
        taskTypeColor: { type: SchemaType.STRING },
        environmentShape: { type: SchemaType.STRING },
        physicalEffort: { type: SchemaType.STRING },
        mentalEffort: { type: SchemaType.STRING },
      },
    },
    missingDetails: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          field: { type: SchemaType.STRING },
          severity: { type: SchemaType.STRING },
          message: { type: SchemaType.STRING },
        },
      },
    },
    confidence: {
      type: SchemaType.OBJECT,
      properties: {
        overall: { type: SchemaType.STRING },
        notes: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
    },
    taskFlow: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          nameJa: { type: SchemaType.STRING },
          startTime: { type: SchemaType.STRING },
          durationMinutes: { type: SchemaType.INTEGER },
          peopleNeeded: { type: SchemaType.INTEGER },
          shortDescription: { type: SchemaType.STRING },
          shortDescriptionJa: { type: SchemaType.STRING },
          steps: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
      },
    },
  },
} as const;

// ── Prompt builder ────────────────────────────────────────────────────────────
//
// Builds the text sent to Gemini. Keeping it in a separate function makes it
// easy to iterate on the prompt without touching the agent logic.

function buildPrompt(input: DraftOpportunityInput, locale: "ja" | "en"): string {
  const extra = input.organizerContext
    ? `\n\nOptional organizer context:\n"""\n${input.organizerContext}\n"""`
    : "";

  return `You are an opportunity-structuring assistant for a volunteer matching platform in Japan.

Your job is to read an organizer's natural-language description of a volunteer opportunity and convert it into structured draft data for the platform.

The organizer may write casually, incompletely, or in Japanese, English, or mixed language. Do not invent critical facts. If something is unclear or missing, use an empty string for text fields, 0 for unknown numeric fields, and add a missingDetails item.

Organizer input:
"""
${input.roughDescription}
"""${extra}

Locale requested for the UI: ${locale}

Your goals:
1. Extract the concrete facts the organizer already provided.
2. Rewrite them into clear, volunteer-facing language.
3. Identify missing details that should be confirmed before publishing.
4. Suggest useful photos the organizer should upload.
5. Produce a structured JSON object matching the response schema exactly.

Important behavior:
- Return JSON only. No markdown, no explanation.
- Do not ask the user questions directly in prose.
- Prefer practical, specific wording over promotional language.
- If the organizer did not provide an exact date, time, address, capacity, or meeting point, do not guess it.
- You may infer soft labels such as category, tags, skills, effort level, environmentShape, or taskTypeColor when the description strongly suggests them.
- Keep the tone warm, calm, and trustworthy.
- Generate both English and Japanese versions for title, description, and task fields.
- For unknown strings, output "".
- For unknown numbers, output 0.
- For unknown arrays, output [].

Field guidance:

title / titleJa:
- Short, concrete, volunteer-facing.
- Mention the activity and place if known.
- Max 12 words.

shortDescription:
- One sentence for a listing card, in the requested UI locale.

description / descriptionJa:
- 80 to 140 words each.
- Explain what volunteers will help with, why it matters, and what the day will feel like.
- Do not include critical facts not present in the input.

category:
- Choose a concise category, e.g. "Event support", "Outdoor care", "Community cleanup", "Education", "Translation", "Food support", "Elder care", "Local tourism".

tags:
- 3 to 6 short tags.
- Use lowercase English if locale is "en"; natural Japanese tags if locale is "ja".

skills:
- Practical skills or qualities volunteers may need.
- If no special skill is needed, include "beginner friendly" or the locale-appropriate equivalent.

schedule:
- startAt, endAt, arrivalTime should be ISO-like local datetime strings only when exact date and time are known.
- If only vague timing is given, put it in scheduleNote and leave exact datetime fields empty.

location:
- Extract prefecture, city, address, googleMapsUrl when available.
- Do not invent addresses.
- If the place is vague, put it in locationNote.

capacity:
- Extract volunteersNeeded and maxApplicants if provided.
- If only one number is provided for needed volunteers, use it for volunteersNeeded.
- Leave maxApplicants as 0 unless the organizer mentions an application cap.
- allowWaitlist should usually be true unless the organizer explicitly says no waitlist or strict capacity.

taskFlow:
- Create 1 to 4 concrete tasks from the input.
- Each task should represent something volunteers can understand and do.
- Include startTime only if known or strongly implied by an exact schedule.
- Include durationMinutes only if known or reasonably inferable from a described flow; otherwise use 0.
- Include peopleNeeded only when directly stated or safely distributed from a provided volunteer count; otherwise use 0.
- Do not create a fake detailed timetable when the organizer only gave broad information.

toolsProvided:
- Extract what the organizer says they will provide.

thingsToBring:
- Extract explicitly mentioned items.
- You may add safe generic items only when obviously appropriate, such as water bottle for outdoor work.

arrivalGuidance:
- Include meeting point, landmark, first person to contact, or arrival instructions if provided.

visuals:
- Suggest useful photos the organizer should upload.
- Do not require photos, but explain why each would help volunteers.
- Examples: cover photo of activity, entrance photo, meeting point photo, workspace photo, tools photo, first contact photo.

display:
- taskTypeColor: "green" for outdoor/plant/cleanup, "blue" for indoor/organizing/admin, "orange" for social/event/community interaction.
- environmentShape: "relaxed" or "structured".
- physicalEffort: "low", "medium", or "high".
- mentalEffort: "low", "medium", or "high".

missingDetails:
- List the most important missing or ambiguous facts.
- Required missing details should include facts needed before publishing, such as exact time, address, volunteer count, or first task.
- Recommended missing details should include things that reduce anxiety, such as photos, arrival guidance, contact person, and things to bring.

confidence:
- overall should reflect how complete the organizer input is: "low", "medium", or "high".
- notes should briefly mention uncertain interpretations.

Return only the JSON object. No markdown, no explanation.`;
}

// ── Validator ─────────────────────────────────────────────────────────────────
//
// Even with responseSchema, Gemini can occasionally return unexpected shapes.
// This function checks the minimum required fields and throws if they are missing.
// The throw is caught by the try/catch in the main function below.

function validate(raw: unknown): DraftOpportunityOutput {
  if (!raw || typeof raw !== "object") throw new Error("Response is not an object");

  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== "string" || !obj.title)
    throw new Error("Missing field: title");
  if (typeof obj.titleJa !== "string" || !obj.titleJa)
    throw new Error("Missing field: titleJa");
  if (typeof obj.description !== "string" || !obj.description)
    throw new Error("Missing field: description");
  if (typeof obj.descriptionJa !== "string" || !obj.descriptionJa)
    throw new Error("Missing field: descriptionJa");
  if (!Array.isArray(obj.taskFlow) || obj.taskFlow.length === 0)
    throw new Error("Missing field: taskFlow");

  const schedule = objectValue(obj.schedule);
  const location = objectValue(obj.location);
  const capacity = objectValue(obj.capacity);
  const visuals = objectValue(obj.visuals);
  const display = objectValue(obj.display);
  const confidence = objectValue(obj.confidence);

  return {
    title: stringValue(obj.title),
    titleJa: stringValue(obj.titleJa),
    shortDescription: stringValue(obj.shortDescription),
    description: stringValue(obj.description),
    descriptionJa: stringValue(obj.descriptionJa),
    category: stringValue(obj.category),
    tags: stringArray(obj.tags),
    skills: stringArray(obj.skills),
    schedule: {
      startAt: stringValue(schedule.startAt),
      endAt: stringValue(schedule.endAt),
      arrivalTime: stringValue(schedule.arrivalTime),
      scheduleNote: stringValue(schedule.scheduleNote),
    },
    location: {
      prefecture: stringValue(location.prefecture),
      city: stringValue(location.city),
      address: stringValue(location.address),
      googleMapsUrl: stringValue(location.googleMapsUrl),
      locationNote: stringValue(location.locationNote),
    },
    capacity: {
      volunteersNeeded: positiveNumberOrNull(capacity.volunteersNeeded),
      maxApplicants: positiveNumberOrNull(capacity.maxApplicants),
      allowWaitlist:
        typeof capacity.allowWaitlist === "boolean"
          ? capacity.allowWaitlist
          : true,
    },
    thingsToBring: stringArray(obj.thingsToBring),
    toolsProvided: stringArray(obj.toolsProvided),
    preApplicationQuestions: stringArray(obj.preApplicationQuestions),
    arrivalGuidance: stringValue(obj.arrivalGuidance),
    firstLandmarkDescription: stringValue(obj.firstLandmarkDescription),
    firstContactName: stringValue(obj.firstContactName),
    firstContactRole: stringValue(obj.firstContactRole),
    visuals: {
      coverPhotoPrompt: stringValue(visuals.coverPhotoPrompt),
      workspacePhotoPrompts: stringArray(visuals.workspacePhotoPrompts),
      landmarkPhotoPrompt: stringValue(visuals.landmarkPhotoPrompt),
      contactPhotoPrompt: stringValue(visuals.contactPhotoPrompt),
    },
    display: {
      taskTypeColor: enumValue(display.taskTypeColor, ["green", "blue", "orange"], "green"),
      environmentShape: enumValue(display.environmentShape, ["relaxed", "structured"], "relaxed"),
      physicalEffort: enumValue(display.physicalEffort, ["low", "medium", "high"], "medium"),
      mentalEffort: enumValue(display.mentalEffort, ["low", "medium", "high"], "medium"),
    },
    missingDetails: Array.isArray(obj.missingDetails)
      ? (obj.missingDetails as Record<string, unknown>[]).map((detail) => ({
          field: stringValue(detail.field),
          severity: enumValue(detail.severity, ["required", "recommended"], "recommended"),
          message: stringValue(detail.message),
        })).filter((detail) => detail.field && detail.message)
      : [],
    confidence: {
      overall: enumValue(confidence.overall, ["low", "medium", "high"], "medium"),
      notes: stringArray(confidence.notes),
    },
    taskFlow: (obj.taskFlow as Record<string, unknown>[]).map(
      (task): DraftedTask => ({
        name: String(task.name ?? ""),
        nameJa: String(task.nameJa ?? ""),
        startTime: String(task.startTime ?? ""),
        durationMinutes: positiveNumberOrNull(task.durationMinutes),
        peopleNeeded: positiveNumberOrNull(task.peopleNeeded),
        shortDescription: String(task.shortDescription ?? ""),
        shortDescriptionJa: String(task.shortDescriptionJa ?? ""),
        steps: stringArray(task.steps),
      }),
    ),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function positiveNumberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
}

function enumValue<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function draftOpportunity(
  input: DraftOpportunityInput,
  ctx: AgentContext,
): Promise<AgentResult<DraftOpportunityOutput>> {
  // ── 1. Input validation ───────────────────────────────────────────────────
  if (!input.roughDescription.trim()) {
    return {
      ok: false,
      error: "Please describe the opportunity before drafting.",
      code: "INVALID_INPUT",
    };
  }

  if (input.roughDescription.trim().length < 10) {
    return {
      ok: false,
      error: "The description is too short. Add a few more details.",
      code: "INVALID_INPUT",
    };
  }

  // ── 2. Mock mode ──────────────────────────────────────────────────────────
  // Safe to use during UI development. Set MOCK_AI=true in .env.local.
  // This branch never runs in production (NODE_ENV check).
  if (
    process.env.MOCK_AI === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    console.log("[draftOpportunity] MOCK_AI=true — returning mock output");
    return {
      ok: true,
      data: MOCK_OUTPUT,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // ── 3. Real Gemini call ───────────────────────────────────────────────────
  try {
    const model = getModel();
    const prompt = buildPrompt(input, ctx.locale);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7, // slight creativity, not too random
      },
    });

    const inputTokens = result.response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.response.usageMetadata?.candidatesTokenCount ?? 0;

    // ── 4. Parse and validate ─────────────────────────────────────────────
    let data: DraftOpportunityOutput;
    try {
      const raw = JSON.parse(result.response.text());
      data = validate(raw);
    } catch (parseError) {
      console.error("[draftOpportunity] Parse error:", parseError);
      return {
        ok: false,
        error: "The AI response was not in the expected format. Please try again.",
        code: "PARSE_ERROR",
      };
    }

    // ── 5. Log usage to AiInteraction table ───────────────────────────────
    await logAiInteraction({
      userId: ctx.userId,
      type: "DRAFT_OPPORTUNITY",
      opportunityId: ctx.opportunityId ?? null,
      inputTokens,
      outputTokens,
    });

    return { ok: true, data, usage: { inputTokens, outputTokens } };

  } catch (error) {
    console.error("[draftOpportunity] Gemini error:", error);

    // Check if this looks like a quota or billing error
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      return {
        ok: false,
        error: "The AI service is temporarily unavailable due to usage limits. Please try again later.",
        code: "QUOTA_EXCEEDED",
      };
    }

    return {
      ok: false,
      error: "The AI service encountered an error. Please try again.",
      code: "MODEL_ERROR",
    };
  }
}
