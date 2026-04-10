"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Pencil, Trash2 } from "lucide-react";
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
type PetCardDensity = "standard" | "compact";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function PetCard({
  pet,
  className,
  layout = "list",
  density = "standard",
  imagePriority = false,
}: {
  pet: PetFeedItem;
  className?: string;
  layout?: PetCardLayout;
  density?: PetCardDensity;
  imagePriority?: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const { locale, messages } = useI18n();
  const img = pet.images?.[0];
  const isGrid = layout === "grid";
  const isCompact = density === "compact";
  const petHref = `/pet/${pet.id}`;
  const canManagePet = Boolean(
    session?.user?.id && (session.user.id === pet.owner.id || session.user.isAdmin)
  );
  const ownerHref = session?.user?.id === pet.owner.id ? "/profile" : `/profile/${pet.owner.id}`;
  const reportHref = `/feedback?report=pet&id=${encodeURIComponent(pet.id)}&name=${encodeURIComponent(pet.name)}`;
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
    <Card className={cn("group overflow-hidden rounded-[30px] p-1", className)}>
      <div className={cn("flex items-center justify-between gap-2 pb-0 sm:px-4", isCompact ? "px-2.5 pt-2.5" : "px-3 pt-3")}>
        <Button asChild variant="ghost" size="sm" className="min-w-0 px-2">
          <Link href={ownerHref} className="inline-flex min-w-0 items-center gap-2">
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
              className={cn(
                "h-11 w-11 rounded-full border-border/70 bg-background/55 backdrop-blur-xl sm:hidden",
                isGrid ? "" : "hidden"
              )}
              aria-label={messages.petDetail.edit}
            >
              <Link href={`/pet/${pet.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full border-border/70 bg-background/55 backdrop-blur-xl sm:hidden",
                isGrid ? "" : "hidden"
              )}
              aria-label={messages.petDetail.delete}
              onClick={() => {
                if (confirm(messages.petDetail.deleteConfirm)) deletePet.mutate();
              }}
              disabled={deletePet.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn("hidden sm:inline-flex", isGrid ? "" : "sm:inline-flex")}
            >
              <Link href={`/pet/${pet.id}/edit`}>
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
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full border-border/70 bg-background/55 backdrop-blur-xl sm:hidden",
                isGrid ? "" : "hidden"
              )}
              aria-label="举报"
            >
              <Link href={reportHref}>
                <Flag className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className={cn("hidden sm:inline-flex", isGrid ? "" : "sm:inline-flex")}>
              <Link href={reportHref}>
                <Flag className="mr-1 h-4 w-4" />
                举报
              </Link>
            </Button>
          </div>
        )}
      </div>
      <Link
        href={petHref}
        className="block"
      >
        <div
          className={cn(
            "rounded-[26px] sm:p-5",
            isCompact ? "p-3" : "p-4",
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
            style={{ viewTransitionName: `pet-image-${pet.id}` }}
          >
            {img ? (
              <Image
                src={getDiscoverImageUrl(img.url, { width: isGrid ? 900 : 384 })}
                alt={pet.name}
                fill
                priority={imagePriority}
                loading={imagePriority ? "eager" : "lazy"}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                quality={isGrid ? 62 : 70}
                sizes={
                  isGrid
                    ? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    : "(max-width: 640px) 100vw, 128px"
                }
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/14 via-transparent to-foreground/6 opacity-85" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/22 to-transparent opacity-70" />
          </div>
          <div className={cn("min-w-0 flex-1", isGrid ? "flex flex-col" : "")}>
            <div
              className={cn(
                "flex flex-col gap-4",
                isGrid ? "h-full" : "sm:flex-row sm:items-start sm:justify-between"
              )}
            >
              <div className="min-w-0 space-y-2">
                <div className="inline-flex rounded-full border border-border/60 bg-background/54 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur-xl">
                  {formatPetAge(locale, pet.birthDate, pet.age)}
                </div>
                <div
                  className={cn(
                    "font-semibold tracking-[-0.04em]",
                    isGrid ? "line-clamp-1 text-xl" : "truncate text-xl sm:text-2xl"
                  )}
                >
                  {pet.name}
                </div>
              </div>
              <div
                className={cn(
                  "flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground",
                  isGrid ? "mt-auto pt-1" : "sm:flex-col sm:items-end sm:text-right"
                )}
              >
                <div className={cn("rounded-full border border-border/60 bg-background/58 backdrop-blur-xl", isCompact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5")}>
                  {formatCompactLabel(locale, pet._count.likes, messages.petCard.likes)}
                </div>
                <div className={cn("rounded-full border border-border/60 bg-background/58 backdrop-blur-xl", isCompact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5")}>
                  {formatCompactLabel(locale, pet._count.comments, messages.petCard.comments)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function getDiscoverImageUrl(url: string, opts: { width: number }) {
  if (!url) return url;
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  if (!url.includes("res.cloudinary.com")) return url;
  const after = url.slice(idx + marker.length);
  if (after.startsWith("v")) {
    const transform = `f_auto,q_auto,w_${Math.round(opts.width)}`;
    return `${url.slice(0, idx + marker.length)}${transform}/${after}`;
  }
  return url;
}
