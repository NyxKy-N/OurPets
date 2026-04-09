import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { handleRouteError, ApiError } from "@/lib/http";
import { requireUser } from "@/lib/auth-server";
import { updateUserSchema } from "@/lib/validators/user";

export async function GET() {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });
    if (!dbUser) throw new ApiError(404, "User not found", "NOT_FOUND");
    return NextResponse.json({ ok: true, data: dbUser });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const input = updateUserSchema.parse(json);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: input.name },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

