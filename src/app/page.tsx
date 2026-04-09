import { PetFeed } from "@/components/pets/pet-feed";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <section className="rounded-2xl border bg-card p-8">
        <h1 className="text-4xl font-semibold tracking-tight">OurPets</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          A minimal, modern social feed for sharing the pets you love and discovering
          new ones.
        </p>
      </section>

      <PetFeed />
    </div>
  );
}
