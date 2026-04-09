import "server-only";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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

