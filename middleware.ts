import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe auth instance — uses authConfig with no Prisma adapter.
// JWT strategy means sessions are read from the encrypted cookie, no DB call needed.
const { auth } = NextAuth(authConfig);

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/opportunities/new"];

export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameWithoutLocale = pathname.replace(/^\/(ja|en)/, "");
  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathnameWithoutLocale.startsWith(p)
  );

  if (isProtected) {
    // @ts-expect-error — NextAuth augments the request with .auth in its middleware wrapper
    const session = request.auth;
    if (!session) {
      const locale = pathname.startsWith("/en") ? "en" : "ja";
      return NextResponse.redirect(
        new URL(`/${locale}/auth/signin`, request.url)
      );
    }
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
