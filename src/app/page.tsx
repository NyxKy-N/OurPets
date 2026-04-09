import { PetFeed } from "@/components/pets/pet-feed";
import { getRequestI18n } from "@/lib/i18n-server";

export default async function Home() {
  const { messages } = await getRequestI18n();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8 lg:py-10">
      <section className="rounded-2xl border bg-card p-5 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {messages.home.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {messages.home.description}
        </p>
      </section>

      <PetFeed />
    </div>
  );
}
