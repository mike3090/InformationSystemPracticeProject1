Great question — let me walk you through everything from the ground up.

---

## The Big Picture

Think of **Go Touch Grass** as two separate apps sharing one codebase:

- A **notice board** where someone in a small Japanese town posts "I need help clearing my garden" or "Our festival needs 10 volunteers"
- A **volunteer finder** where people browse those posts, apply, and get matched

An **AI assistant** (powered by Claude) will later help write posts, score applicants, and plan events. That's Sprint 3 — for now the foundation is in place.

---

## The Tech Stack — What Each Tool Does

Before looking at files, here's what each technology is and why we chose it:

**Next.js 16** — The main framework. Think of it as the engine of the whole car. It handles both the visual pages users see in their browser *and* the server-side logic that talks to the database. One codebase does both jobs.

**TypeScript** — JavaScript with guardrails. Catches typos and wrong data types before you even run the code. When you write `user.emial` instead of `user.email`, TypeScript tells you immediately instead of letting it break in production.

**Tailwind CSS** — A styling system. Instead of writing separate CSS files, you add short class names directly to your HTML elements (`bg-green-700`, `text-sm`, `rounded-full`). Each class does exactly one thing.

**PostgreSQL** — The database. A spreadsheet on steroids that stores all your data permanently — users, volunteer opportunities, applications, bookings.

**Prisma 7** — A translator between TypeScript and PostgreSQL. Instead of writing raw database commands (`SELECT * FROM users WHERE...`), you write normal TypeScript code (`prisma.user.findMany()`). Prisma translates it.

**NextAuth v5** — Handles sign-in so you don't build it yourself. Supports Google login and magic email links (click a link in your inbox, you're logged in — no password needed).

**next-intl** — Makes the app bilingual. All text is stored in translation files and swapped based on whether the user is on `/ja/...` or `/en/...`.

**Anthropic SDK (`@anthropic-ai/sdk`)** — The library that lets your code talk to Claude. Sprint 3 will use this.

**Vercel** — The hosting platform. You push your code, it builds and serves it at a public URL. Optimized specifically for Next.js.

---

## The File Tree, Explained

```
InformationSystemPracticeProject1/
│
├── app/                        ← All pages and API endpoints live here
├── components/                 ← Reusable UI building blocks
├── lib/                        ← Shared logic (database, auth)
├── i18n/                       ← Bilingual routing setup
├── messages/                   ← All Japanese and English text
├── prisma/                     ← Database structure definition
├── types/                      ← TypeScript type extensions
├── public/                     ← Static assets (images, icons)
│
├── middleware.ts               ← Runs on every request before any page loads
├── next.config.ts              ← Next.js settings
├── prisma.config.ts            ← Database connection settings
├── package.json                ← Project's list of dependencies
├── tsconfig.json               ← TypeScript compiler settings
├── .env.example                ← Template for secret keys
├── .gitignore                  ← Files git should never commit
├── vercel.json                 ← Deployment settings
└── README.md                   ← Project documentation
```

---

## Walking Through Every File

### `package.json`

This is the project's "ingredient list." It tells Node.js what external libraries to download. When you run `npm install`, Node reads this file and downloads everything into `node_modules/`.

```json
"dependencies": {
  "next": "16.2.4",          ← the framework
  "next-auth": "...",        ← authentication
  "next-intl": "...",        ← translations
  "@prisma/client": "...",   ← database runtime
  "@prisma/adapter-pg": "...",← database connector
  "pg": "...",               ← PostgreSQL driver
  "@auth/prisma-adapter": "...",← connects auth to your DB
  "@anthropic-ai/sdk": "...",← AI (Sprint 3)
  "zod": "..."               ← data validation (Sprint 2+)
}
```

The `devDependencies` are tools only needed during development (TypeScript, ESLint, Tailwind), not when the app is running in production.

---

### `.env` and `.env.example`

`.env` is where you put **secret keys** — database passwords, API keys, OAuth secrets. It is **never committed to git** (gitignore blocks it) because if it were on GitHub, anyone could steal your credentials.

`.env.example` *is* committed — it's a template showing what variables are needed, with empty values. When a new developer clones the project they copy this file and fill it in.

