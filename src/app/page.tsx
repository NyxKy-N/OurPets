import { Hero } from "@/components/home/hero";
import { getRequestI18n } from "@/lib/i18n-server";

export default async function Home() {
  const { messages } = await getRequestI18n();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-7 sm:gap-12 sm:py-9 lg:gap-14 lg:py-12">
      <Hero messages={messages} />
    </div>
  );
}
