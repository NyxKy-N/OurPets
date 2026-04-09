import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/http";
import { requireUser } from "@/lib/auth-server";

export async function GET() {
  try {
    const user = await requireUser();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { notificationsReadAt: true },
    });

    const [likes, comments] = await Promise.all([
      prisma.like.findMany({
        where: {
          userId: { not: user.id },
          pet: { ownerId: user.id },
        },
        take: 12,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: { select: { id: true, name: true, image: true } },
          pet: { select: { id: true, name: true } },
        },
      }),
      prisma.comment.findMany({
        where: {
          userId: { not: user.id },
          pet: { ownerId: user.id },
        },
        take: 12,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: { select: { id: true, name: true, image: true } },
          pet: { select: { id: true, name: true } },
        },
      }),
    ]);

    const items = [
      ...likes.map((item) => ({
        id: `like-${item.id}`,
        type: "LIKE" as const,
        createdAt: item.createdAt,
        actor: item.user,
        pet: item.pet,
      })),
      ...comments.map((item) => ({
        id: `comment-${item.id}`,
        type: "COMMENT" as const,
        createdAt: item.createdAt,
        actor: item.user,
        pet: item.pet,
        content: item.content,
      })),
    ]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 12);

    const readAt = dbUser?.notificationsReadAt;

    const [unreadLikes, unreadComments] = readAt
      ? await Promise.all([
          prisma.like.count({
            where: {
              userId: { not: user.id },
              createdAt: { gt: readAt },
              pet: { ownerId: user.id },
            },
          }),
          prisma.comment.count({
            where: {
              userId: { not: user.id },
              createdAt: { gt: readAt },
              pet: { ownerId: user.id },
            },
          }),
        ])
      : [likes.length, comments.length];

    return NextResponse.json({
      ok: true,
      data: {
        items,
        unreadCount: unreadLikes + unreadComments,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH() {
  try {
    const user = await requireUser();

    await prisma.user.update({
      where: { id: user.id },
      data: { notificationsReadAt: new Date() },
    });

    return NextResponse.json({ ok: true, data: { ok: true } });
  } catch (err) {
    return handleRouteError(err);
  }
}
