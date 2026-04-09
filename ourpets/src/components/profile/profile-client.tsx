"use client";

import * as React from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PetCard, type PetFeedItem } from "@/components/pets/pet-card";
import { PetCardSkeleton } from "@/components/pets/pet-card-skeleton";

type UserMe = { id: string; name: string | null; email: string; image: string | null; createdAt: string };
type PetsPage = { items: PetFeedItem[]; nextCursor: string | null };

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function ProfileClient({ userId }: { userId: string }) {
  const qc = useQueryClient();

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
      toast.success("Profile updated");
      await qc.invalidateQueries({ queryKey: ["me"] });
      setName(data.name ?? "");
    },
    onError: (err: unknown) => toast.error(errorMessage(err) ?? "Failed to update profile"),
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
      <Card className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update your display name and manage your pets.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Display name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <div className="text-xs text-muted-foreground">
              Signed in as: {me.data?.email ?? "…"}
            </div>
          </div>
          <Button
            onClick={() => saveName.mutate()}
            disabled={saveName.isPending || !name.trim() || name === (me.data?.name ?? "")}
          >
            Save
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your pets</h2>
          <Button asChild variant="outline">
            <a href="/pets/new">Add pet</a>
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
              You haven&apos;t added any pets yet.
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
              {pets.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
