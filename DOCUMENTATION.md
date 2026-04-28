# Go Touch Grass — Project Documentation

**Kyoto University · Practice Information Systems · Project 1**
**Version:** Sprint 1 (Foundation)
**Last Updated:** April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Team Goals](#4-team-goals)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [Authentication & Security](#7-authentication--security)
8. [Internationalisation](#8-internationalisation)
9. [AI Agent (Planned)](#9-ai-agent-planned)
10. [File Structure](#10-file-structure)
11. [Development Workflow](#11-development-workflow)
12. [Sprint Roadmap](#12-sprint-roadmap)
13. [Deployment](#13-deployment)
14. [Glossary](#14-glossary)

---

## 1. Project Overview

**Go Touch Grass** (地域ボランティアプラットフォーム) is a bilingual web application — Japanese and English — that connects volunteers with local community needs in small Japanese towns.

The platform is two-sided:

- **Requesters** — residents, small businesses, and community organisations — post volunteer opportunities describing what help they need, when, where, and what skills are required.
- **Volunteers** — people willing to help — browse open opportunities, filter by location, date, and skill, and submit applications.

An AI agent powered by the Anthropic API will later assist with drafting opportunity posts, planning events, managing booking confirmations, and algorithmically matching the best volunteers from a pool of applicants.

The application is built with modern web technologies, deployed to Vercel, and developed iteratively using agile sprints.

---

## 2. Problem Statement

Japan faces a compounding demographic crisis particularly acute in rural and small-town settings:

**Population centralisation** — Young people continue to migrate from rural towns to major cities (Tokyo, Osaka, Nagoya) in search of employment and social opportunities. This exodus hollows out local communities, leaving an aging population behind.

**Workforce shortage** — Small towns struggle to maintain local businesses, farms, festivals, community infrastructure, and social services. Many tasks that once relied on local community participation — seasonal agriculture, care for elderly neighbours, festival organisation — now go undone simply because there are not enough people.

**Disconnection** — Even when willing volunteers exist — students, remote workers, retired individuals — there is no structured, accessible channel for them to discover where help is needed. Opportunities are shared informally by word of mouth or through fragmented community notice boards that are difficult to find and use.

The result is a community resource mismatch: unmet needs on one side, untapped willingness to help on the other, and no reliable bridge between them.

---

## 3. Solution

Go Touch Grass provides a structured digital bridge between community needs and available volunteers.

### Core Platform Features

**For Requesters:**
- Post volunteer opportunities in three formats: one-time tasks, recurring commitments, and events
- Specify location, date and time, required skills, and number of volunteers needed
- Review applications and accept or reject candidates
- Receive AI-assisted drafts for opportunity descriptions
- Use AI-powered matching scores to identify the best applicants

**For Volunteers:**
- Browse open opportunities with filtering by location, date, skill, and type
- Apply to opportunities with a personal message
- Track application status (pending, accepted, rejected)
- Receive AI-generated recommendations for opportunities that match their profile

**AI Agent Capabilities (Sprint 3):**
- Drafts well-structured, compelling opportunity posts based on a brief description from the requester
- Scores volunteer–opportunity match quality from 0–1 based on skills, location, and availability
- Assists with event logistics and planning
- Sends and manages booking confirmation messages

### Why "Go Touch Grass"?

The name is a playful inversion of the internet phrase used to tell someone to go outside and engage with the real world. Here, it is a genuine invitation: go outside, go to your community, go help. The name reflects the spirit of the app — reconnecting people with the physical communities around them.

---

## 4. Team Goals

The team has defined four interconnected goals for this project:

> **1. Address a real problem.**
> Develop a prototype that meaningfully responds to the growing challenges of centralised populations and workforce shortage in small Japanese towns.

> **2. Learn end-to-end development.**
> Design and build a complete web application from concept to deployed product, experiencing every stage of the development lifecycle.

> **3. Grow through challenge.**
> Improve design and programming skills by deliberately working beyond current knowledge — adopting technologies, patterns, and practices that are new to team members.

> **4. Build something that matters.**
> Create an application that integrates multiple systems — including an AI agent — to produce something with genuine potential for positive real-world impact.

These goals inform every technical and design decision in the project. When a trade-off must be made, the questions are: does this serve real users? does this help us grow? does this move us toward something meaningful?

---

## 5. System Architecture

### Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack web framework — handles both UI and server logic |
| Language | TypeScript | Type-safe JavaScript — catches errors before runtime |
| Styling | Tailwind CSS v4 | Utility-first CSS — classes applied directly in markup |
| Database | PostgreSQL | Relational database for all persistent data |
| ORM | Prisma 7 | TypeScript-to-SQL translator and schema manager |
| Authentication | NextAuth v5 | Sign-in via Google OAuth and email magic links |
| Internationalisation | next-intl | Bilingual routing and translation management (ja/en) |
| AI | Anthropic API (`@anthropic-ai/sdk`) | Claude-powered AI agent features |
| Deployment | Vercel | Hosting platform, optimised for Next.js |
| Runtime | Node.js 25 | JavaScript server runtime |

### Architecture Pattern

The application uses Next.js's **App Router** architecture, which unifies the frontend and backend into a single codebase using React Server Components.

```
                        ┌─────────────────────────────┐
                        │         Browser              │
                        │  (React + Tailwind CSS)      │
                        └────────────┬────────────────┘
                                     │ HTTP
                        ┌────────────▼────────────────┐
                        │     middleware.ts            │
                        │  (i18n routing + auth guard) │
                        └────────────┬────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
   ┌──────────▼───────┐  ┌──────────▼───────┐  ┌──────────▼───────┐
   │   Page Routes    │  │   API Routes     │  │  Auth Routes     │
   │ app/[locale]/... │  │  app/api/...     │  │ /api/auth/...    │
   └──────────┬───────┘  └──────────┬───────┘  └──────────┬───────┘
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     │
                        ┌────────────▼────────────────┐
                        │         lib/db.ts            │
                        │     (Prisma Client)          │
                        └────────────┬────────────────┘
                                     │
                        ┌────────────▼────────────────┐
                        │        PostgreSQL            │
                        │    (Neon cloud database)    │
                        └─────────────────────────────┘
```

### Request Lifecycle

Every request to the application follows this sequence:

1. **`middleware.ts` runs first** — validates the locale in the URL, checks if the route requires authentication, and redirects if needed. Runs in Next.js's Edge Runtime (lightweight, fast, no database access).

2. **Next.js selects the matching layout and page** — the `app/[locale]/layout.tsx` wraps every page with the HTML shell, navigation bar, and translation context.

3. **The page component runs on the server** — fetches data from PostgreSQL via Prisma, renders the full HTML, and sends it to the browser. No separate API call needed for initial page load.

4. **The browser hydrates** — React attaches event listeners to the server-rendered HTML, making it interactive.

5. **Client components handle interactivity** — components marked `"use client"` (like the Navbar and sign-in form) run in the browser and can use React state, event handlers, and browser APIs.

---

## 6. Database Design

The database schema is defined in `prisma/schema.prisma`. All tables and relationships are version-controlled and managed through Prisma migrations.

### Entity Relationship Overview

```
User ──────────────┬──── VolunteerProfile (1:1)
     │             │
     │             └──── Organization (1:1)
     │
     ├──── Opportunity (1:many, as requester)
     │         │
     │         └──── Application (1:many)
     │                   │
     │                   └──── Booking (1:1)
     │
     ├──── Application (1:many, as volunteer)
     │
     └──── AiInteraction (1:many)
```

### Key Models

**User** — Central entity. Every person on the platform is a User. Roles are `VOLUNTEER`, `REQUESTER`, `BOTH`, or `ADMIN`. The `locale` field remembers the user's language preference.

**VolunteerProfile** — Extended information for volunteers: skills, language abilities, availability, and location. Optional — volunteers fill this in after signing up.

**Organization** — Represents the entity a requester posts on behalf of: an individual, small business, NPO, community group, or municipal office.

**Opportunity** — A volunteer posting. Includes title (bilingual), description (bilingual), type (`ONE_TIME`, `RECURRING`, or `EVENT`), status, required skills, location, datetime, and number of volunteers needed. The `aiDrafted` flag records whether the description was generated by the AI agent.

**Application** — A volunteer's application to an opportunity. Includes a personal message, status (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`), and `matchScore` (0–1 float set by the AI matching algorithm). The `aiRecommended` flag records whether the AI identified this volunteer as a top match.

**Booking** — Created when an application is accepted. Confirms the volunteer's participation and tracks whether a reminder has been sent.

**AiInteraction** — Audit log of every AI agent action: which user triggered it, what type of action it was (draft post, match volunteers, plan event, confirm booking), and token usage for cost tracking.

### Enums

Enums enforce valid values at both the database and TypeScript level:

| Enum | Values |
|---|---|
| `UserRole` | `REQUESTER`, `VOLUNTEER`, `BOTH`, `ADMIN` |
| `OpportunityType` | `ONE_TIME`, `RECURRING`, `EVENT` |
| `OpportunityStatus` | `DRAFT`, `OPEN`, `FILLED`, `CANCELLED`, `COMPLETED` |
| `ApplicationStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| `OrganizationType` | `INDIVIDUAL`, `SMALL_BUSINESS`, `NPO`, `COMMUNITY_GROUP`, `MUNICIPAL` |

---

## 7. Authentication & Security

### Sign-In Methods

The application supports two sign-in methods, both passwordless:

**Google OAuth** — Users click "Sign in with Google," are redirected to Google's authentication page, approve access, and are redirected back. Their Google account identity is linked to a User record in the database.

**Email Magic Link** — Users enter their email address. Resend (an email delivery service) sends a one-time sign-in link. Clicking the link authenticates the user without any password.

Both methods are handled by NextAuth v5, configured in `lib/auth.ts`.

### Session Strategy

Sessions use **JWT (JSON Web Tokens)**. When a user signs in, NextAuth creates an encrypted token stored in a browser cookie. The token contains the user's ID and role. On subsequent requests, the token is verified cryptographically — no database lookup required for session validation.

This is critical for performance: the middleware (which runs on every request) can verify authentication by reading the encrypted cookie, without hitting the database.

The JWT contains:
- `id` — the user's database ID
- `role` — the user's role (`VOLUNTEER`, `REQUESTER`, etc.)

### Route Protection

Protected routes are defined in `middleware.ts`:

```
/dashboard       → requires authentication
/profile         → requires authentication
/opportunities/new → requires authentication
```

All other routes (home page, opportunity listings, sign-in page) are publicly accessible. If an unauthenticated user attempts to access a protected route, they are redirected to the sign-in page.

### Security Notes

- The `.env` file containing all secrets is excluded from git via `.gitignore`. It is never committed.
- `AUTH_SECRET` is a random 32-byte string used to sign and encrypt JWT tokens. It must be kept secret.
- Google OAuth credentials must have the correct redirect URI configured in Google Cloud Console (`/api/auth/callback/google`).

---

## 8. Internationalisation

The application is fully bilingual, supporting Japanese (`ja`) and English (`en`).

### URL Structure

Every page URL is prefixed with its language code:

```
/ja/opportunities    → Japanese
/en/opportunities    → English
/                    → redirects to /ja (default)
```

This is enforced by `middleware.ts` using the next-intl library. There are no bare URLs without a language prefix.

### Translation Files

All visible text is stored in two JSON files:

- `messages/ja.json` — Japanese text
- `messages/en.json` — English text

Text is organised by feature area:

```json
{
  "nav": { "signIn": "ログイン" },
  "opportunities": { "title": "ボランティア募集一覧" },
  "auth": { "signInTitle": "Go Touch Grass にログイン" }
}
```

No text is hardcoded into components. Every user-facing string goes through the translation system.

### Using Translations in Code

In server components (pages):
```typescript
const t = await getTranslations("opportunities");
return <h1>{t("title")}</h1>;
```

In client components:
```typescript
const t = useTranslations("nav");
return <button>{t("signIn")}</button>;
```

### Adding a New Language

To add a third language (e.g., Korean):
1. Add `"ko"` to the `locales` array in `i18n/routing.ts`
2. Create `messages/ko.json` with all keys translated
3. Update `i18n/request.ts` to accept `"ko"` as a valid locale

---

## 9. AI Agent (Planned)

The AI agent is the distinguishing feature of Go Touch Grass. It is implemented in Sprint 3 using the Anthropic API (`@anthropic-ai/sdk`).

### Planned Capabilities

**Opportunity Drafting** — A requester provides a brief description of their need ("I need help clearing overgrown bamboo from my property before the rainy season"). The AI agent produces a complete, well-structured opportunity post with an appropriate title, description, skill tags, and suggested time requirements — in both Japanese and English. Triggered when the requester clicks an "AI Draft" button on the new opportunity form.

**Volunteer Matching** — When a requester opens their applicant list, they can click "Run AI Match." The AI agent scores each volunteer from 0–1 based on their profile skills, languages, location, and availability against the opportunity's requirements. The score is written to the `matchScore` field on each Application record and displayed as a ranked shortlist with brief justifications.

**Event Planning Assistance** — For `EVENT` type opportunities (festivals, cleanup days, community gatherings), the AI agent helps the requester plan logistics: volunteer roles, scheduling, materials, and communication timeline. Triggered from the requester dashboard for open events.

**Booking Confirmation** — After a requester accepts a volunteer (an Application's status changes to `ACCEPTED` and a `Booking` record is created), the AI agent drafts and sends a personalised confirmation email to the volunteer via Resend, including the event details, time, and location.

### Implementation Approach

The AI features will be implemented as Next.js API routes under `app/api/ai/` that call the Anthropic API. The agent code itself will live in `lib/ai/` — an `agent.ts` file for the main Claude calls and a `tools.ts` file defining the structured functions Claude can invoke.

**Tool use** is the mechanism by which Claude can take real actions: instead of just generating text, Claude calls structured functions (tools) defined in `lib/ai/tools.ts` — for example, `get_volunteer_profile`, `score_application`, or `send_confirmation_email`. Each tool call runs real TypeScript code that queries the database or triggers a Resend email.

All AI interactions are logged in the `AiInteraction` table for cost monitoring and future improvement.

---

## 10. File Structure

```
InformationSystemPracticeProject1/
│
├── app/                              ← All Next.js routes
│   ├── [locale]/                     ← Locale-prefixed routes (/ja/... and /en/...)
│   │   ├── layout.tsx                ← HTML shell, Navbar, footer, providers
│   │   ├── page.tsx                  ← Home page
│   │   ├── auth/
│   │   │   └── signin/page.tsx       ← Sign-in page
│   │   ├── opportunities/
│   │   │   ├── page.tsx              ← [Sprint 2] Browse opportunities
│   │   │   ├── new/page.tsx          ← [Sprint 2] Post a new opportunity
│   │   │   └── [id]/page.tsx         ← [Sprint 2] Opportunity detail + apply
│   │   └── dashboard/
│   │       ├── requester/page.tsx    ← [Sprint 2] Requester dashboard
│   │       └── volunteer/page.tsx    ← [Sprint 2] Volunteer dashboard
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts ← NextAuth route handler
│   ├── generated/prisma/             ← Auto-generated Prisma client (do not edit)
│   ├── globals.css                   ← Global styles and Tailwind import
│   ├── layout.tsx                    ← Minimal root layout (passthrough)
│   └── page.tsx                      ← Root redirect to /ja
│
├── components/                       ← Reusable React components
│   ├── Navbar.tsx                    ← Top navigation bar with language switcher
│   ├── Providers.tsx                 ← NextAuth SessionProvider wrapper
│   └── SignInForm.tsx                ← Google + magic link sign-in form
│
├── lib/                              ← Shared server-side logic
│   ├── db.ts                         ← Prisma client singleton
│   └── auth.ts                       ← NextAuth full configuration (Node.js only)
│
├── i18n/                             ← Internationalisation configuration
│   ├── routing.ts                    ← Locale list and URL prefix settings
│   └── request.ts                    ← Loads correct translation file per request
│
├── messages/                         ← All UI text
│   ├── en.json                       ← English translations
│   └── ja.json                       ← Japanese translations
│
├── prisma/                           ← Database schema and migrations
│   └── schema.prisma                 ← Data models, enums, relationships
│
├── types/                            ← TypeScript type declarations
│   └── next-auth.d.ts                ← Extends NextAuth session type
│
├── public/                           ← Static files served as-is
│
├── auth.config.ts                    ← Edge-safe NextAuth config (used in middleware)
├── middleware.ts                     ← Runs on every request: i18n + auth
├── next.config.ts                    ← Next.js configuration
├── prisma.config.ts                  ← Prisma database connection and migration config
├── package.json                      ← Dependencies and scripts
├── tsconfig.json                     ← TypeScript compiler settings
├── vercel.json                       ← Deployment configuration
├── .env.example                      ← Environment variable template
├── .gitignore                        ← Files excluded from git
└── README.md                         ← Quick-start guide
```

---

## 11. Development Workflow

### Prerequisites

- Node.js v20 or higher (project developed on v25)
- A PostgreSQL database — local or cloud ([Neon](https://neon.tech) recommended for beginners)
- A Neon or similar account for the database URL

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd InformationSystemPracticeProject1

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Open .env and fill in all values (see the table below)

# 4. Apply the database schema
npx prisma migrate dev --name init

# 5. Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser. It redirects automatically to `http://localhost:3000/ja`.

> **Note:** You need a PostgreSQL database before running the migration in step 4. The easiest option for beginners is [Neon](https://neon.tech) — create a free account, create a project named `go-touch-grass`, and copy the connection string into your `.env` file. No local PostgreSQL installation required.

### Environment Variables

After running `cp .env.example .env`, open the `.env` file and fill in each value:

```bash
# PostgreSQL connection string
# From Neon: Dashboard → your project → Connection Details → copy the string
DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require"

# Random secret used to encrypt session tokens
# Generate one by running: openssl rand -base64 32
AUTH_SECRET="paste-your-generated-secret-here"

# Google OAuth credentials
# From: console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID
# Set the authorised redirect URI to: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend API key for sending magic-link emails
# From: resend.com → API Keys → Create API Key
RESEND_API_KEY="re_..."

# The email address magic links are sent from
# Must be a domain you have verified in your Resend account
EMAIL_FROM="noreply@yourdomain.com"

# Anthropic API key for AI features (Sprint 3)
# From: console.anthropic.com → API Keys
ANTHROPIC_API_KEY="sk-ant-..."
```

### Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development server at `localhost:3000` with hot reload |
| `npm run build` | Builds the production bundle |
| `npm run start` | Runs the production build locally |
| `npm run lint` | Checks code for style issues using ESLint |

### TypeScript Checking

The standard `tsc` command has a known issue with Node.js v25. Use this instead:

```bash
node node_modules/typescript/lib/tsc.js --noEmit
```

No output means no errors. Run this before committing code.

### Database Tasks

| Task | Command |
|---|---|
| Apply schema changes | `npx prisma migrate dev --name <description>` |
| Browse the database visually | `npx prisma studio` |
| Regenerate the Prisma client | `npx prisma generate` |
| Reset the database (destructive) | `npx prisma migrate reset` |

### Common Development Tasks

**Add a new page:**
Create `app/[locale]/your-route/page.tsx`. It is automatically available at `/ja/your-route` and `/en/your-route`, wrapped in the Navbar and footer.

**Add a new translation key:**
1. Add the key to `messages/en.json`
2. Add the Japanese translation to `messages/ja.json`
3. Use `const t = await getTranslations("section")` in a server component, or `useTranslations("section")` in a client component.

**Add a new database field:**
1. Edit the relevant model in `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_field_name`

**Protect a new route:**
Add the path prefix to the `PROTECTED_PREFIXES` array in `middleware.ts`.

**Add a new component:**
Create a `.tsx` file in `components/`. If it needs browser APIs or React state, add `"use client"` as the first line. Otherwise leave it as a server component.

---

## 12. Sprint Roadmap

The project is developed in three agile sprints, each building on the previous.

### Sprint 1 — Foundation ✅ Complete

**Goal:** Establish the complete technical infrastructure before any features are built.

**Delivered:**
- Next.js 16 project with TypeScript and Tailwind CSS
- Full PostgreSQL schema (User, VolunteerProfile, Organization, Opportunity, Application, Booking, AiInteraction)
- NextAuth v5 with Google OAuth and Resend magic links
- JWT-based session management with role-based access
- Bilingual routing (Japanese/English) via next-intl
- Home page with hero section and how-it-works explanation
- Sign-in page (Google + email magic link)
- Navigation bar with language switcher
- Edge-safe middleware for i18n routing and auth protection
- Vercel deployment configuration (Tokyo region)
- Environment variable template and developer documentation

---

### Sprint 2 — Manual MVP 🔲 Next

**Goal:** Implement the complete requester→volunteer workflow without AI, so the full loop can be tested with real users.

**User Stories:**

| As a… | I want to… | So that… |
|---|---|---|
| Requester | Post a volunteer opportunity | People in my community can see and apply to help |
| Volunteer | Browse and filter open opportunities | I can find tasks that match my skills and schedule |
| Volunteer | Apply to an opportunity with a message | I can express interest and introduce myself |
| Requester | See all applicants for my opportunity | I can choose who to accept |
| Requester | Accept or reject an application | The volunteer knows whether they got the spot |
| Volunteer | See the status of my applications | I know whether I have been accepted or not |

**Pages to Build:**

| File | URL | Purpose |
|---|---|---|
| `app/[locale]/opportunities/page.tsx` | `/ja/opportunities` | Browse all open opportunities with filters |
| `app/[locale]/opportunities/[id]/page.tsx` | `/ja/opportunities/abc123` | Full opportunity detail and application form |
| `app/[locale]/opportunities/new/page.tsx` | `/ja/opportunities/new` | Form to post a new opportunity (auth required) |
| `app/[locale]/dashboard/requester/page.tsx` | `/ja/dashboard/requester` | Requester's list of posts and their applicants |
| `app/[locale]/dashboard/volunteer/page.tsx` | `/ja/dashboard/volunteer` | Volunteer's application history and statuses |

**API Routes to Build:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/opportunities` | `GET` | Return all open opportunities (with filters) |
| `/api/opportunities` | `POST` | Create a new opportunity (auth required) |
| `/api/opportunities/[id]` | `GET` | Return one opportunity by ID |
| `/api/opportunities/[id]` | `PATCH` | Update or close an opportunity (owner only) |
| `/api/opportunities/[id]/apply` | `POST` | Submit an application (auth required) |
| `/api/applications/[id]` | `PATCH` | Accept or reject an application (requester only) |

---

### Sprint 3 — AI Agent 🔲 Planned

**Goal:** Layer the Anthropic API into the existing manual flow to make interactions faster, smarter, and more accessible.

**Planned:**

*AI Drafting:*
- Requester provides a short description → Claude returns a complete, formatted opportunity post in Japanese and English

*AI Matching:*
- After applications close, Claude scores each volunteer against the opportunity
- Requester sees a ranked, AI-annotated shortlist with match scores

*Event Planning:*
- For EVENT-type opportunities, Claude assists with logistics, volunteer roles, and scheduling

*Booking Confirmation:*
- On acceptance, Claude drafts personalised confirmation messages sent via Resend

*Technical:*
- Anthropic tool-use integration for structured database interactions
- `AiInteraction` logging for all Claude calls
- Cost and token usage tracking

---

## 13. Deployment

The application is deployed to Vercel.

### Configuration

`vercel.json` defines three settings:

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["nrt1"]
}
```

- **`buildCommand`** — Prisma must regenerate the client on every deploy (the generated files are excluded from git). `prisma generate` runs first, then the Next.js build.
- **`framework`** — Tells Vercel this is a Next.js app, enabling platform-specific optimisations.
- **`regions: ["nrt1"]`** — Deploys to Vercel's Tokyo data centre, minimising latency for Japanese users.

### Deploying

```bash
# Install the Vercel CLI (one-time)
npm install -g vercel

# Deploy
vercel
```

On first deploy, Vercel will ask you to log in and link the project. All environment variables from your `.env` file must be added in the Vercel project dashboard under **Settings → Environment Variables**.

### Production Checklist

Before deploying to production, confirm:

- [ ] All environment variables are set in the Vercel dashboard
- [ ] `DATABASE_URL` points to the production database (not a local one)
- [ ] Google OAuth redirect URI includes the production domain (e.g., `https://yourdomain.com/api/auth/callback/google`)
- [ ] `RESEND_API_KEY` is valid and the sending domain is verified
- [ ] `AUTH_SECRET` is a securely generated random string (not the same as development)
- [ ] TypeScript check passes: `node node_modules/typescript/lib/tsc.js --noEmit`

---

## 14. Glossary

| Term | Definition |
|---|---|
| **App Router** | Next.js's file-based routing system where the directory structure of `app/` defines URL routes. A file at `app/[locale]/about/page.tsx` automatically creates the route `/ja/about` and `/en/about` |
| **Client Component** | A React component that runs in the browser, capable of using state and event handlers. Marked with `"use client"` at the top of the file. Cannot access the database directly |
| **Edge Runtime** | A lightweight JavaScript sandbox used by Next.js middleware. Runs close to the user for speed, but has no access to Node.js built-in modules (like `node:path`) or database connections |
| **Enum** | A type that restricts a field to a fixed set of named values (e.g., a user's role can only be `VOLUNTEER`, `REQUESTER`, `BOTH`, or `ADMIN`) |
| **Hot Reload** | During development, Next.js automatically updates the browser when you save a file — no manual refresh needed |
| **JWT** | JSON Web Token — a compact, cryptographically signed string stored in a browser cookie. Contains the user's ID and role so the server can identify them without a database query |
| **Magic Link** | A passwordless sign-in method. The user enters their email, receives a one-time link, and clicking it logs them in. No password is ever set or stored |
| **Middleware** | Code in `middleware.ts` that runs on every HTTP request before any page or API route handles it. Used here for locale routing and authentication checks |
| **Migration** | A versioned, numbered database change. When you modify `schema.prisma`, running `prisma migrate dev` generates a migration file and applies the structural change to the real database safely, without losing existing data |
| **ORM** | Object-Relational Mapper. A library (Prisma) that lets you interact with a database using TypeScript instead of raw SQL. `prisma.user.findMany()` is equivalent to `SELECT * FROM "User"` |
| **Server Component** | A React component that runs on the server during a request. Can query the database directly. Sends finished HTML to the browser — no JavaScript bundle sent for this component |
| **Session** | A record of who is currently logged in. In this app, stored as an encrypted JWT in a browser cookie. Verified on every request by reading the cookie |
| **Tool Use** | An Anthropic API pattern where Claude is given a set of functions (tools) it can call during a response. Instead of just generating text, Claude can invoke `score_application(volunteerId, opportunityId)` or `send_email(to, body)` — real TypeScript functions that run on the server and interact with the database or external services |
| **TypeScript** | A superset of JavaScript that adds static type checking — catching errors like typos in variable names or passing the wrong type of data before the code is ever run |