```bash
DATABASE_URL="postgresql://..."     ← your PostgreSQL address
AUTH_SECRET="..."                   ← random string NextAuth uses to encrypt sessions
GOOGLE_CLIENT_ID="..."              ← from Google Cloud Console
GOOGLE_CLIENT_SECRET="..."
RESEND_API_KEY="..."                ← for sending magic-link emails
ANTHROPIC_API_KEY="..."             ← for AI features
```

---

### `prisma/schema.prisma` — The Database Blueprint

This file defines every table in your database and the relationships between them. Think of it as the architect's floor plan — you design it here, then run one command and the actual database is built.

Every `model` becomes a table. Every field inside it becomes a column.

```prisma
model User {
  id        String   @id @default(cuid())  ← unique ID, auto-generated
  email     String   @unique               ← must be unique across all users
  name      String?                        ← the ? means optional
  role      UserRole @default(VOLUNTEER)   ← enum: VOLUNTEER, REQUESTER, BOTH, ADMIN
  locale    String   @default("ja")        ← which language they prefer
  ...

  opportunities  Opportunity[]   ← one user can post many opportunities
  applications   Application[]   ← one user can submit many applications
}
```

The `enum` types at the top are like multiple-choice options. A user's role can only be one of the four listed values — TypeScript and the database both enforce this.

**The relationships:**
- A **User** can post many **Opportunities** (one-to-many)
- A **User** can submit many **Applications** (one-to-many)
- An **Opportunity** can have many **Applications** (one-to-many)
- An **Application** can have one **Booking** (one-to-one)

The `Account`, `Session`, and `VerificationToken` models are required by NextAuth — you don't interact with them directly.

---

### `prisma.config.ts` — Database Connection

Prisma 7 (a breaking change from older versions) moved the database URL out of `schema.prisma` and into this file.

```typescript
datasource: {
  url: process.env["DATABASE_URL"],  ← reads from your .env file
},
migrations: {
  path: "prisma/migrations",          ← where migration files are saved
},
```

---

### `lib/db.ts` — The Database Client

This file creates a single shared connection to your database that the whole app reuses.

