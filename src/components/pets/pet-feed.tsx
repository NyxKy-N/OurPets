"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUp, ChevronLeft, LayoutGrid, LayoutList, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { PetCard, type PetFeedItem } from "@/components/pets/pet-card";
import { PetCardSkeleton } from "@/components/pets/pet-card-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PetsPage = { items: PetFeedItem[]; nextCursor: string | null };
type PetTypeFilter = "ALL" | "DOG" | "CAT" | "OTHER";
type PetSortFilter = "LATEST" | "POPULAR";

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
  const [sort, setSort] = React.useState<PetSortFilter>("LATEST");
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [mobileTwoColumn, setMobileTwoColumn] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [floatingActionsOpen, setFloatingActionsOpen] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("discover:mobileTwoColumn");
      if (stored === null) {
        setMobileTwoColumn(window.matchMedia("(min-width: 420px)").matches);
        return;
      }
      setMobileTwoColumn(stored === "1");
    } catch {
      setMobileTwoColumn(window.matchMedia("(min-width: 420px)").matches);
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("discover:mobileTwoColumn", mobileTwoColumn ? "1" : "0");
    } catch {
      return;
    }
  }, [mobileTwoColumn]);

  const query = useInfiniteQuery({
    queryKey: ["pets", { q, type, sort }],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "12");
      if (pageParam) sp.set("cursor", String(pageParam));
      if (q.trim()) sp.set("q", q.trim());
      if (type !== "ALL") sp.set("type", type);
      sp.set("sort", sort);
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
  const hasActiveSearch = Boolean(q.trim());
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

  const resultsKey = `${type}-${sort}-${q.trim()}`;

  return (
    <section id="pet-feed" className="scroll-mt-28">
      <div className="glass-panel rounded-[34px] p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-6 lg:gap-7">
          <div className="space-y-2">
            <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              {messages.discover.browseLabel}
            </div>
            <h2 className="gradient-text text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {messages.discover.title}
            </h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] xl:items-start">
            <div className="glass-panel rounded-[28px] p-3.5">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={messages.feed.searchPlaceholder}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full pl-10 focus-visible:ring-primary/45"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {items.length} {messages.common.total}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 sm:hidden">
                      <Button
                        variant="outline"
                        onClick={() => query.refetch()}
                        disabled={query.isFetching}
                        className="flex-1"
                      >
                        {messages.feed.refresh}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => setMobileTwoColumn((v) => !v)}
                        aria-label={
                          mobileTwoColumn
                            ? messages.discover.switchToSingleColumn
                            : messages.discover.switchToTwoColumns
                        }
                      >
                        {mobileTwoColumn ? <LayoutList className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => setMobileFiltersOpen((v) => !v)}
                        aria-expanded={mobileFiltersOpen}
                        aria-label={mobileFiltersOpen ? messages.discover.hideFilters : messages.discover.showFilters}
                        className={mobileFiltersOpen ? "border-primary/30 bg-primary/10 text-foreground" : ""}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => query.refetch()}
                      disabled={query.isFetching}
                      className="hidden w-full sm:inline-flex sm:w-auto"
                    >
                      {messages.feed.refresh}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${mobileFiltersOpen ? "grid" : "hidden"} gap-3 sm:grid sm:grid-cols-2`}>
              <div className="glass-panel rounded-[28px] p-3">
                <div className="mb-3 px-1 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  {messages.discover.categoryLabel}
                </div>
                <Tabs
                  value={type}
                  onValueChange={(v) => {
                    if (v === "ALL" || v === "DOG" || v === "CAT" || v === "OTHER") setType(v);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-[24px] p-1.5 xl:grid-cols-4">
                    <TabsTrigger value="ALL" className="w-full text-[13px] sm:text-sm">
                      {messages.feed.all}
                    </TabsTrigger>
                    <TabsTrigger value="DOG" className="w-full text-[13px] sm:text-sm">
                      {messages.feed.dogs}
                    </TabsTrigger>
                    <TabsTrigger value="CAT" className="w-full text-[13px] sm:text-sm">
                      {messages.feed.cats}
                    </TabsTrigger>
                    <TabsTrigger value="OTHER" className="w-full text-[13px] sm:text-sm">
                      {messages.feed.other}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="glass-panel rounded-[28px] p-3">
                <div className="mb-3 px-1 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  {messages.discover.sortLabel}
                </div>
                <Tabs
                  value={sort}
                  onValueChange={(v) => {
                    if (v === "LATEST" || v === "POPULAR") setSort(v);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-[24px] p-1.5">
                    <TabsTrigger value="LATEST" className="w-full">
                      {messages.discover.latest}
                    </TabsTrigger>
                    <TabsTrigger value="POPULAR" className="w-full">
                      {messages.discover.popular}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div key={resultsKey} className={`content-stream mt-7 grid gap-5 ${isMobile ? (mobileTwoColumn ? "grid-cols-2" : "grid-cols-1") : "grid-cols-1"} md:grid-cols-2 xl:grid-cols-3`}>
        {query.isLoading ? (
          <>
            <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
            <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
            <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
          </>
        ) : items.length === 0 ? (
          <Reveal>
            <div className="glass-panel relative overflow-hidden rounded-[30px] p-10 text-center md:col-span-2 xl:col-span-3">
              <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute bottom-8 right-8 h-20 w-20 rounded-full bg-pink-400/10 blur-2xl" />
              <div className="relative mx-auto flex h-18 w-18 items-center justify-center rounded-full border border-border/60 bg-background/75">
                <div className="absolute -right-2 -top-2 rounded-full bg-background p-2 shadow-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">
                {hasActiveSearch ? messages.feed.emptySearchTitle : messages.feed.empty}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                {hasActiveSearch ? messages.feed.emptySearchDescription : messages.feed.empty}
              </p>
              {hasActiveSearch ? (
                <div className="mt-5 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ("");
                      setType("ALL");
                    }}
                  >
                    {messages.feed.refresh}
                  </Button>
                </div>
              ) : null}
            </div>
          </Reveal>
        ) : (
          items.map((pet, index) => (
            <Reveal key={pet.id} delay={Math.min(index * 70, 280)}>
              <PetCard pet={pet} layout={isMobile && !mobileTwoColumn ? "list" : "grid"} className="h-full" />
            </Reveal>
          ))
        )}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {query.isFetchingNextPage ? (
        <div className={`mt-4 grid gap-4 ${isMobile ? (mobileTwoColumn ? "grid-cols-2" : "grid-cols-1") : "grid-cols-1"} md:grid-cols-2 xl:grid-cols-3`}>
          <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
          <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
        </div>
      ) : null}

      {!query.hasNextPage && items.length > 0 ? (
        <div className="mt-6 text-center text-xs text-muted-foreground">
          {messages.feed.end}
        </div>
      ) : null}

      {floatingActionsOpen ? (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-1 rounded-full border border-white/70 bg-white/40 p-1 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:hidden">
          <button
            type="button"
            className="soft-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/40 text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="返回顶部"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <Link
            href="/pets/new"
            prefetch={false}
            className="soft-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/40 text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
            aria-label={messages.header.addPet}
          >
            <Plus className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="soft-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/40 text-foreground/80 backdrop-blur-xl hover:bg-white/55 active:scale-[0.98]"
            onClick={() => setFloatingActionsOpen(false)}
            aria-label={messages.common.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="soft-control fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/40 text-foreground/80 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl hover:bg-white/55 active:scale-[0.98] sm:hidden"
          onClick={() => setFloatingActionsOpen(true)}
          aria-label="展开"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
    </section>
  );
}
