# Go Touch Grass — 地域ボランティアプラットフォーム

A bilingual (Japanese / English) volunteer-matching platform for small Japanese towns. Residents, small businesses, and community organisations post volunteer opportunities; volunteers browse, filter, and apply. Google Gemini LLM features assist with drafting posts, scoring and ranking applicants, writing personalised booking confirmations, real-time translation, and event-day planning.

> Kyoto University — Practice Information Systems, Project 1

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| Language | TypeScript | 5.9 |
| Styling | Tailwind CSS | v4 |
| Database | PostgreSQL (Neon) | — |
| ORM | Prisma | 7.8 |
| Driver adapter | @prisma/adapter-pg | 7.8 |
| Auth | NextAuth v5 + Google OAuth + password + magic link | 5.0.0-beta |
| i18n | next-intl (ja / en) | 4.9 |
| AI | Google Gemini (`gemini-2.5-flash`) via `@google/generative-ai` | 0.24 |
| Deployment | Vercel (region: Tokyo `nrt1`) | — |

---

## Local Setup

### 1. Prerequisites

- Node.js ≥ 20 (project developed on v25)
- A PostgreSQL database — [Neon](https://neon.tech) or [Supabase](https://supabase.com) recommended

### 2. Clone and install

```bash
git clone <repo-url>
cd InformationSystemPracticeProject1
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `AUTH_SECRET` | Run `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 |
| `RESEND_API_KEY` | [resend.com](https://resend.com) |
| `EMAIL_FROM` | A verified sender address in Resend |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `MOCK_AI` | Set `true` during UI dev to skip real Gemini calls |

### 4. Apply the database schema

```bash
npx prisma migrate deploy
```

### 5. (Optional) Seed test data

```bash
node scripts/seed-mock-data.mjs
```

This creates two ready-to-use accounts (`requester@example.com` and `volunteer@example.com`, password `Password123!`) plus sample opportunities and applications.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/ja` by default; switch to `/en` via the language toggle in the navbar.

---

## Project Structure

```
app/
  [locale]/                    # All UI routes, prefixed /ja or /en
    layout.tsx                 # Locale shell: HTML, Navbar, providers
    page.tsx                   # Home page (hero + how it works)
    auth/signin/               # Sign-in (Google OAuth, magic link, password)
    opportunities/             # Browse (DB-backed) & post opportunities
    opportunities/new/         # Create opportunity form
    opportunities/[id]/        # Opportunity detail + application panel
    dashboard/                 # Requester and volunteer dashboards
    dashboard/opportunities/[id]/     # Applicant review + bulk actions
    dashboard/opportunities/[id]/edit/ # Edit opportunity
    dashboard/applications/[id]/      # Application detail + messaging
    dashboard/certifications/  # Admin certification review queue
    profile/                   # Volunteer and organizer profile management
    profile/setup/             # Guided profile setup flow
    my-events/                 # Confirmed event list (volunteer)
    experiences/               # Experience sharing feed
    experiences/new/           # Write an experience post
    experiences/[id]/          # Experience post detail
    reflections/[applicationId]/ # Post-event reflection + badge earning
  api/
    auth/[...nextauth]/        # NextAuth route handler
    ai/draft-opportunity/      # POST — AI-assisted opportunity drafting
    ai/score-applicants/       # POST — AI applicant matching + score write-back
    ai/rank-opportunities/     # POST — Personalised opportunity ranking for volunteers
    ai/translate/              # POST — Ja ↔ En translation
    ai/plan-route/             # POST — Route planning for confirmed volunteers
    ai/plan-meal/              # POST — Meal suggestions near the event venue
    ai/plan-accommodations/    # POST — Accommodation options near the venue
    ai/form-assistant/         # POST — Guided profile-setup chatbot (onboarding bot)
  generated/prisma/            # Auto-generated Prisma client (do not edit)

components/
  Navbar.tsx
  Providers.tsx
  SignInForm.tsx

lib/
  db.ts                        # PrismaClient singleton (uses PrismaPg adapter)
  auth.ts                      # NextAuth config
  password.ts                  # bcrypt-compatible password hashing
  preEventCommunication.ts     # Notification helpers, static confirmation fallback
  mockOpportunities.ts         # Legacy mock data (detail page only — listing is now DB-backed)

lib/ai/
  index.ts                     # Single public export point for all agents and types
  client.ts                    # Gemini SDK singleton (getModel)
  log.ts                       # logAiInteraction — writes to AiInteraction table
  types.ts                     # Shared TypeScript types (AgentResult, AgentContext, …)
  agents/
    draftOpportunity.ts        # Expand a rough description into a bilingual posting
    scoreApplicants.ts         # Score and rank pending applicants (0–100)
    buildConfirmation.ts       # Write a personalised bilingual booking confirmation
    rankOpportunities.ts       # Rank all visible opportunities by fit for a volunteer
    translateText.ts           # Ja ↔ En translation with cultural nuance notes
    planRoute.ts               # Route options from volunteer's city to event venue
    planMeal.ts                # Meal suggestions near the event venue
    planAccommodations.ts      # Accommodation options near the event venue
    formAssistant.ts           # Conversational profile-setup bot (guided onboarding)

i18n/
  routing.ts                   # next-intl locale routing config
  request.ts                   # next-intl server request config

messages/
  en.json                      # English UI strings
  ja.json                      # Japanese UI strings

prisma/
  schema.prisma                # Database schema (see Models section below)
  migrations/                  # 14 applied migrations

prisma.config.ts               # Prisma 7 datasource + migration config
middleware.ts                  # i18n locale routing + auth protection
vercel.json                    # Build command + Tokyo region config
```

---

## Database Models

| Model | Purpose |
|---|---|
| `User` | Auth identity; holds `role` (VOLUNTEER / REQUESTER / BOTH / ADMIN) |
| `VolunteerProfile` | Skills, availability, notification preferences |
| `Organization` | Organizer details, certification status, contact info |
| `Opportunity` | Volunteer posting (title, schedule, location, task flow, status) |
| `Application` | Volunteer → opportunity application; holds match score + AI flag |
| `Booking` | Created when an application is ACCEPTED |
| `Notification` | In-app notifications (confirmations, updates, replies) |
| `EventUpdate` | Organizer broadcast updates to confirmed volunteers |
| `EventMessage` | Direct messages between organizer and individual volunteer |
| `ExperienceShare` | Public post written by a volunteer after an event |
| `PostEventReflection` | Private reflection + ratings after completing an event |
| `VolunteerSkillBadge` | Badges earned through the reflection flow |
| `AiInteraction` | Token usage log for every Gemini call |

---

## Gemini LLM Features

All LLM call functions live under `lib/ai/agents/`. Import them exclusively through `lib/ai/index.ts`.

Every function follows the same contract:

```ts
async function featureName(input: FeatureInput, ctx: AgentContext): Promise<AgentResult<FeatureOutput>>
```

`AgentResult` is a discriminated union — always check `result.ok` before reading `result.data`.

| Function | Trigger | Notes |
|---|---|---|
| `draftOpportunity` | "Draft with AI" on the new opportunity form | Receives short description → returns full bilingual post |
| `scoreApplicants` | "Run AI Match" on the applicant review page | Returns 0–100 score + reason per applicant; writes back to DB |
| `buildConfirmation` | Auto-called when an application is ACCEPTED (server action) | Returns personalised bilingual welcome message |
| `rankOpportunities` | "AI Recommendations" button on the browse page | Ranks all visible opportunities by volunteer fit; returns score + reason + `aiPick` flag |
| `translateText` | Translate button on opportunity detail and messages | Single Gemini call, target language inferred from locale |
| `planRoute` | Route panel on confirmed event detail | Volunteer home city → event venue transport options |
| `planMeal` | Meal panel on confirmed event detail | Nearby restaurants and convenience stores on event day |
| `planAccommodations` | Accommodation panel on confirmed event detail | Nearby overnight stays for multi-day events |
| `formAssistant` | Guided onboarding chatbot on profile setup page | Step-by-step Q&A; fills profile fields from natural-language answers |

Set `MOCK_AI=true` in `.env` to bypass real Gemini calls during development. All functions return deterministic mock data in that mode; the flag is stripped at build time.

---

## Development Notes

**TypeScript check** — Node 25 has a broken `.bin/tsc` shim; run type checks with:
```bash
node node_modules/typescript/lib/tsc.js --noEmit
```

**Prisma 7 — key differences from earlier versions:**
- The connection URL lives in `prisma.config.ts`, not `schema.prisma`
- The generated client is at `app/generated/prisma/client` — import from there, not `@prisma/client`
- A driver adapter (`@prisma/adapter-pg`) is required; it is wired in `lib/db.ts`

**Pending migrations** — run `npx prisma migrate deploy` if the `ExperienceShare`, `PostEventReflection`, or `VolunteerSkillBadge` tables are missing from your database.

**Adding a translation key** — Add the key to both `messages/en.json` and `messages/ja.json`, then use `getTranslations()` (server components) or `useTranslations()` (client components).

**Adding a new Gemini LLM feature:**
1. Create `lib/ai/agents/yourFeature.ts` following the pattern of existing files
2. Add input/output types to `lib/ai/types.ts`
3. Export the function from `lib/ai/index.ts`
4. Create an API route at `app/api/ai/your-feature/route.ts` if a client button needs to call it

---

## Sprint Roadmap

| Sprint | Goal | Status |
|---|---|---|
| 1 — Foundation | Next.js scaffold, Prisma schema, auth, i18n, deployment config | ✅ Complete |
| 2 — Manual MVP | Full requester→volunteer loop: post, browse, apply, accept, book | ✅ Complete |
| 3 — AI & Community | Gemini LLM features, hybrid matching, experience sharing, post-event reflection, skill badges, onboarding bot | ✅ Complete |

---

## Known Gaps

These are intentional scope cuts for the academic prototype — not bugs.

| Gap | Detail |
|---|---|
| Email delivery | `sendEmailLater()` in `lib/preEventCommunication.ts` is a no-op stub. `RESEND_API_KEY` is configured; wiring Resend takes ~15 lines. |
| Map integration | The route planning panel renders numbered placeholders. Real geocoding / map tiles are not connected. |
| Experience recommendations | `ExperienceRecommendations` scores against `lib/mockOpportunities.ts` instead of live DB opportunities. |
| Experience likes | `ExperienceLikeButton` stores likes in `localStorage` only — no DB model. |
