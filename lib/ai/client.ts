// ─── lib/ai/client.ts ─────────────────────────────────────────────────────────
//
// Gemini SDK singleton. Only this file imports from @google/generative-ai.
// All other files in the project go through lib/ai/index.ts instead.
//
// ⚠️  IMPORTANT — when real API calls happen:
//     Creating the client here does NOT call the Gemini API.
//     A real, billable API call only happens when an agent calls
//     model.generateContent(...) inside lib/ai/agents/*.ts.
//     You cannot accidentally spend API quota by importing this file.
//
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

// The default model used by all agents unless they pass a different one.
// Change this one constant to upgrade every agent at once.
const DEFAULT_MODEL = "gemini-2.5-flash";

// ── Lazy singleton ────────────────────────────────────────────────────────────
//
// Next.js in development mode restarts the Node.js module loader on every file
// save (hot reload). Without the global cache below, each reload would create a
// new GoogleGenerativeAI instance. That wastes memory but does NOT trigger API
// calls — still safe. The global cache is a best-practice performance measure.
//
// In production, modules are loaded once and never reloaded, so the global
// cache has no effect there.

const globalForGemini = globalThis as unknown as {
  _geminiClient: GoogleGenerativeAI | undefined;
};

function getClient(): GoogleGenerativeAI {
  // Return the cached client if one already exists in this process.
  if (globalForGemini._geminiClient) {
    return globalForGemini._geminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Fail loudly at startup rather than producing a confusing error
  // the first time an agent tries to make a real call.
  if (!apiKey) {
    throw new Error(
      "[lib/ai/client] GEMINI_API_KEY is not set.\n" +
        "Add it to your .env.local file:\n" +
        "  GEMINI_API_KEY=AIza..."
    );
  }

  const client = new GoogleGenerativeAI(apiKey);

  // Cache in development so hot reloads reuse the same instance.
  if (process.env.NODE_ENV !== "production") {
    globalForGemini._geminiClient = client;
  }

  return client;
}

// ── Public helper ─────────────────────────────────────────────────────────────
//
// Returns a GenerativeModel configured with the given model name.
// Call this inside an agent function, not at module load time.
//
// Example (inside an agent):
//   const model = getModel();
//   const response = await model.generateContent(prompt);  ← real API call here
//
// The model object itself makes no network request until generateContent().

export function getModel(modelName: string = DEFAULT_MODEL): GenerativeModel {
  return getClient().getGenerativeModel({ model: modelName });
}

// Export the default model name so agents can reference it in comments/logs.
export { DEFAULT_MODEL };
