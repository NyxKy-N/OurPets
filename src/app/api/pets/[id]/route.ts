import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { canManageOwnedResource, getSession, requireUser } from "@/lib/auth-server";
import { ApiError, handleRouteError } from "@/lib/http";
import { updatePetSchema } from "@/lib/validators/pets";

type Params = { params: Promise<{ id: string }> };

function getBirthDateParts(year: number, month: number) {
  const birthDate = new Date(Date.UTC(year, month - 1, 1));
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth()) age -= 1;
  return { birthDate, age: Math.max(age, 0) };
}

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
    if (!canManageOwnedResource(user, existing.ownerId)) {
      throw new ApiError(403, "Forbidden", "FORBIDDEN");
    }

    const nextBirthDate =
      input.birthYear !== undefined && input.birthMonth !== undefined
        ? getBirthDateParts(input.birthYear, input.birthMonth)
        : null;

    const updated = await prisma.pet.update({
      where: { id },
      data: {
        name: input.name,
        age: nextBirthDate?.age,
        birthDate: nextBirthDate?.birthDate,
        type: input.type,
        gender: input.gender,
        breed: input.breed,
        isNeutered: input.isNeutered,
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
    if (!canManageOwnedResource(user, existing.ownerId)) {
      throw new ApiError(403, "Forbidden", "FORBIDDEN");
    }

    await prisma.pet.delete({ where: { id } });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    return handleRouteError(err);
  }
}
