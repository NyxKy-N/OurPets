import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
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
  if (pet.ownerId !== session.user.id) redirect(`/pet/${id}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <PetForm
        mode="edit"
        petId={id}
        initial={{
          name: pet.name,
          age: pet.age,
          type: pet.type,
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
