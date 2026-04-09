import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { canManageOwnedResource, getSession } from "@/lib/auth-server";
import { PetForm } from "@/components/pets/pet-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPetPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) redirect(`/pet/${id}`);

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: { images: { orderBy: { createdAt: "asc" } } },
  });
  if (!pet) redirect("/");
  if (!canManageOwnedResource(session.user, pet.ownerId)) redirect(`/pet/${id}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8 lg:py-10">
      <PetForm
        mode="edit"
        petId={id}
        initial={{
          name: pet.name,
          birthDate: pet.birthDate,
          type: pet.type,
          gender: pet.gender ?? "UNKNOWN",
          breed: pet.breed ?? "",
          isNeutered: pet.isNeutered ?? false,
          description: pet.description,
          images: pet.images.map(
            (i: { url: string; publicId: string; width: number | null; height: number | null }) => ({
            url: i.url,
            publicId: i.publicId,
            width: i.width ?? undefined,
            height: i.height ?? undefined,
          })
          ),
        }}
      />
    </div>
  );
}
