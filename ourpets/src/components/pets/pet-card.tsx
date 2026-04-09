import Link from "next/link";
import Image from "next/image";

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
  const img = pet.images?.[0];

  return (
    <Link href={`/pet/${pet.id}`} className={cn("block", className)}>
      <Card className="transition-colors hover:bg-accent/40">
        <div className="flex gap-4 p-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{pet.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {pet.age} {pet.age === 1 ? "year" : "years"} old
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Owner:{" "}
                  <span className="text-foreground">{pet.owner.name ?? "Unknown"}</span>
                </div>
              </div>
              <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                <div>{pet._count.likes} likes</div>
                <div>{pet._count.comments} comments</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

