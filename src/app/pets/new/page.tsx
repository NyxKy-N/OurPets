import { PetFormPage } from "@/components/pets/pet-form";

export default async function NewPetPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8 lg:py-10">
      <PetFormPage mode="create" />
    </div>
  );
}
