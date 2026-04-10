"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronLeft, ChevronRight, LayoutGrid, LayoutList, MoreHorizontal, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { PetCard, type PetFeedItem } from "@/components/pets/pet-card";
import { PetCardSkeleton } from "@/components/pets/pet-card-skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<PetTypeFilter>("ALL");
  const [sort, setSort] = React.useState<PetSortFilter>("LATEST");
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [mobileTwoColumn, setMobileTwoColumn] = React.useState(false);
  const [density, setDensity] = React.useState<"standard" | "compact">("standard");
  const [isMobile, setIsMobile] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [floatingActionsOpen, setFloatingActionsOpen] = React.useState(false);
  const [fabSide, setFabSide] = React.useState<"left" | "right">("right");
  const [fabY, setFabY] = React.useState<number | null>(null);
  const [fabXOffset, setFabXOffset] = React.useState(0);
  const [fabIsDragging, setFabIsDragging] = React.useState(false);
  const draggingRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const startClientXRef = React.useRef(0);
  const startClientYRef = React.useRef(0);
  const startFabXOffsetRef = React.useRef(0);
  const startFabYRef = React.useRef(0);
  const pendingXRef = React.useRef<number | null>(null);
  const pendingYRef = React.useRef<number | null>(null);
  const rafIdRef = React.useRef<number | null>(null);
  const fabMeasureRef = React.useRef<HTMLDivElement | null>(null);
  const fabWidthRef = React.useRef<number>(48);
  const restoreTargetRef = React.useRef<number | null>(null);
  const restoreAttemptsRef = React.useRef(0);
  const restoringRef = React.useRef(false);
  const scrollRafRef = React.useRef<number | null>(null);
  const qDebounceRef = React.useRef<number | null>(null);

  const clampFabY = React.useCallback((y: number) => {
    const min = 84;
    const max = Math.max(window.innerHeight - 120, min + 1);
    return Math.min(Math.max(y, min), max);
  }, []);

  const clampFabXOffset = React.useCallback(
    (x: number, side: "left" | "right") => {
      const margin = 24;
      const width = fabWidthRef.current || 48;
      const available = Math.max(window.innerWidth - margin * 2 - width, 0);
      if (side === "left") return Math.min(Math.max(x, 0), available);
      return Math.min(Math.max(x, -available), 0);
    },
    []
  );

  const applyUrlState = React.useCallback(
    (next: {
      type?: PetTypeFilter;
      sort?: PetSortFilter;
      layout?: "1" | "2";
      density?: "standard" | "compact";
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next.type) {
        if (next.type === "ALL") params.delete("type");
        else params.set("type", next.type);
      }
      if (next.sort) {
        if (next.sort === "LATEST") params.delete("sort");
        else params.set("sort", next.sort);
      }
      if (next.layout) {
        if (next.layout === "1") params.delete("layout");
        else params.set("layout", next.layout);
      }
      if (next.density) {
        if (next.density === "standard") params.delete("dense");
        else params.set("dense", "1");
      }

      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentHref = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (href === currentHref) return;
      router.push(href, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const replaceUrlQuery = React.useCallback(
    (nextQ: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = nextQ.trim();
      if (trimmed) params.set("q", nextQ);
      else params.delete("q");
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = searchParams.toString();
      const currentHref = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (href === currentHref) return;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = () =>
        setReducedMotion(m.matches || document.documentElement.classList.contains("reduced-effects"));
      handler();
      m.addEventListener("change", handler);
      return () => m.removeEventListener("change", handler);
    } catch {
      setReducedMotion(document.documentElement.classList.contains("reduced-effects"));
    }
  }, []);

  React.useEffect(() => {
    if (!floatingActionsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const fab = fabMeasureRef.current;
      if (fab && fab.contains(target)) return;
      setFloatingActionsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFloatingActionsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [floatingActionsOpen]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("discover:fabSide");
      if (stored === "left" || stored === "right") setFabSide(stored);
      const rawY = localStorage.getItem("discover:fabY");
      const parsedY = rawY ? Number(rawY) : Number.NaN;
      const defaultY = clampFabY(window.innerHeight - 108);
      setFabY(Number.isFinite(parsedY) ? clampFabY(parsedY) : defaultY);
    } catch {
    }
  }, [clampFabY]);

  React.useEffect(() => {
    try {
      localStorage.setItem("discover:fabSide", fabSide);
    } catch {
    }
  }, [fabSide]);

  React.useEffect(() => {
    const onResize = () => {
      setFabY((current) => {
        if (current == null) return current;
        return clampFabY(current);
      });
      setFabXOffset((current) => clampFabXOffset(current, fabSide));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampFabXOffset, clampFabY, fabSide]);

  React.useEffect(() => {
    const el = fabMeasureRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) fabWidthRef.current = rect.width;
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
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

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("discover:density");
      if (stored === "compact" || stored === "standard") setDensity(stored);
    } catch {
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("discover:density", density);
    } catch {
    }
  }, [density]);

  React.useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "DOG" || typeParam === "CAT" || typeParam === "OTHER") setType(typeParam);
    if (typeParam === null) setType("ALL");

    const sortParam = searchParams.get("sort");
    if (sortParam === "POPULAR") setSort("POPULAR");
    if (sortParam === null) setSort("LATEST");

    const qParam = searchParams.get("q");
    setQ(qParam ?? "");

    const layout = searchParams.get("layout");
    if (layout === "2") setMobileTwoColumn(true);
    if (layout === "1") setMobileTwoColumn(false);

    const dense = searchParams.get("dense");
    setDensity(dense === "1" ? "compact" : "standard");
  }, [searchParams]);

  React.useEffect(() => {
    if (qDebounceRef.current != null) window.clearTimeout(qDebounceRef.current);
    qDebounceRef.current = window.setTimeout(() => {
      replaceUrlQuery(q);
    }, 350);
    return () => {
      if (qDebounceRef.current != null) window.clearTimeout(qDebounceRef.current);
    };
  }, [q, replaceUrlQuery]);

  React.useEffect(() => {
    applyUrlState({
      type,
      sort,
      layout: mobileTwoColumn ? "2" : "1",
      density,
    });
  }, [applyUrlState, density, mobileTwoColumn, sort, type]);

  const scrollKey = React.useMemo(() => {
    const qs = searchParams.toString();
    return `discover:scroll:${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, searchParams]);

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(scrollKey);
      restoreTargetRef.current = stored ? Number(stored) : null;
      restoreAttemptsRef.current = 0;
      restoringRef.current = Boolean(stored);
    } catch {
      restoreTargetRef.current = null;
      restoreAttemptsRef.current = 0;
      restoringRef.current = false;
    }
  }, [scrollKey]);

  React.useEffect(() => {
    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        try {
          sessionStorage.setItem(scrollKey, String(window.scrollY));
        } catch {
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [scrollKey]);

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
  const hasActiveSearch = Boolean(q.trim()) || type !== "ALL";
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: "600px",
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  React.useEffect(() => {
    if (!isIntersecting) return;
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    const target = restoreTargetRef.current;
    if (!restoringRef.current || target == null) return;
    if (!query.data || items.length === 0) return;

    window.requestAnimationFrame(() => window.scrollTo({ top: target, behavior: "auto" }));

    const reached = window.scrollY >= target - 64;
    if (reached) {
      restoringRef.current = false;
      restoreTargetRef.current = null;
      restoreAttemptsRef.current = 0;
      return;
    }

    if (restoreAttemptsRef.current >= 8) {
      restoringRef.current = false;
      restoreTargetRef.current = null;
      restoreAttemptsRef.current = 0;
      return;
    }

    if (hasNextPage && !isFetchingNextPage) {
      restoreAttemptsRef.current += 1;
      fetchNextPage();
    } else {
      restoringRef.current = false;
      restoreTargetRef.current = null;
      restoreAttemptsRef.current = 0;
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, items.length, query.data]);

  const resultsKey = `${type}-${sort}-${q.trim()}`;

  return (
    <section id="pet-feed" className="scroll-mt-28">
      <div className="glass-panel discover-shell rounded-[34px] p-5 sm:p-6 lg:p-7">
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
                {isMobile ? (
                  <div className="min-w-0 flex items-center gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1">
                    <Button
                      variant={type === "ALL" ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 rounded-full whitespace-nowrap"
                      onClick={() => setType("ALL")}
                    >
                      {messages.feed.all}
                    </Button>
                    <Button
                      variant={type === "DOG" ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 rounded-full whitespace-nowrap"
                      onClick={() => setType("DOG")}
                    >
                      {messages.feed.dogs}
                    </Button>
                    <Button
                      variant={type === "CAT" ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 rounded-full whitespace-nowrap"
                      onClick={() => setType("CAT")}
                    >
                      {messages.feed.cats}
                    </Button>
                    <Button
                      variant={type === "OTHER" ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 rounded-full whitespace-nowrap"
                      onClick={() => setType("OTHER")}
                    >
                      {messages.feed.other}
                    </Button>
                    <div className="h-6 w-px shrink-0 bg-border/60" />
                    <Button
                      variant={density === "compact" ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 rounded-full whitespace-nowrap"
                      onClick={() => setDensity((v) => (v === "compact" ? "standard" : "compact"))}
                    >
                      {density === "compact" ? messages.discover.densityCompact : messages.discover.densityStandard}
                    </Button>
                  </div>
                ) : null}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" type="button" aria-label="胶囊设置">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={10}>
                          <DropdownMenuItem
                            onClick={() => {
                              setFabSide("left");
                              setFabXOffset(0);
                            }}
                          >
                            固定在左边
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setFabSide("right");
                              setFabXOffset(0);
                            }}
                          >
                            固定在右边
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              const next = clampFabY((fabY ?? clampFabY(window.innerHeight - 108)) - 56);
                              setFabY(next);
                              try {
                                localStorage.setItem("discover:fabY", String(next));
                              } catch {
                              }
                            }}
                          >
                            上移
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const next = clampFabY((fabY ?? clampFabY(window.innerHeight - 108)) + 56);
                              setFabY(next);
                              try {
                                localStorage.setItem("discover:fabY", String(next));
                              } catch {
                              }
                            }}
                          >
                            下移
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setFabSide("right");
                              setFabXOffset(0);
                              const next = clampFabY(window.innerHeight - 108);
                              setFabY(next);
                              try {
                                localStorage.removeItem("discover:fabY");
                              } catch {
                              }
                            }}
                          >
                            恢复默认
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

            <div
              className={`motion-collapse grid gap-3 overflow-hidden transform-gpu sm:grid sm:max-h-none sm:grid-cols-2 sm:opacity-100 sm:translate-y-0 sm:scale-100 sm:pointer-events-auto ${
                mobileFiltersOpen
                  ? "max-h-[520px] opacity-100 translate-y-0 scale-100"
                  : "pointer-events-none max-h-0 opacity-0 -translate-y-2 scale-[0.985]"
              }`}
            >
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

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={resultsKey}
          className={`content-stream mt-7 grid gap-5 ${isMobile ? (mobileTwoColumn ? "grid-cols-2" : "grid-cols-1") : "grid-cols-1"} md:grid-cols-2 xl:grid-cols-3`}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {query.isLoading ? (
            <>
              <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
              <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
              <PetCardSkeleton layout={isMobile && !mobileTwoColumn ? "list" : "grid"} />
            </>
          ) : items.length === 0 ? (
            <Reveal className="cv-auto">
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
            <AnimatePresence initial={false}>
              {items.map((pet, index) => (
                <motion.div
                  key={pet.id}
                  layout
                  className="cv-auto"
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
                  transition={{
                    duration: 0.26,
                    ease: [0.22, 1, 0.36, 1],
                    delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.12),
                  }}
                >
                  <PetCard
                    pet={pet}
                    layout={isMobile && !mobileTwoColumn ? "list" : "grid"}
                    density={isMobile ? density : "standard"}
                    imagePriority={index < 2 && query.data?.pages?.length === 1}
                    className="h-full"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </AnimatePresence>

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

      <div
        ref={fabMeasureRef}
        className={`fixed ${fabSide === "right" ? "right-6" : "left-6"} z-40 select-none touch-none sm:hidden transform-gpu`}
        style={
          fabY != null
            ? {
                top: 0,
                transform: `translate3d(${fabXOffset}px, ${fabY}px, 0)`,
                willChange: "transform",
                transition: fabIsDragging || reducedMotion ? "none" : "transform 180ms var(--ease-bounce)",
              }
            : { bottom: "1.5rem" }
        }
        onPointerDown={(e) => {
          if (!isMobile) return;
          if (e.pointerType === "mouse") return;
          pointerIdRef.current = e.pointerId;
          draggingRef.current = false;
          startClientXRef.current = e.clientX;
          startClientYRef.current = e.clientY;
          startFabXOffsetRef.current = fabXOffset;
          startFabYRef.current = fabY ?? clampFabY(window.innerHeight - 108);
          pendingXRef.current = null;
          pendingYRef.current = null;
        }}
        onPointerMove={(e) => {
          if (!isMobile) return;
          if (pointerIdRef.current !== e.pointerId) return;
          const deltaX = e.clientX - startClientXRef.current;
          const deltaY = e.clientY - startClientYRef.current;
          if (!draggingRef.current && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 6) return;
          if (!draggingRef.current) {
            draggingRef.current = true;
            setFabIsDragging(true);
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
            }
          }
          pendingXRef.current = clampFabXOffset(startFabXOffsetRef.current + deltaX, fabSide);
          pendingYRef.current = clampFabY(startFabYRef.current + deltaY);
          if (rafIdRef.current != null) return;
          rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            const x = pendingXRef.current;
            const y = pendingYRef.current;
            pendingXRef.current = null;
            pendingYRef.current = null;
            if (x != null) setFabXOffset(x);
            if (y != null) setFabY(y);
          });
          e.preventDefault();
        }}
        onPointerUp={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          pointerIdRef.current = null;
          const finalY = pendingYRef.current ?? fabY;
          if (rafIdRef.current != null) {
            window.cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          if (pendingXRef.current != null) {
            const next = pendingXRef.current;
            pendingXRef.current = null;
            setFabXOffset(next);
          }
          if (pendingYRef.current != null) {
            const next = pendingYRef.current;
            pendingYRef.current = null;
            setFabY(next);
          }
          if (draggingRef.current) {
            const nextSide = e.clientX < window.innerWidth / 2 ? "left" : "right";
            setFabSide(nextSide);
            setFabXOffset(0);
            try {
              if (finalY != null) localStorage.setItem("discover:fabY", String(finalY));
            } catch {
            }
          }
          draggingRef.current = false;
          setFabIsDragging(false);
        }}
        onPointerCancel={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          pointerIdRef.current = null;
          if (rafIdRef.current != null) {
            window.cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
          pendingXRef.current = null;
          pendingYRef.current = null;
          draggingRef.current = false;
          setFabIsDragging(false);
        }}
      >
        <div
          className={`discover-fab motion-pop flex items-center gap-1 rounded-full border border-border/70 bg-background/55 p-1 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl transform-gpu ${
            floatingActionsOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-2 scale-[0.92] opacity-0"
          }`}
        >
          <button
            type="button"
            className="soft-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/55 text-foreground/80 backdrop-blur-xl hover:bg-background/65 active:scale-[0.98]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="返回顶部"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <Link
            href="/pets/new"
            prefetch={false}
            className="soft-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/55 text-foreground/80 backdrop-blur-xl hover:bg-background/65 active:scale-[0.98]"
            aria-label={messages.header.addPet}
          >
            <Plus className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="soft-control inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/55 text-foreground/80 backdrop-blur-xl hover:bg-background/65 active:scale-[0.98]"
            onClick={() => setFloatingActionsOpen(false)}
            aria-label={messages.discover.hideFilters}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          className={`discover-fab motion-pop soft-control absolute bottom-0 ${fabSide === "right" ? "right-0" : "left-0"} inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/55 text-foreground/80 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl transform-gpu hover:bg-background/65 active:scale-[0.98] ${
            floatingActionsOpen ? "pointer-events-none translate-y-2 scale-[0.92] opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
          onClick={() => setFloatingActionsOpen(true)}
          aria-label={messages.discover.showFilters}
        >
          {fabSide === "right" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
    </section>
  );
}
