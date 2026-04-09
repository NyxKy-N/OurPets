import "server-only";
import type { Session } from "next-auth";
import { cookies } from "next/headers";

import { isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

const sessionCookieNames = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

async function getSessionToken() {
  const cookieStore = await cookies();

  for (const name of sessionCookieNames) {
    const value = cookieStore.get(name)?.value;
    if (value) return value;
  }

  return null;
}

export async function getSession(): Promise<Session | null> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return null;

  const dbSession = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!dbSession || dbSession.expires <= new Date()) {
    return null;
  }

  return {
    user: {
      id: dbSession.user.id,
      name: dbSession.user.name,
      email: dbSession.user.email,
      image: dbSession.user.image,
      isAdmin: isAdminEmail(dbSession.user.email),
    },
    expires: dbSession.expires.toISOString(),
  };
}

export async function requireUser() {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
  return user;
}

export function isAdminUser(user?: { isAdmin?: boolean; email?: string | null } | null) {
  return Boolean(user?.isAdmin || isAdminEmail(user?.email));
}

export function canManageOwnedResource(
  user: { id: string; isAdmin?: boolean; email?: string | null },
  ownerId: string
) {
  return user.id === ownerId || isAdminUser(user);
}
