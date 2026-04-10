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

