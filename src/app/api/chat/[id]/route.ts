import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth-server";
import { handleRouteError } from "@/lib/http";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await ctx.params;

    const existing = await prisma.chatMessage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Message not found" } },
        { status: 404 }
      );
    }

    const session = await getSession();
    const isAdmin = Boolean(session?.user?.isAdmin);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admins only" } },
        { status: 403 }
      );
    }

    await prisma.chatMessage.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const existing = await prisma.chatMessage.findUnique({
      where: { id },
      select: { id: true, userId: true, createdAt: true, deletedAt: true },
    });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Message not found" } },
        { status: 404 }
      );
    }
    if (existing.deletedAt) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const within2min = Date.now() - existing.createdAt.getTime() <= 2 * 60 * 1000;
    const isOwner = existing.userId === user.id;
    if (!(isOwner && within2min)) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Not allowed to recall this message" } },
        { status: 403 }
      );
    }

    await prisma.chatMessage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
        content: null,
        audioUrl: null,
        audioPublicId: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
