# Go Touch Grass — 地域ボランティアプラットフォーム

A bilingual (Japanese / English) volunteer-matching platform for small Japanese towns. Residents, small businesses, and community organisations post volunteer opportunities; volunteers browse, filter, and apply. An AI agent (Anthropic API) assists with drafting posts, event planning, booking confirmations, and volunteer matching.

> Kyoto University — Practice Information Systems, Project 1

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | NextAuth v5 + Google OAuth + Resend magic link |
| i18n | next-intl (ja / en) |
| AI | Anthropic API (Claude) |
| Deployment | Vercel (region: Tokyo `nrt1`) |

---

## Local Setup

### 1. Prerequisites

- Node.js ≥ 20 (project developed on v25)
- A PostgreSQL database (local, [Neon](https://neon.tech), or [Supabase](https://supabase.com))

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
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |

### 4. Apply the database schema

```bash
npx prisma migrate dev --name init
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects to `/ja` by default; switch to `/en` using the language toggle in the navbar.

---

## Project Structure

```
app/
  [locale]/          # All UI routes, prefixed /ja or /en
    layout.tsx       # Locale shell: HTML, Navbar, providers
    page.tsx         # Home page
    auth/signin/     # Sign-in page (Google + magic link)
    opportunities/   # Browse & post opportunities (Sprint 2)
    dashboard/       # Requester & volunteer dashboards (Sprint 2)
  api/
    auth/[...nextauth]/  # NextAuth route handler
  generated/prisma/      # Auto-generated Prisma client (do not edit)

components/          # Shared React components
lib/
  db.ts              # PrismaClient singleton
  auth.ts            # NextAuth config
i18n/                # next-intl routing and request config
messages/
  en.json            # English UI strings
  ja.json            # Japanese UI strings
prisma/
  schema.prisma      # Database schema
prisma.config.ts     # Prisma 7 datasource & migration config
middleware.ts        # i18n routing + auth protection
```

---

## Development Notes

**TypeScript check** — Node 25 has a broken `.bin/tsc` shim; run typechecks with:
```bash
node node_modules/typescript/lib/tsc.js --noEmit
```

**Prisma 7 breaking changes** — The connection URL lives in `prisma.config.ts`, not `schema.prisma`. The generated client is at `app/generated/prisma/client` (not `@prisma/client`). A driver adapter (`@prisma/adapter-pg`) is required for direct PostgreSQL connections.

**Adding a translation key** — Add the key to both `messages/en.json` and `messages/ja.json`, then use `getTranslations()` (server) or `useTranslations()` (client).

---

## Sprint Roadmap

| Sprint | Goal | Status |
|---|---|---|
| 1 — Foundation | Next.js scaffold, Prisma schema, auth, i18n, deployment config | ✅ Complete |
| 2 — Manual MVP | Full requester→volunteer loop: post, browse, apply, accept, book | 🔲 Next |
| 3 — AI Agent | Anthropic API: draft posts, matching algorithm, event planning, booking confirmations | 🔲 Planned |
