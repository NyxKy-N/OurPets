"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { formatCompactLabel, formatPetAge } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

export type PetFeedItem = {
  id: string;
  name: string;
  age: number;
  birthDate?: string | Date | null;
  createdAt: string | Date;
  owner: { id: string; name: string | null; image: string | null };
  images: Array<{ id: string; url: string; width: number | null; height: number | null }>;
  _count: { likes: number; comments: number };
};

type PetCardLayout = "list" | "grid";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function PetCard({
  pet,
  className,
  layout = "list",
}: {
  pet: PetFeedItem;
  className?: string;
  layout?: PetCardLayout;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const { locale, messages } = useI18n();
  const img = pet.images?.[0];
  const isGrid = layout === "grid";
  const canManagePet = Boolean(
    session?.user?.id && (session.user.id === pet.owner.id || session.user.isAdmin)
  );
  const ownerHref = session?.user?.id === pet.owner.id ? "/profile" : `/profile/${pet.owner.id}`;
  const deletePet = useMutation({
    mutationFn: () => apiFetch<{ id: string }>(`/api/pets/${pet.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success(messages.petDetail.petDeleted);
      await qc.invalidateQueries({ queryKey: ["pets"] });
      router.refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.petDetail.failedToDelete)),
  });

  return (
    <div className="hover-lift">
      <Card
        className={cn(
          "group overflow-hidden rounded-[30px] p-1 [content-visibility:auto] [contain-intrinsic-size:340px_460px]",
          className
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 pb-0 pt-3 sm:px-4">
          <Button asChild variant="ghost" size="sm" className="min-w-0 px-2">
            <Link href={ownerHref} prefetch={false} className="inline-flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0 border border-border/70 bg-background/55">
                <AvatarImage src={pet.owner.image ?? undefined} />
                <AvatarFallback>
                  {(pet.owner.name ?? messages.common.unknown).slice(0, 1)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-foreground/90">
                {pet.owner.name ?? messages.common.unknown}
              </span>
            </Link>
          </Button>
          {canManagePet ? (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="icon"
                className={cn("h-9 w-9 rounded-full border-border/70 bg-background/55 backdrop-blur-xl sm:hidden", isGrid ? "" : "hidden")}
                aria-label={messages.petDetail.edit}
              >
                <Link href={`/pet/${pet.id}/edit`} prefetch={false}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-9 w-9 rounded-full border-border/70 bg-background/55 backdrop-blur-xl sm:hidden", isGrid ? "" : "hidden")}
                aria-label={messages.petDetail.delete}
                onClick={() => {
                  if (confirm(messages.petDetail.deleteConfirm)) deletePet.mutate();
                }}
                disabled={deletePet.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button asChild variant="ghost" size="sm" className={cn("hidden sm:inline-flex", isGrid ? "" : "sm:inline-flex")}>
                <Link href={`/pet/${pet.id}/edit`} prefetch={false}>
                  <Pencil className="mr-1 h-4 w-4" />
                  {messages.petDetail.edit}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("hidden sm:inline-flex", isGrid ? "" : "sm:inline-flex")}
                onClick={() => {
                  if (confirm(messages.petDetail.deleteConfirm)) deletePet.mutate();
                }}
                disabled={deletePet.isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {messages.petDetail.delete}
              </Button>
            </div>
          ) : (
            <div className="w-2 shrink-0" />
          )}
        </div>
        <Link href={`/pet/${pet.id}`} prefetch={false} className="block">
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
                  ? "aspect-[4/4.2] min-h-[200px] sm:min-h-[240px]"
                  : "aspect-[4/3] sm:h-32 sm:w-32 sm:shrink-0 sm:aspect-square"
              )}
            >
              {img ? (
                <Image
                  src={img.url}
                  alt={pet.name}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  quality={isGrid ? 62 : 70}
                  sizes={isGrid ? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" : "(max-width: 640px) 100vw, 128px"}
                  priority={false}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/14 via-transparent to-foreground/6 opacity-85" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/22 to-transparent opacity-70" />
            </div>
            <div className={cn("min-w-0 flex-1", isGrid ? "flex flex-col" : "")}>
              <div className={cn("flex flex-col gap-4", isGrid ? "h-full" : "sm:flex-row sm:items-start sm:justify-between")}>
                <div className="min-w-0 space-y-2">
                  <div className="inline-flex rounded-full border border-border/60 bg-background/54 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
                    {formatPetAge(locale, pet.birthDate, pet.age)}
                  </div>
                  <div className={cn("font-semibold tracking-[-0.04em]", isGrid ? "line-clamp-1 text-xl" : "truncate text-xl sm:text-2xl")}>
                    {pet.name}
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
        </Link>
      </Card>
    </div>
  );
}
