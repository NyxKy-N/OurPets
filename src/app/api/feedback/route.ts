import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { handleRouteError } from "@/lib/http";
import { createFeedbackSchema } from "@/lib/validators/feedback";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const json = await req.json();
    const input = createFeedbackSchema.parse(json);

    const created = await prisma.feedback.create({
      data: {
        userId: session?.user?.id ?? null,
        content: input.content,
        pageUrl: input.pageUrl ?? null,
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Admins only" } },
        { status: 403 }
      );
    }
    const items = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      take: 200,
    });
    return NextResponse.json({ ok: true, data: { items } });
  } catch (err) {
    return handleRouteError(err);
  }
}

