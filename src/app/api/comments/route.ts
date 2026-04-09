import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { handleRouteError } from "@/lib/http";
import { createCommentSchema, listCommentsQuerySchema } from "@/lib/validators/comments";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = listCommentsQuerySchema.parse(Object.fromEntries(url.searchParams));

    const take = query.limit + 1;
    const comments = await prisma.comment.findMany({
      where: { petId: query.petId, parentId: null },
      take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: { select: { id: true, name: true, image: true } },
        replies: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    const hasMore = comments.length > query.limit;
    const items = hasMore ? comments.slice(0, query.limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({ ok: true, data: { items, nextCursor } });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const input = createCommentSchema.parse(json);
    let parentId: string | undefined;

    if (input.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { id: true, petId: true, parentId: true },
      });

      if (!parent || parent.petId !== input.petId) {
        return NextResponse.json(
          { ok: false, error: { code: "NOT_FOUND", message: "Comment not found" } },
          { status: 404 }
        );
      }

      parentId = parent.parentId ?? parent.id;
    }

    const created = await prisma.comment.create({
      data: {
        petId: input.petId,
        userId: user.id,
        parentId,
        content: input.content,
      },
      include: { user: { select: { id: true, name: true, image: true } }, replies: true },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
