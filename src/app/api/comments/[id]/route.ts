import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canManageOwnedResource, requireUser } from "@/lib/auth-server";
import { ApiError, handleRouteError } from "@/lib/http";
import { updateCommentSchema } from "@/lib/validators/comments";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const json = await req.json();
    const input = updateCommentSchema.parse(json);

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) throw new ApiError(404, "Comment not found", "NOT_FOUND");
    if (!canManageOwnedResource(user, existing.userId)) {
      throw new ApiError(403, "Forbidden", "FORBIDDEN");
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content: input.content },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) throw new ApiError(404, "Comment not found", "NOT_FOUND");
    if (!canManageOwnedResource(user, existing.userId)) {
      throw new ApiError(403, "Forbidden", "FORBIDDEN");
    }

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return handleRouteError(err);
  }
}
