import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth-server";
import { ApiError, handleRouteError } from "@/lib/http";
import { updatePetSchema } from "@/lib/validators/pets";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getSession();
    const viewerId = session?.user?.id ?? null;

    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        images: { orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!pet) throw new ApiError(404, "Pet not found", "NOT_FOUND");

    let likedByMe = false;
    if (viewerId) {
      const like = await prisma.like.findUnique({
        where: { userId_petId: { userId: viewerId, petId: id } },
        select: { id: true },
      });
      likedByMe = Boolean(like);
    }

    return NextResponse.json({ ok: true, data: { ...pet, likedByMe } });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const json = await req.json();
    const input = updatePetSchema.parse(json);

    const existing = await prisma.pet.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing) throw new ApiError(404, "Pet not found", "NOT_FOUND");
    if (existing.ownerId !== user.id) throw new ApiError(403, "Forbidden", "FORBIDDEN");

    const updated = await prisma.pet.update({
      where: { id },
      data: {
        name: input.name,
        age: input.age,
        type: input.type,
        description: input.description,
        ...(input.images
          ? {
              images: {
                deleteMany: {},
                create: input.images.map((img) => ({
                  url: img.url,
                  publicId: img.publicId,
                  width: img.width,
                  height: img.height,
                })),
              },
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        images: { orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true, comments: true } },
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

    const existing = await prisma.pet.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!existing) throw new ApiError(404, "Pet not found", "NOT_FOUND");
    if (existing.ownerId !== user.id) throw new ApiError(403, "Forbidden", "FORBIDDEN");

    await prisma.pet.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return handleRouteError(err);
  }
}
