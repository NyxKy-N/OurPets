import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { ApiError, handleRouteError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) throw new ApiError(404, "Comment not found", "NOT_FOUND");
    if (existing.userId !== user.id) throw new ApiError(403, "Forbidden", "FORBIDDEN");

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return handleRouteError(err);
  }
}
