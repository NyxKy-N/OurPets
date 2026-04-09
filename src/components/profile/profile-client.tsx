"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PetCard, type PetFeedItem } from "@/components/pets/pet-card";
import { PetCardSkeleton } from "@/components/pets/pet-card-skeleton";

type UserMe = { id: string; name: string | null; email: string; image: string | null; createdAt: string };
type PetsPage = { items: PetFeedItem[]; nextCursor: string | null };

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function ProfileClient({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { messages } = useI18n();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<UserMe>("/api/user"),
  });

  const [name, setName] = React.useState("");
  React.useEffect(() => {
    if (me.data?.name) setName(me.data.name);
  }, [me.data?.name]);

  const saveName = useMutation({
    mutationFn: () =>
      apiFetch<UserMe>("/api/user", { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: async (data) => {
      toast.success(messages.profile.profileUpdated);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setName(data.name ?? "");
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.profile.failedToUpdate)),
  });

  const pets = useInfiniteQuery({
    queryKey: ["pets", { ownerId: userId }],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "12");
      sp.set("ownerId", userId);
      if (pageParam) sp.set("cursor", String(pageParam));
      return apiFetch<PetsPage>(`/api/pets?${sp.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const petItems = pets.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{messages.profile.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {messages.profile.description}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">{messages.profile.displayName}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <div className="text-xs text-muted-foreground">
              {messages.profile.signedInAs}: {me.data?.email ?? "…"}
            </div>
          </div>
          <Button
            onClick={() => saveName.mutate()}
            disabled={saveName.isPending || !name.trim() || name === (me.data?.name ?? "")}
            className="w-full sm:w-auto"
          >
            {messages.common.save}
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{messages.profile.yourPets}</h2>
          <Button asChild variant="outline">
            <Link href="/pets/new" prefetch={false}>
              {messages.header.addPet}
            </Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {pets.isLoading ? (
            <>
              <PetCardSkeleton />
              <PetCardSkeleton />
            </>
          ) : petItems.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
            {messages.profile.empty}
            </div>
          ) : (
            petItems.map((p) => <PetCard key={p.id} pet={p} />)
          )}
        </div>

        {pets.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => pets.fetchNextPage()}
              disabled={pets.isFetchingNextPage}
            >
            {pets.isFetchingNextPage ? messages.common.loading : messages.comments.loadMore}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
