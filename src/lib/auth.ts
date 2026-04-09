import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const adminEmails = new Set(["kevincheng2521@gmail.com"]);

export function isAdminEmail(email?: string | null) {
  return Boolean(email && adminEmails.has(email.trim().toLowerCase()));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "database",
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.isAdmin = isAdminEmail(user.email);
      }
      return session;
    },
  },
};
