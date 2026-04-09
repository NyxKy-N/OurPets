import { PetFeed } from "@/components/pets/pet-feed";

export default function DiscoverPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-7 sm:gap-12 sm:py-9 lg:gap-14 lg:py-12">
      <PetFeed />
    </div>
  );
}
