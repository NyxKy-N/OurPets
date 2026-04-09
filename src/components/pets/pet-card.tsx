"use client";

import Link from "next/link";
import Image from "next/image";

import { useI18n } from "@/app/providers";
import { formatCompactLabel, formatPetAge } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type PetFeedItem = {
  id: string;
  name: string;
  age: number;
  createdAt: string | Date;
  owner: { id: string; name: string | null; image: string | null };
  images: Array<{ id: string; url: string; width: number | null; height: number | null }>;
  _count: { likes: number; comments: number };
};

type PetCardLayout = "list" | "grid";

export function PetCard({
  pet,
  className,
  layout = "list",
}: {
  pet: PetFeedItem;
  className?: string;
  layout?: PetCardLayout;
}) {
  const { locale, messages } = useI18n();
  const img = pet.images?.[0];
  const isGrid = layout === "grid";

  return (
    <Link href={`/pet/${pet.id}`} prefetch={false} className={cn("block", className)}>
      <Card className="group overflow-hidden rounded-[30px] p-1">
        <div
          className={cn(
            "rounded-[26px] p-4 sm:p-5",
            isGrid ? "flex h-full flex-col gap-4" : "flex flex-col gap-5 sm:flex-row sm:items-center"
          )}
        >
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-[24px] bg-muted",
              isGrid
                ? "aspect-[4/4.2] min-h-[240px]"
                : "aspect-[4/3] sm:h-32 sm:w-32 sm:shrink-0 sm:aspect-square"
            )}
          >
            {img ? (
              <Image
                src={img.url}
                alt={pet.name}
                fill
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 100vw, 128px"
                priority={false}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/12 via-transparent to-white/6 opacity-80" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent opacity-70" />
          </div>
          <div className={cn("min-w-0 flex-1", isGrid ? "flex flex-col" : "")}>
            <div className={cn("flex flex-col gap-4", isGrid ? "h-full" : "sm:flex-row sm:items-start sm:justify-between")}>
              <div className="min-w-0 space-y-2">
                <div className="inline-flex rounded-full border border-border/60 bg-background/54 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
                  {formatPetAge(locale, pet.age)}
                </div>
                <div className={cn("font-semibold tracking-[-0.04em]", isGrid ? "line-clamp-1 text-xl" : "truncate text-xl sm:text-2xl")}>
                  {pet.name}
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  {messages.petCard.owner}:{" "}
                  <span className="font-medium text-foreground">
                    {pet.owner.name ?? messages.common.unknown}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground",
                  isGrid ? "mt-auto pt-1" : "sm:flex-col sm:items-end sm:text-right"
                )}
              >
                <div className="rounded-full border border-border/60 bg-background/58 px-3 py-1.5 backdrop-blur-xl">
                  {formatCompactLabel(locale, pet._count.likes, messages.petCard.likes)}
                </div>
                <div className="rounded-full border border-border/60 bg-background/58 px-3 py-1.5 backdrop-blur-xl">
                  {formatCompactLabel(locale, pet._count.comments, messages.petCard.comments)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
