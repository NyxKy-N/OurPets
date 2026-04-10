"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, PawPrint, Sparkles } from "lucide-react";

import type { Messages } from "@/lib/i18n";
import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { formatCompactLabel, formatPetAge } from "@/lib/i18n";
import type { PetFeedItem } from "@/components/pets/pet-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

type PetsPage = { items: PetFeedItem[]; nextCursor: string | null };

export function Hero({ messages }: { messages: Messages }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { locale } = useI18n();

  const featuredPets = useQuery({
    queryKey: ["pets", { limit: 5, sort: "POPULAR" }],
    queryFn: async () => apiFetch<PetsPage>("/api/pets?limit=5&sort=POPULAR"),
  });
  const pets = featuredPets.data?.items ?? [];

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
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent" />
        <div className="absolute -left-14 top-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -right-18 bottom-2 h-44 w-44 rounded-full bg-[hsl(34_36%_86%_/_0.55)] blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5 lg:pr-2">
            <div className="inline-flex rounded-full border border-white/70 bg-white/40 px-4 py-1.5 text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase backdrop-blur-xl">
              {messages.home.eyebrow}
            </div>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              {messages.home.description}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground/88 sm:text-base">
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

          <div className="relative lg:col-span-7">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute -top-10 left-0 z-10 max-w-[18ch] text-[2.75rem] font-semibold leading-[0.92] tracking-[-0.06em] text-foreground/92 sm:-top-12 sm:text-[3.6rem] lg:-left-8 lg:-top-16 lg:text-[4.6rem] xl:text-[5.4rem]"
            >
              <span className="gradient-text">{messages.home.title}</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              className="glass-panel relative overflow-hidden rounded-[2rem] p-3 pt-20 sm:p-4 sm:pt-22 lg:p-5 lg:pt-24"
            >
              <div className="grid grid-cols-12 grid-rows-6 gap-3">
                {pets.slice(0, 5).map((pet, index) => {
                  const img = pet.images?.[0];
                  const span =
                    index === 0
                      ? "col-span-7 row-span-6"
                      : index === 1
                        ? "col-span-5 row-span-3"
                        : index === 2
                          ? "col-span-5 row-span-3"
                          : index === 3
                            ? "col-span-4 row-span-3"
                            : "col-span-8 row-span-3";

                  return (
                    <motion.div
                      key={pet.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      className={`relative overflow-hidden rounded-[2rem] bg-muted ${span}`}
                    >
                      {img ? (
                        <Image
                          src={img.url}
                          alt={pet.name}
                          fill
                          sizes="(max-width: 1024px) 100vw, 720px"
                          className="object-cover"
                          priority={index === 0}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/40">
                          <PawPrint className="h-8 w-8 text-primary/70" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/14 via-transparent to-foreground/6 opacity-90" />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
                        <div className="rounded-full border border-white/70 bg-white/45 px-3 py-1 text-xs font-semibold tracking-[-0.02em] text-foreground backdrop-blur-xl">
                          {pet.name}
                        </div>
                        <div className="rounded-full border border-white/70 bg-white/45 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
                          {formatPetAge(locale, pet.birthDate, pet.age)}
                        </div>
                        <div className="rounded-full border border-white/70 bg-white/45 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
                          {formatCompactLabel(locale, pet._count.likes, messages.petCard.likes)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {pets.length === 0 ? (
                  <div className="col-span-12 row-span-6 flex items-center justify-center rounded-[2rem] border border-white/70 bg-white/45 p-8 text-center backdrop-blur-xl">
                    <div className="max-w-md">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {messages.header.discover}
                      </div>
                      <div className="mt-4 text-lg font-semibold tracking-tight">{messages.home.ctaTitle}</div>
                      <div className="mt-2 text-sm leading-6 text-muted-foreground">
                        {messages.home.ctaDescription}
                      </div>
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
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
                ) : null}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
