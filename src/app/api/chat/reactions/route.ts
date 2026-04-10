import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { handleRouteError } from "@/lib/http";
import { toggleChatReactionSchema } from "@/lib/validators/chat";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const input = toggleChatReactionSchema.parse(json);

    const message = await prisma.chatMessage.findUnique({
      where: { id: input.messageId },
      select: { id: true },
    });
    if (!message) {
      return NextResponse.json(
        { ok: false, error: { code: "NOT_FOUND", message: "Message not found" } },
        { status: 404 }
      );
    }

    const existing = await prisma.chatReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: input.messageId,
          userId: user.id,
          emoji: input.emoji,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.chatReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, data: { ok: true, toggledOn: false } });
    }

    await prisma.chatReaction.create({
      data: { messageId: input.messageId, userId: user.id, emoji: input.emoji },
    });

    return NextResponse.json({ ok: true, data: { ok: true, toggledOn: true } }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

