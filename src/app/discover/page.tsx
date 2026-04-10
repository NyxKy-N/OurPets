import { PetFeed } from "@/components/pets/pet-feed";

export default function DiscoverPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-3 py-5 sm:px-4 sm:py-7 lg:gap-10 lg:px-6 lg:py-8">
      <PetFeed />
    </div>
  );
}
