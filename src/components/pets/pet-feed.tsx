"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { PetCard, type PetFeedItem } from "@/components/pets/pet-card";
import { PetCardSkeleton } from "@/components/pets/pet-card-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PetsPage = { items: PetFeedItem[]; nextCursor: string | null };
type PetTypeFilter = "ALL" | "DOG" | "CAT" | "OTHER";

function useIntersectionObserver<T extends Element>(options?: IntersectionObserverInit) {
  const ref = React.useRef<T | null>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting), options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);

  return { ref, isIntersecting };
}

export function PetFeed() {
  const { messages } = useI18n();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<PetTypeFilter>("ALL");

  const query = useInfiniteQuery({
    queryKey: ["pets", { q, type }],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "12");
      if (pageParam) sp.set("cursor", String(pageParam));
      if (q.trim()) sp.set("q", q.trim());
      if (type !== "ALL") sp.set("type", type);
      return apiFetch<PetsPage>(`/api/pets?${sp.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const loadError = query.error;
  React.useEffect(() => {
    if (loadError) toast.error(loadError.message ?? messages.feed.failedToLoad);
  }, [loadError, messages.feed.failedToLoad]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: "800px",
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  React.useEffect(() => {
    if (!isIntersecting) return;
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder={messages.feed.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:max-w-md"
          />
          <Button
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="w-full sm:w-auto"
          >
            {messages.feed.refresh}
          </Button>
        </div>
        <Tabs
          value={type}
          onValueChange={(v) => {
            if (v === "ALL" || v === "DOG" || v === "CAT" || v === "OTHER") setType(v);
          }}
          className="w-full lg:w-auto"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4 lg:w-auto">
            <TabsTrigger value="ALL" className="w-full">
              {messages.feed.all}
            </TabsTrigger>
            <TabsTrigger value="DOG" className="w-full">
              {messages.feed.dogs}
            </TabsTrigger>
            <TabsTrigger value="CAT" className="w-full">
              {messages.feed.cats}
            </TabsTrigger>
            <TabsTrigger value="OTHER" className="w-full">
              {messages.feed.other}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-6 grid gap-4">
        {query.isLoading ? (
          <>
            <PetCardSkeleton />
            <PetCardSkeleton />
            <PetCardSkeleton />
          </>
        ) : items.length === 0 ? (
          <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
            {messages.feed.empty}
          </div>
        ) : (
          items.map((pet) => <PetCard key={pet.id} pet={pet} />)
        )}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {query.isFetchingNextPage ? (
        <div className="mt-4 grid gap-4">
          <PetCardSkeleton />
          <PetCardSkeleton />
        </div>
      ) : null}

      {!query.hasNextPage && items.length > 0 ? (
        <div className="mt-6 text-center text-xs text-muted-foreground">
          {messages.feed.end}
        </div>
      ) : null}
    </section>
  );
}
