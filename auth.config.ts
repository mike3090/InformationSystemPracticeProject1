import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Prisma, no Node.js built-ins.
// Used by middleware. Full config (with adapter + providers) is in lib/auth.ts.
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as never;
      return session;
    },
  },
} satisfies NextAuthConfig;
