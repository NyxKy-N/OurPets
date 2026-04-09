import "server-only";
import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail } from "@/lib/auth";
import { ApiError } from "@/lib/http";

export async function getSession() {
  return getServerSession(authOptions);
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
