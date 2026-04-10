"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUp, ChevronLeft, ChevronRight, LayoutGrid, LayoutList, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
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
const overlayOpenEventName = "ourpets:overlay-open";

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
  const [fabSide, setFabSide] = React.useState<"left" | "right">("right");
  const [fabY, setFabY] = React.useState<number | null>(null);
  const [fabXOffset, setFabXOffset] = React.useState(0);
  const [fabIsDragging, setFabIsDragging] = React.useState(false);
  const [mobileFiltersRect, setMobileFiltersRect] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const draggingRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const mobileFiltersAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const mobileFiltersMenuRef = React.useRef<HTMLDivElement | null>(null);
  const startClientXRef = React.useRef(0);
  const startClientYRef = React.useRef(0);
  const startFabXOffsetRef = React.useRef(0);
  const startFabYRef = React.useRef(0);
  const pendingXRef = React.useRef<number | null>(null);
  const pendingYRef = React.useRef<number | null>(null);
  const rafIdRef = React.useRef<number | null>(null);
  const scrollLockRef = React.useRef<{
    scrollY: number;
    htmlOverscrollBehavior: string;
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyLeft: string;
    bodyRight: string;
    bodyWidth: string;
    bodyTouchAction: string;
  } | null>(null);

  const clampFabXOffset = React.useCallback((x: number) => {
    const pad = 24;
    const base = fabSide === "right" ? window.innerWidth - pad : pad;
    const min = -Math.max(base - pad, 0);
    const max = Math.max(window.innerWidth - base - pad, 0);
    return Math.min(Math.max(x, min), max);
  }, [fabSide]);

  const clampFabY = React.useCallback((y: number) => {
    const min = 84;
    const max = Math.max(window.innerHeight - 120, min + 1);
    return Math.min(Math.max(y, min), max);
  }, []);

  const lockScroll = React.useCallback(() => {
    if (scrollLockRef.current) return;
    const scrollY = window.scrollY;
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    scrollLockRef.current = {
      scrollY,
      htmlOverscrollBehavior: htmlStyle.overscrollBehavior,
      bodyOverflow: bodyStyle.overflow,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      bodyTouchAction: bodyStyle.touchAction,
    };
    htmlStyle.overscrollBehavior = "none";
    bodyStyle.overflow = "hidden";
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.touchAction = "none";
  }, []);

  const unlockScroll = React.useCallback(() => {
    const snapshot = scrollLockRef.current;
    if (!snapshot) return;
    scrollLockRef.current = null;
    const htmlStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    htmlStyle.overscrollBehavior = snapshot.htmlOverscrollBehavior;
    bodyStyle.overflow = snapshot.bodyOverflow;
    bodyStyle.position = snapshot.bodyPosition;
    bodyStyle.top = snapshot.bodyTop;
    bodyStyle.left = snapshot.bodyLeft;
    bodyStyle.right = snapshot.bodyRight;
    bodyStyle.width = snapshot.bodyWidth;
    bodyStyle.touchAction = snapshot.bodyTouchAction;
    window.scrollTo(0, snapshot.scrollY);
  }, []);

  React.useEffect(() => {
    return () => {
      unlockScroll();
    };
  }, [unlockScroll]);

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
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampFabY]);

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

  const announceOverlayOpen = React.useCallback((source: string) => {
    window.dispatchEvent(new CustomEvent(overlayOpenEventName, { detail: { source } }));
  }, []);

  React.useEffect(() => {
    const onOverlayOpen = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source !== "discover-mobile-filters") {
        setMobileFiltersOpen(false);
      }
    };
    window.addEventListener(overlayOpenEventName, onOverlayOpen as EventListener);
    return () => window.removeEventListener(overlayOpenEventName, onOverlayOpen as EventListener);
  }, []);

  const updateMobileFiltersRect = React.useCallback(() => {
    const el = mobileFiltersAnchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMobileFiltersRect({
      left: rect.left,
      top: rect.bottom + 12,
      width: rect.width,
    });
  }, []);

  React.useEffect(() => {
    if (!mobileFiltersOpen) return;
    updateMobileFiltersRect();
    const onViewportChange = () => updateMobileFiltersRect();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [mobileFiltersOpen, updateMobileFiltersRect]);

  React.useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileFiltersAnchorRef.current?.contains(target)) return;
      if (mobileFiltersMenuRef.current?.contains(target)) return;
      setMobileFiltersOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobileFiltersOpen]);

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
    rootMargin: "600px",
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
      <div className="glass-panel discover-shell relative z-[90] rounded-[34px] p-5 sm:p-6 lg:p-7">
        <div className="flex flex-col gap-6 lg:gap-7">
          <div className="space-y-2">
            <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              {messages.discover.browseLabel}
            </div>
            <h2 className="gradient-text text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {messages.discover.title}
            </h2>
          </div>

          <div className="relative z-[95] grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] xl:items-start">
            <div ref={mobileFiltersAnchorRef} className="glass-panel rounded-[28px] p-3.5">
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
                        onClick={() =>
                          setMobileFiltersOpen((current) => {
                            const next = !current;
                            if (next) announceOverlayOpen("discover-mobile-filters");
                            return next;
                          })
                        }
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

            <div className="hidden sm:grid sm:grid-cols-2 sm:gap-3">
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
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {mobileFiltersOpen && mobileFiltersRect ? (
                <motion.div
                  ref={mobileFiltersMenuRef}
                  className="glass-panel-strong fixed z-[240] overflow-hidden rounded-[24px] p-1.5 text-popover-foreground sm:hidden"
                  style={{
                    left: "50%",
                    top: mobileFiltersRect.top,
                    width: `min(calc(100vw - 24px), ${mobileFiltersRect.width}px)`,
                  }}
                  initial={{ opacity: 0, y: -10, scale: 0.972, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                  exit={{ opacity: 0, y: -8, scale: 0.978, x: "-50%" }}
                  transition={{ type: "spring", mass: 0.82, damping: 22, stiffness: 300 }}
                >
                  <div className="px-3 py-2.5">
                    <div className="mb-3 px-1 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                      {messages.discover.categoryLabel}
                    </div>
                    <Tabs
                      value={type}
                      onValueChange={(v) => {
                        if (v === "ALL" || v === "DOG" || v === "CAT" || v === "OTHER") {
                          setType(v);
                          setMobileFiltersOpen(false);
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-[24px] p-1.5">
                        <TabsTrigger value="ALL" className="w-full text-[13px]">
                          {messages.feed.all}
                        </TabsTrigger>
                        <TabsTrigger value="DOG" className="w-full text-[13px]">
                          {messages.feed.dogs}
                        </TabsTrigger>
                        <TabsTrigger value="CAT" className="w-full text-[13px]">
                          {messages.feed.cats}
                        </TabsTrigger>
                        <TabsTrigger value="OTHER" className="w-full text-[13px]">
                          {messages.feed.other}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="mx-2 h-px bg-border/70" />
                  <div className="px-3 py-2.5">
                    <div className="mb-3 px-1 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                      {messages.discover.sortLabel}
                    </div>
                    <Tabs
                      value={sort}
                      onValueChange={(v) => {
                        if (v === "LATEST" || v === "POPULAR") {
                          setSort(v);
                          setMobileFiltersOpen(false);
                        }
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
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}

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
        className={`fixed ${fabSide === "right" ? "right-6" : "left-6"} z-40 select-none touch-none sm:hidden transform-gpu`}
        style={
          fabY != null
            ? {
                top: 0,
                transform: `translate3d(${fabXOffset}px, ${fabY}px, 0)`,
                willChange: "transform",
                transition: fabIsDragging ? "none" : "transform 180ms var(--ease-bounce)",
              }
            : { bottom: "1.5rem" }
        }
        onPointerDown={(e) => {
          if (!isMobile) return;
          if (e.pointerType === "mouse") return;
          pointerIdRef.current = e.pointerId;
          draggingRef.current = false;
          setFabIsDragging(false);
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
          const delta = e.clientY - startClientYRef.current;
          if (!draggingRef.current && Math.max(Math.abs(deltaX), Math.abs(delta)) < 6) return;
          if (!draggingRef.current) {
            draggingRef.current = true;
            setFabIsDragging(true);
            lockScroll();
            try {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
            }
          }
          pendingXRef.current = clampFabXOffset(startFabXOffsetRef.current + deltaX);
          const next = clampFabY(startFabYRef.current + delta);
          pendingYRef.current = next;
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
            const snapThreshold = window.innerWidth * 0.55;
            const nextSide = e.clientX <= snapThreshold ? "left" : "right";
            setFabSide(nextSide);
            setFabXOffset(0);
          }
          if (draggingRef.current && finalY != null) {
            try {
              localStorage.setItem("discover:fabY", String(finalY));
            } catch {
            }
          }
          draggingRef.current = false;
          setFabIsDragging(false);
          unlockScroll();
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
          unlockScroll();
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
