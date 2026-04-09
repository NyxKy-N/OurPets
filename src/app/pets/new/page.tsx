import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-server";
import { PetForm } from "@/components/pets/pet-form";

export default async function NewPetPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8 lg:py-10">
      <PetForm mode="create" />
    </div>
  );
}
