"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { ArrowUpRight, PawPrint, Sparkles } from "lucide-react";

import type { Messages } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function Hero({ messages }: { messages: Messages }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleAddPetClick = async () => {
    if (status === "loading") return;
    if (session?.user?.id) {
      router.push("/pets/new");
      return;
    }

    await signIn("google", { callbackUrl: "/pets/new" });
  };

  return (
    <Reveal>
      <section className="glass-panel-strong relative overflow-hidden rounded-[40px] px-6 py-10 sm:px-9 sm:py-14 lg:px-14 lg:py-[4.5rem]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
        <div className="absolute -left-20 top-8 h-36 w-36 rounded-full bg-foreground/4 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.62fr)] lg:items-end lg:gap-12">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex rounded-full border border-border/60 bg-background/56 px-4 py-1.5 text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase backdrop-blur-xl">
              {messages.home.eyebrow}
            </div>
            <Reveal delay={70}>
              <h1 className="gradient-text text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                {messages.home.title}
              </h1>
            </Reveal>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              {messages.home.description}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground/88 sm:text-base">
              {messages.home.supporting}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/discover" prefetch={false}>
                  {messages.header.discover}
                </Link>
              </Button>
              <Button variant="outline" size="lg" onClick={handleAddPetClick} disabled={status === "loading"}>
                {messages.header.addPet}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Reveal delay={90}>
              <div className="glass-panel rounded-[30px] p-5 sm:p-6 opacity-80">
                <div className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  {messages.header.home}
                </div>
                <div className="mt-3 text-lg font-semibold tracking-tight">{messages.home.eyebrow}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{messages.home.supporting}</div>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="glass-panel rounded-[30px] p-5 sm:p-6 opacity-75">
                <div className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  {messages.header.discover}
                </div>
                <div className="mt-3 text-lg font-semibold tracking-tight">{messages.discover.title}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{messages.discover.description}</div>
              </div>
            </Reveal>

            <Reveal delay={210}>
              <div className="glass-panel-strong relative overflow-hidden rounded-[30px] p-5 sm:p-6">
                <div className="absolute -right-4 top-2 h-20 w-20 rounded-full bg-primary/16 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-16 w-16 rounded-full bg-foreground/6 blur-2xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-primary uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    {messages.header.addPet}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-semibold tracking-tight">{messages.home.ctaTitle}</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        {messages.home.ctaDescription}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                      <PawPrint className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button size="sm" onClick={handleAddPetClick} disabled={status === "loading"} className="gap-2">
                      {messages.home.ctaPrimary}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/discover" prefetch={false}>
                        {messages.home.ctaSecondary}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
