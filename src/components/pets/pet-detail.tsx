"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Flag, Heart, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { startViewTransition, useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { formatPetAge, getPetGenderLabel, getPetTypeLabel } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { Separator } from "@/components/ui/separator";
import { Comments } from "@/components/social/comments";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

type PetDetailPayload = {
  id: string;
  name: string;
  age: number;
  birthDate?: string | Date | null;
  type: "DOG" | "CAT" | "OTHER";
  gender?: "MALE" | "FEMALE" | "UNKNOWN" | null;
  breed?: string | null;
  isNeutered?: boolean | null;
  description: string;
  ownerId: string;
  createdAt: string | Date;
  owner: { id: string; name: string | null; image: string | null };
  images: Array<{ id: string; url: string; width: number | null; height: number | null }>;
  _count: { likes: number; comments: number };
  likedByMe: boolean;
};

export function PetDetail({
  initialPet,
  viewerId,
  viewerIsAdmin,
}: {
  initialPet: PetDetailPayload;
  viewerId: string | null;
  viewerIsAdmin: boolean;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { locale, messages } = useI18n();
  const [pet, setPet] = React.useState(initialPet);

  const safeBack = React.useCallback(() => {
    try {
      if (window.history.length > 1) {
        void startViewTransition(() => {
          router.back();
        });
      } else {
        void startViewTransition(() => {
          router.push("/");
        });
      }
    } catch {
      void startViewTransition(() => {
        router.push("/");
      });
    }
  }, [router]);

  const hero = pet.images[0]?.url;
  const canManagePet = Boolean(viewerId && (viewerId === pet.ownerId || viewerIsAdmin));
  const ownerHref = viewerId === pet.owner.id ? "/profile" : `/profile/${pet.owner.id}`;
  const reportHref = `/feedback?report=pet&id=${encodeURIComponent(pet.id)}&name=${encodeURIComponent(pet.name)}`;
  const birthDateLabel = pet.birthDate
    ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(new Date(pet.birthDate))
    : null;
  const detailBadges = [
    { label: messages.petDetail.birthLabel, value: birthDateLabel },
    { label: messages.petDetail.breedLabel, value: pet.breed || null },
    { label: messages.petDetail.genderLabel, value: getPetGenderLabel(locale, pet.gender) },
    {
      label: messages.petDetail.neuteredLabel,
      value:
        pet.isNeutered === null || pet.isNeutered === undefined
          ? messages.petDetail.neuteredUnknown
          : pet.isNeutered
            ? messages.petDetail.neuteredYes
            : messages.petDetail.neuteredNo,
    },
  ].filter((item) => Boolean(item.value));

  const toggleLike = useMutation({
    mutationFn: () => apiFetch<{ liked: boolean; likeCount: number }>("/api/likes", {
      method: "POST",
      body: JSON.stringify({ petId: pet.id }),
    }),
    onMutate: async () => {
      if (!viewerId) {
        toast.error(messages.petDetail.signInToLike);
        throw new Error("UNAUTHENTICATED");
      }
      setPet((p) => ({
        ...p,
        likedByMe: !p.likedByMe,
        _count: {
          ...p._count,
          likes: p._count.likes + (p.likedByMe ? -1 : 1),
        },
      }));
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") return;
      toast.error(errorMessage(err, messages.petDetail.failedToUpdateLike));
      setPet(initialPet);
    },
    onSuccess: (res) => {
      setPet((p) => ({ ...p, likedByMe: res.liked, _count: { ...p._count, likes: res.likeCount } }));
    },
  });

  const deletePet = useMutation({
    mutationFn: () => apiFetch<{ id: string }>(`/api/pets/${pet.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success(messages.petDetail.petDeleted);
      await qc.invalidateQueries({ queryKey: ["pets"] });
      await startViewTransition(() => {
        router.push("/");
      });
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.petDetail.failedToDelete)),
  });

  return (
    <div className="space-y-6">
      <Reveal>
        <Card className="overflow-hidden rounded-[34px] p-1" style={{ viewTransitionName: `pet-shell-${pet.id}` }}>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[30px] bg-muted sm:h-[30rem] sm:aspect-auto">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-4 top-4 z-10 h-11 w-11 rounded-full sm:left-6 sm:top-6"
              onClick={safeBack}
              aria-label="返回"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            {hero ? (
              <>
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-4 sm:inset-6" style={{ viewTransitionName: `pet-image-${pet.id}` }}>
                  <Image
                    src={hero}
                    alt={pet.name}
                    fill
                    className="object-contain object-center transition-transform duration-700 ease-out hover:scale-[1.02]"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    quality={78}
                    priority
                  />
                </div>
              </>
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase backdrop-blur-xl">
                  {getPetTypeLabel(locale, pet.type)}
                </div>
                <h1
                  className="break-words text-3xl font-semibold tracking-[-0.04em] sm:text-4xl"
                  style={{ viewTransitionName: `pet-title-${pet.id}` }}
                >
                  {pet.name}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2 text-sm leading-6 text-muted-foreground">
                  <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-xl">
                    {formatPetAge(locale, pet.birthDate, pet.age)}
                  </span>
                  <Link
                    href={ownerHref}
                    className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-xl transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {messages.petCard.owner}:{" "}
                    <span className="font-medium text-foreground">
                      {pet.owner.name ?? messages.common.unknown}
                    </span>
                  </Link>
                  {detailBadges.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 backdrop-blur-xl"
                    >
                      {item.label}:{" "}
                      <span className="font-medium text-foreground">{item.value}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  variant={pet.likedByMe ? "secondary" : "outline"}
                  onClick={() => toggleLike.mutate()}
                  className="w-full gap-2 border-rose-200/70 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 sm:w-auto"
                >
                  <Heart className={pet.likedByMe ? "fill-rose-500 text-rose-500" : "text-rose-500"} />
                  {pet._count.likes}
                </Button>
                {canManagePet ? (
                  <>
                    <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
                      <Link href={`/pet/${pet.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        {messages.petDetail.edit}
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full gap-2 sm:w-auto"
                      onClick={() => {
                        if (confirm(messages.petDetail.deleteConfirm)) deletePet.mutate();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {messages.petDetail.delete}
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
                    <Link href={reportHref}>
                      <Flag className="h-4 w-4" />
                      举报
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <Separator className="my-6 opacity-60" />
            <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/90 sm:text-[15px]">
              {pet.description}
            </p>

            {pet.images.length > 1 ? (
              <>
                <Separator className="my-6 opacity-60" />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {pet.images.slice(1).map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-[24px] bg-muted"
                    >
                      <Image
                        src={img.url}
                        alt={`${pet.name} ${messages.petDetail.galleryAlt}`}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        sizes="(max-width: 1024px) 50vw, 300px"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={100}>
        <Comments
          petId={pet.id}
          viewerId={viewerId}
          viewerIsAdmin={viewerIsAdmin}
          initialCount={pet._count.comments}
        />
      </Reveal>
    </div>
  );
}
