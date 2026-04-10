import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth-server";
import { handleRouteError } from "@/lib/http";
import { createChatMessageSchema, listChatMessagesQuerySchema } from "@/lib/validators/chat";

type ReactionSummary = { emoji: string; count: number; reactedByMe: boolean };

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const url = new URL(req.url);
    const query = listChatMessagesQuerySchema.parse(Object.fromEntries(url.searchParams));

    const take = query.limit + 1;
    const messages = await prisma.chatMessage.findMany({
      take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: { select: { id: true, name: true, image: true } },
        replyTo: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    const hasMore = messages.length > query.limit;
    const items = hasMore ? messages.slice(0, query.limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const messageIds = items.map((m) => m.id);
    const reactions = messageIds.length
      ? await prisma.chatReaction.groupBy({
          by: ["messageId", "emoji"],
          where: { messageId: { in: messageIds } },
          _count: { _all: true },
        })
      : [];

    const myReactions =
      session?.user?.id && messageIds.length
        ? await prisma.chatReaction.findMany({
            where: { messageId: { in: messageIds }, userId: session.user.id },
            select: { messageId: true, emoji: true },
          })
        : [];

    const myReactionSet = new Set(myReactions.map((r) => `${r.messageId}::${r.emoji}`));
    const reactionsByMessage = new Map<string, ReactionSummary[]>();
    for (const row of reactions) {
      const list = reactionsByMessage.get(row.messageId) ?? [];
      list.push({
        emoji: row.emoji,
        count: row._count._all,
        reactedByMe: myReactionSet.has(`${row.messageId}::${row.emoji}`),
      });
      reactionsByMessage.set(row.messageId, list);
    }

    const enriched = items.map((m) => ({
      ...m,
      reactions: (reactionsByMessage.get(m.id) ?? []).sort((a, b) => b.count - a.count),
    }));

    return NextResponse.json({ ok: true, data: { items: enriched, nextCursor } });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const input = createChatMessageSchema.parse(json);

    if (input.replyToId) {
      const existing = await prisma.chatMessage.findUnique({
        where: { id: input.replyToId },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json(
          { ok: false, error: { code: "NOT_FOUND", message: "Message not found" } },
          { status: 404 }
        );
      }
    }

    const created = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        content: input.content?.trim() || null,
        replyToId: input.replyToId ?? null,
        audioUrl: input.audioUrl ?? null,
        audioPublicId: input.audioPublicId ?? null,
        audioDuration: input.audioDuration ?? null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        replyTo: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: { ...created, reactions: [] satisfies ReactionSummary[] },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

