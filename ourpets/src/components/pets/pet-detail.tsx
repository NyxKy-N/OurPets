"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Comments } from "@/components/social/comments";

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

type PetDetailPayload = {
  id: string;
  name: string;
  age: number;
  type: "DOG" | "CAT" | "OTHER";
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
}: {
  initialPet: PetDetailPayload;
  viewerId: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [pet, setPet] = React.useState(initialPet);

  const hero = pet.images[0]?.url;
  const isOwner = viewerId && viewerId === pet.ownerId;

  const toggleLike = useMutation({
    mutationFn: () => apiFetch<{ liked: boolean; likeCount: number }>("/api/likes", {
      method: "POST",
      body: JSON.stringify({ petId: pet.id }),
    }),
    onMutate: async () => {
      if (!viewerId) {
        toast.error("Please sign in to like pets.");
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
      toast.error(errorMessage(err) ?? "Failed to update like");
      setPet(initialPet);
    },
    onSuccess: (res) => {
      setPet((p) => ({ ...p, likedByMe: res.liked, _count: { ...p._count, likes: res.likeCount } }));
    },
  });

  const deletePet = useMutation({
    mutationFn: () => apiFetch<{ id: string }>(`/api/pets/${pet.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Pet deleted");
      await qc.invalidateQueries({ queryKey: ["pets"] });
      router.push("/");
    },
    onError: (err: unknown) => toast.error(errorMessage(err) ?? "Failed to delete"),
  });

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative h-72 w-full bg-muted sm:h-96">
          {hero ? (
            <Image
              src={hero}
              alt={pet.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          ) : null}
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight">{pet.name}</h1>
              <div className="mt-2 text-sm text-muted-foreground">
                {pet.age} {pet.age === 1 ? "year" : "years"} old · {pet.type.toLowerCase()} · Owner:{" "}
                <span className="text-foreground">{pet.owner.name ?? "Unknown"}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant={pet.likedByMe ? "secondary" : "outline"}
                onClick={() => toggleLike.mutate()}
                className="gap-2"
              >
                <Heart className={pet.likedByMe ? "fill-current" : ""} />
                {pet._count.likes}
              </Button>
              {isOwner ? (
                <>
                  <Button asChild variant="outline" className="gap-2">
                    <Link href={`/pet/${pet.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => {
                      if (confirm("Delete this pet? This cannot be undone.")) deletePet.mutate();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <Separator className="my-6" />
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {pet.description}
          </p>

          {pet.images.length > 1 ? (
            <>
              <Separator className="my-6" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pet.images.slice(1).map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={`${pet.name} photo`}
                      fill
                      className="object-cover"
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

      <Comments petId={pet.id} viewerId={viewerId} initialCount={pet._count.comments} />
    </div>
  );
}
