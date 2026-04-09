import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { PetDetail } from "@/components/pets/pet-detail";
import { formatPetAge } from "@/lib/i18n";
import { getRequestI18n } from "@/lib/i18n-server";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { locale, messages } = await getRequestI18n();
  const pet = await prisma.pet.findUnique({
    where: { id },
    include: { images: { take: 1, orderBy: { createdAt: "asc" } }, owner: true },
  });
  if (!pet) return { title: messages.meta.petFallbackTitle };
  const hero = pet.images[0]?.url;

  return {
    title: pet.name,
    description: `${pet.name} · ${formatPetAge(locale, pet.birthDate, pet.age)} · ${messages.meta.petDescription} ${pet.owner.name ?? messages.common.user}`,
    openGraph: {
      title: `OurPets · ${pet.name}`,
      description: pet.description,
      images: hero ? [{ url: hero }] : [],
    },
  };
}

export default async function PetPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const viewerId = session?.user?.id ?? null;
  const viewerIsAdmin = session?.user?.isAdmin ?? false;

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      images: { orderBy: { createdAt: "asc" } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  if (!pet) return notFound();

  const likedByMe = viewerId
    ? Boolean(
        await prisma.like.findUnique({
          where: { userId_petId: { userId: viewerId, petId: id } },
          select: { id: true },
        })
      )
    : false;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8 lg:py-10">
      <PetDetail
        initialPet={{ ...pet, likedByMe }}
        viewerId={viewerId}
        viewerIsAdmin={viewerIsAdmin}
      />
    </div>
  );
}