```typescript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

The `globalForPrisma` trick prevents Next.js from creating hundreds of database connections during development (because Next.js hot-reloads files constantly). It stores the one connection on the global object and reuses it.

Everywhere you need the database, you import this: `import { prisma } from "@/lib/db"`.

---

### `lib/auth.ts` — Authentication Configuration

This is where you tell NextAuth how sign-in should work.

```typescript
providers: [
  Google({ ... }),   ← "Sign in with Google" button
  Resend({ ... }),   ← magic email link
],
session: { strategy: "database" },   ← sessions stored in PostgreSQL, not cookies
```

The `callbacks.session` function adds the user's `id` and `role` to the session object, so any page can check who is logged in and what they're allowed to do.

The `pages` object tells NextAuth to use your custom pages instead of its default ones:
```typescript
pages: {
  signIn: "/auth/signin",    ← your custom sign-in page
  error: "/auth/error",
  verifyRequest: "/auth/verify",
}
```

---

### `i18n/routing.ts` — Language Routing

```typescript
export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "always",
});
```

`localePrefix: "always"` means every URL must start with a language code. `/ja/opportunities` in Japanese, `/en/opportunities` in English. There is no "bare" `/opportunities` URL — you're always forced to pick a language. The default is Japanese.

---

### `i18n/request.ts` — Translation Loading

When a request comes in for `/en/something`, this function runs, reads the `locale` from the URL, and loads the correct translation file (`messages/en.json`). The translations are then available to every component in that request.

---

### `messages/en.json` and `messages/ja.json`

Every piece of visible text in the app lives here — no text is hardcoded into components. This makes the app fully translatable.

```json
{
  "nav": {
    "signIn": "Sign In"          ← en.json
    "signIn": "ログイン"          ← ja.json
  },
  "opportunities": {
    "card": {
      "spotsLeft": "{count} spot(s) left"   ← supports variables
```

In components you access these with `t("nav.signIn")` or `t("opportunities.card.spotsLeft", { count: 3 })`.

---

### `middleware.ts` — The Gatekeeper

Middleware is code that runs **on every single request**, before any page or API route handles it. It does two jobs:

**1. Language routing** — If someone visits `/` or `/opportunities`, next-intl redirects them to `/ja/` or `/ja/opportunities`.

**2. Auth protection** — Certain routes require you to be logged in. If you try to visit `/ja/dashboard` without a session, you're redirected to `/ja/auth/signin`.

```typescript
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/opportunities/new"];
```

These paths require authentication. Everything else (home, opportunity listings) is public.

---

### `next.config.ts` — Next.js Settings

```typescript
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
```

This wraps Next.js with the next-intl plugin, which sets up all the translation infrastructure automatically. The `nextConfig` object itself is currently empty — we'll add settings here as the project grows (image domains, redirects, etc.).

---

### `app/layout.tsx` — The Root Layout

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

Next.js requires every app to have a root layout. Ours is intentionally minimal — it just passes children through. The real HTML structure (`<html>`, `<body>`, etc.) lives in the locale layout below, because that's where we know which language we're in.

---

### `app/page.tsx` — The Root Page

```typescript
export default function RootPage() {
  redirect("/ja");
}
```

If someone visits `https://yourdomain.com/` (no language prefix), they're immediately redirected to `/ja`. This is the only thing this file does.

---

### `app/[locale]/layout.tsx` — The Real Shell

The `[locale]` in the folder name means this matches any URL starting with a language code — `/ja/...` or `/en/...`. The brackets are Next.js syntax for dynamic segments.

This is the real app shell. It:
1. Validates the locale is `"ja"` or `"en"` (if not, shows a 404)
2. Loads the translation messages for that language
3. Renders the full HTML page structure

```tsx
return (
  <html lang={locale}>
    <body>
      <NextIntlClientProvider messages={messages}>  ← makes translations available
        <Providers>                                  ← makes auth session available
          <Navbar locale={locale} />                 ← top navigation bar
          <main>{children}</main>                    ← the actual page content
          <footer>...</footer>
        </Providers>
      </NextIntlClientProvider>
    </body>
  </html>
);
```

Every page inside `app/[locale]/` automatically gets this shell wrapped around it.

---

### `app/[locale]/page.tsx` — The Home Page

The home page has two sections:

**Hero section** — Big headline, subtitle, two call-to-action buttons ("Find Opportunities" / "Post a Need"). The text comes from `messages/*.json`, so it's bilingual automatically.

**How It Works section** — Three numbered steps explaining the platform. Also from translation files.

---

### `app/[locale]/auth/signin/page.tsx` — The Sign-In Page

A server component that renders the page title and description (from translations), then hands off to the `SignInForm` client component.

---

### `app/api/auth/[...nextauth]/route.ts`

```typescript
export const { GET, POST } = handlers;
```

This is three lines that do a lot of work. The `[...nextauth]` means this route catches *all* requests to `/api/auth/*` — sign-in, sign-out, callback from Google, session checks. NextAuth handles all of it through the `handlers` object we configured in `lib/auth.ts`.

---

### `components/Providers.tsx`

```tsx
"use client";
export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

NextAuth's `useSession()` hook needs a `SessionProvider` somewhere above it in the component tree. This wrapper provides that. It has `"use client"` because it uses browser-side React state.

---

### `components/Navbar.tsx`

The navigation bar. It's a client component (`"use client"`) because it needs to:
- Read the current session with `useSession()` to show "Sign In" vs "Sign Out"
- Read the current URL with `usePathname()` to build the language-switch link

The language switcher works by taking the current path and replacing the locale prefix:
```typescript
const otherPath = pathname.replace(`/${locale}`, `/${other}`);
// "/ja/opportunities" → "/en/opportunities"
```

---

### `components/SignInForm.tsx`

A client component that handles the two sign-in methods:

**Google** — calls `signIn("google")`, which redirects to Google, authenticates, then redirects back to the dashboard.

**Email magic link** — calls `signIn("resend", { email })`, which sends an email through Resend. The user clicks the link, and NextAuth creates their session. No password involved.

The `sent` state variable tracks whether the email has been sent, swapping the form for a confirmation message.

---

### `types/next-auth.d.ts` — TypeScript Type Extension

By default, NextAuth's session object only has `name`, `email`, and `image`. This file extends that type to include the custom fields we added:

```typescript
interface Session {
  user: DefaultSession["user"] & {
    id: string;      ← we added this
    role: UserRole;  ← and this
  };
}
```

Without this, TypeScript would complain whenever you write `session.user.id` or `session.user.role`.

---

### `app/globals.css`

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-geist-sans);
}
```

Three lines. Imports Tailwind (which handles all the utility classes), and wires up the Geist font variable that `[locale]/layout.tsx` loads. Everything else is handled by Tailwind's defaults.

---

### `vercel.json`

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["nrt1"]
}
```

Three settings: the build command runs `prisma generate` first (because the generated Prisma client is gitignored and must be regenerated on each deploy), `framework` tells Vercel what kind of app this is, and `regions: ["nrt1"]` deploys to Vercel's Tokyo data center — close to your Japanese users.

---

### `tsconfig.json`

TypeScript configuration. The most important parts for this project:

```json
"paths": { "@/*": ["./*"] }
```

This is why `import { prisma } from "@/lib/db"` works — the `@/` is an alias for the project root. Without it you'd need to write messy relative paths like `../../../../lib/db`.

---

### `.gitignore`

Tells git what to never commit. Key entries:

- `node_modules/` — never commit this (huge, regenerated by `npm install`)
- `.env` — never commit secrets
- `app/generated/prisma/` — regenerated by `prisma generate` on every deploy
- `/.next/` — build output, regenerated on every build
- `/.turbo` — Turbopack's local cache

---

## How the Pieces Fit Together — The Full Request Flow

Here's what happens when a user visits `https://yourdomain.com/ja/opportunities`:

```
Browser request: GET /ja/opportunities
        ↓
middleware.ts runs first
  → Confirms "ja" is a valid locale ✓
  → Checks if /opportunities is protected → it's not, continue
        ↓
Next.js renders app/[locale]/layout.tsx
  → Loads messages/ja.json (all Japanese translations)
  → Renders <html lang="ja">, <Navbar>, <footer>
        ↓
Next.js renders app/[locale]/opportunities/page.tsx  (Sprint 2)
  → Calls prisma.opportunity.findMany() to get opportunities from PostgreSQL
  → Returns the HTML
        ↓
Browser receives complete HTML page
```

When a user clicks "Sign In with Google":

```
User clicks button in SignInForm.tsx
        ↓
NextAuth redirects to Google
        ↓
User approves on Google's website
        ↓
Google redirects back to /api/auth/callback/google
        ↓
app/api/auth/[...nextauth]/route.ts handles it
        ↓
NextAuth creates a Session row in your PostgreSQL database
        ↓
User is redirected to /ja/dashboard
        ↓
middleware.ts now sees a valid session → allows access
```

---

## How to Test and Modify the Project

### Running it locally

```bash
# 1. Copy environment file and fill in your values
cp .env.example .env

# 2. Apply the database schema (needs a real DATABASE_URL in .env)
npx prisma migrate dev --name init

# 3. Start the dev server
npm run dev
```

Open `http://localhost:3000` — it redirects to `http://localhost:3000/ja`.

### TypeScript check (catch errors before running)

```bash
node node_modules/typescript/lib/tsc.js --noEmit
```

No output = no errors. This is your main safety net.

### Switching between languages

The language toggle is in the Navbar. Or visit the URL directly:
- `http://localhost:3000/ja` — Japanese
- `http://localhost:3000/en` — English

### Adding a new translation key

1. Add it to `messages/en.json`
2. Add the Japanese version to `messages/ja.json`
3. Use it in a component: `const t = await getTranslations("section"); t("key")`

### Adding a new database field

1. Edit `prisma/schema.prisma` — add the field to the relevant model
2. Run `npx prisma migrate dev --name describe_your_change`
3. Prisma updates the database and regenerates the client automatically

### Adding a new page

Create a file at `app/[locale]/your-route/page.tsx`. It's automatically available at `/ja/your-route` and `/en/your-route`. The Navbar and footer wrap around it automatically because of the locale layout.

### Adding a protected route

Add the path to the `PROTECTED_PREFIXES` array in `middleware.ts`. Users without a session will be redirected to sign-in.

---

## What's Missing (Sprint 2 and 3)

The foundation is complete, but these placeholder directories have no pages yet:

| Directory | What goes there |
|---|---|
| `app/[locale]/opportunities/new/` | Form to post a new opportunity |
| `app/[locale]/opportunities/[id]/` | Detail page for one opportunity + apply button |
| `app/[locale]/dashboard/requester/` | Requester's view: their posts, applicants, accept/reject |
| `app/[locale]/dashboard/volunteer/` | Volunteer's view: their applications, status |

Sprint 2 builds those pages and the API routes that feed them data. Sprint 3 adds the Anthropic API calls to make the AI agent work.