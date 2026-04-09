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

export function PetCard({ pet, className }: { pet: PetFeedItem; className?: string }) {
  const { locale, messages } = useI18n();
  const img = pet.images?.[0];

  return (
    <Link href={`/pet/${pet.id}`} prefetch={false} className={cn("block", className)}>
      <Card className="transition-colors hover:bg-accent/40">
        <div className="flex flex-col gap-4 p-4 sm:flex-row">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24 sm:shrink-0 sm:aspect-square">
            {img ? (
              <Image
                src={img.url}
                alt={pet.name}
                fill
                className="object-cover"
                sizes="96px"
                priority={false}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold sm:text-lg">{pet.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatPetAge(locale, pet.age)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {messages.petCard.owner}:{" "}
                  <span className="text-foreground">
                    {pet.owner.name ?? messages.common.unknown}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:flex-col sm:items-end sm:text-right">
                <div>{formatCompactLabel(locale, pet._count.likes, messages.petCard.likes)}</div>
                <div>
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
