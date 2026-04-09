import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { handleRouteError } from "@/lib/http";
import { toggleLikeSchema } from "@/lib/validators/likes";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const input = toggleLikeSchema.parse(json);

    const result = await prisma.$transaction(async (tx: unknown) => {
      const db = tx as typeof prisma;
      const existing = await db.like.findUnique({
        where: { userId_petId: { userId: user.id, petId: input.petId } },
        select: { id: true },
      });

      if (existing) {
        await db.like.delete({
          where: { userId_petId: { userId: user.id, petId: input.petId } },
        });
      } else {
        await db.like.create({
          data: { userId: user.id, petId: input.petId },
        });
      }

      const likeCount = await db.like.count({ where: { petId: input.petId } });
      return { liked: !existing, likeCount };
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    return handleRouteError(err);
  }
}
