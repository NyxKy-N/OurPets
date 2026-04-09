import { PetFormPage } from "@/components/pets/pet-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPetPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8 lg:py-10">
      <PetFormPage mode="edit" petId={id} />
    </div>
  );
}
