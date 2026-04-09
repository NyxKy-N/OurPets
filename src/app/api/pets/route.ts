import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/http";
import { requireUser } from "@/lib/auth-server";
import { createPetSchema, listPetsQuerySchema } from "@/lib/validators/pets";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = listPetsQuerySchema.parse(Object.fromEntries(url.searchParams));

    const where: Prisma.PetWhereInput = {};
    if (query.q) {
      where.name = { contains: query.q, mode: "insensitive" };
    }
    if (query.type) where.type = query.type;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      where.age = {};
      if (query.ageMin !== undefined) where.age.gte = query.ageMin;
      if (query.ageMax !== undefined) where.age.lte = query.ageMax;
    }

    const take = query.limit + 1;
    const orderBy: Prisma.PetOrderByWithRelationInput[] =
      query.sort === "POPULAR"
        ? [
            { likes: { _count: "desc" } },
            { comments: { _count: "desc" } },
            { createdAt: "desc" },
            { id: "desc" },
          ]
        : [{ createdAt: "desc" }, { id: "desc" }];
    const pets = await prisma.pet.findMany({
      where,
      take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy,
      include: {
        owner: { select: { id: true, name: true, image: true } },
        images: { take: 1, orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const hasMore = pets.length > query.limit;
    const items = hasMore ? pets.slice(0, query.limit) : pets;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      ok: true,
      data: { items, nextCursor },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const input = createPetSchema.parse(json);

    const created = await prisma.pet.create({
      data: {
        ownerId: user.id,
        name: input.name,
        age: input.age,
        type: input.type,
        description: input.description,
        images: {
          create: input.images.map((img) => ({
            url: img.url,
            publicId: img.publicId,
            width: img.width,
            height: img.height,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        images: { orderBy: { createdAt: "asc" } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
