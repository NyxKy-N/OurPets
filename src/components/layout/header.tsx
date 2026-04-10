"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Heart, Languages, LogIn, LogOut, Menu, MessageCircle, Moon, Plus, Sparkles, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { createPortal } from "react-dom";

import { useI18n, useReducedEffects } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales } from "@/lib/i18n";

type UserMe = { id: string; name: string | null; email: string; image: string | null };
type NotificationItem = {
  id: string;
  type: "LIKE" | "COMMENT";
  createdAt: string;
  actor: { id: string; name: string | null; image: string | null };
  pet: { id: string; name: string };
  content?: string;
};
type NotificationsPayload = {
  items: NotificationItem[];
  unreadCount: number;
};

const overlayOpenEventName = "ourpets:overlay-open";

export function Header() {
  const qc = useQueryClient();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, messages, setLocale } = useI18n();
  const { reducedEffects, toggleReducedEffects } = useReducedEffects();
  const [scrolled, setScrolled] = React.useState(false);
  const [desktopHidden, setDesktopHidden] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [mobileNavRect, setMobileNavRect] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const mobileShellRef = React.useRef<HTMLDivElement | null>(null);
  const mobileNavMenuRef = React.useRef<HTMLDivElement | null>(null);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<UserMe>("/api/user"),
    enabled: Boolean(session?.user?.id),
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationsPayload>("/api/notifications"),
    enabled: Boolean(session?.user?.id),
    refetchInterval: 60000,
  });
  const markNotificationsRead = useMutation({
    mutationFn: () => apiFetch<{ ok: true }>("/api/notifications", { method: "PATCH" }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  React.useEffect(() => {
    const lastYRef = { value: window.scrollY };
    const anchorYRef = { value: window.scrollY };
    const hiddenRef = { value: false };
    const tickingRef = { value: false };
    const onScroll = () => {
      if (tickingRef.value) return;
      tickingRef.value = true;
      window.requestAnimationFrame(() => {
        tickingRef.value = false;

        const y = window.scrollY;
        setScrolled(y > 18);

        const isDesktop = window.matchMedia("(min-width: 640px)").matches;
        if (!isDesktop) {
          lastYRef.value = y;
          anchorYRef.value = y;
          hiddenRef.value = false;
          setDesktopHidden(false);
          return;
        }

        const delta = y - lastYRef.value;
        if (Math.abs(delta) < 6) {
          lastYRef.value = y;
          return;
        }

        const hideThreshold = 116;
        const hideHysteresis = 26;
        const showHysteresis = 18;

        if (!hiddenRef.value) {
          if (delta > 0 && y > hideThreshold && y - anchorYRef.value > hideHysteresis) {
            hiddenRef.value = true;
            anchorYRef.value = y;
            setDesktopHidden(true);
          }
        } else {
          if (delta < 0 && anchorYRef.value - y > showHysteresis) {
            hiddenRef.value = false;
            anchorYRef.value = y;
            setDesktopHidden(false);
          }
        }

        lastYRef.value = y;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const announceOverlayOpen = React.useCallback((source: string) => {
    window.dispatchEvent(new CustomEvent(overlayOpenEventName, { detail: { source } }));
  }, []);

  React.useEffect(() => {
    const onOverlayOpen = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source !== "header-mobile-nav") setMobileNavOpen(false);
    };
    window.addEventListener(overlayOpenEventName, onOverlayOpen as EventListener);
    return () => window.removeEventListener(overlayOpenEventName, onOverlayOpen as EventListener);
  }, []);

  const updateMobileNavRect = React.useCallback(() => {
    const el = mobileShellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMobileNavRect({
      left: rect.left,
      top: rect.bottom + 12,
      width: rect.width,
    });
  }, []);

  React.useEffect(() => {
    if (!mobileNavOpen) return;
    updateMobileNavRect();
    const onViewportChange = () => updateMobileNavRect();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [mobileNavOpen, updateMobileNavRect]);

  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileShellRef.current?.contains(target)) return;
      if (mobileNavMenuRef.current?.contains(target)) return;
      setMobileNavOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobileNavOpen]);

  const primaryLinks = [
    { href: "/", label: messages.header.home, active: pathname === "/" },
    {
      href: "/discover",
      label: messages.header.discover,
      active: pathname === "/discover",
    },
    {
      href: "/chat",
      label: messages.header.chat,
      active: pathname === "/chat",
    },
    {
      href: "/feedback",
      label: messages.header.feedback,
      active: pathname === "/feedback",
    },
  ];
  const notificationsItems = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.unreadCount ?? 0;
  const displayName = me.data?.name ?? session?.user?.name ?? messages.common.account;
  const displayImage = me.data?.image ?? session?.user?.image ?? undefined;
  const displayEmail = me.data?.email ?? session?.user?.email ?? "";

  const navContent = (
    <>
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="gradient-text shrink-0 rounded-full px-1 text-lg font-semibold tracking-[-0.04em] transition-[transform,opacity] duration-300 ease-out hover:-translate-y-0.5 hover:opacity-80 sm:text-xl"
          >
            OurPets
          </Link>

          <nav className="hidden min-w-0 flex-nowrap items-center gap-2 overflow-x-auto text-sm text-muted-foreground [-webkit-overflow-scrolling:touch] sm:flex sm:overflow-visible">
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-center transition-[transform,box-shadow,background-color,color,border-color,opacity] duration-300 [transition-timing-function:var(--ease-soft)] ${
                  item.active
                    ? "glass-button border-primary/28 bg-primary/[0.16] text-foreground shadow-[0_14px_32px_hsl(var(--primary)/0.16)]"
                    : "glass-button text-foreground/78"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {session ? (
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
            <Link
              href="/pets/new"
              aria-label={messages.header.addPet}
              className="glass-button inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/85"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        ) : null}

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden"
            aria-label="Menu"
            onClick={() =>
              setMobileNavOpen((current) => {
                const next = !current;
                if (next) announceOverlayOpen("header-mobile-nav");
                return next;
              })
            }
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className={cn("sm:hidden", reducedEffects ? "border-primary/30 bg-primary/10 text-foreground" : "")}
            aria-label="移除动效与模糊"
            onClick={toggleReducedEffects}
          >
            <Sparkles className="h-5 w-5" />
          </Button>

          {!session ? (
            <>
              <DropdownMenu onOpenChange={(open) => open && announceOverlayOpen("header-language-menu")}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 px-3.5">
                    <Languages className="h-4 w-4" />
                    <span className="hidden text-sm sm:inline">{messages.languages[locale]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>{messages.header.language}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {locales.map((value) => (
                    <DropdownMenuItem key={value} onClick={() => setLocale(value)}>
                      <span className="flex flex-1 items-center justify-between gap-3">
                        {messages.languages[value]}
                        {value === locale ? <Check className="h-4 w-4" /> : null}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                aria-label={messages.header.toggleTheme}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="hidden h-5 w-5 dark:block" />
                <Moon className="h-5 w-5 dark:hidden" />
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu onOpenChange={(open) => open && announceOverlayOpen("header-language-menu")}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden h-10 gap-2 px-3.5 sm:inline-flex">
                    <Languages className="h-4 w-4" />
                    <span className="hidden text-sm sm:inline">{messages.languages[locale]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>{messages.header.language}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {locales.map((value) => (
                    <DropdownMenuItem key={value} onClick={() => setLocale(value)}>
                      <span className="flex flex-1 items-center justify-between gap-3">
                        {messages.languages[value]}
                        {value === locale ? <Check className="h-4 w-4" /> : null}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                className="hidden sm:inline-flex"
                aria-label={messages.header.toggleTheme}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="hidden h-5 w-5 dark:block" />
                <Moon className="h-5 w-5 dark:hidden" />
              </Button>
            </>
          )}

          {status === "loading" ? (
            <div className="glass-button h-10 w-24 animate-pulse rounded-full" />
          ) : session ? (
            <>
              <DropdownMenu onOpenChange={(open) => open && announceOverlayOpen("header-notifications-menu")}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    aria-label={messages.header.notifications}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 ? (
                      <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                        {Math.min(unreadCount, 9)}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[260] w-[22rem] p-2">
                  <div className="flex items-center justify-between px-2 py-2">
                    <DropdownMenuLabel className="px-0 py-0">{messages.notifications.title}</DropdownMenuLabel>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => markNotificationsRead.mutate()}
                      disabled={markNotificationsRead.isPending || unreadCount === 0}
                    >
                      {messages.notifications.markRead}
                    </Button>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-[24rem] space-y-1 overflow-y-auto p-1">
                    {notificationsItems.length === 0 ? (
                      <div className="rounded-[20px] border border-border/60 bg-background/55 px-4 py-6 text-center text-sm text-muted-foreground">
                        {messages.notifications.empty}
                      </div>
                    ) : (
                      notificationsItems.map((item) => (
                        <Link
                          key={item.id}
                          href={`/pet/${item.pet.id}`}
                          className="flex items-start gap-3 rounded-[20px] border border-transparent bg-background/45 px-3 py-3 transition-[transform,background-color,border-color] duration-300 hover:-translate-y-0.5 hover:border-border/70 hover:bg-background/70"
                        >
                          <Avatar className="mt-0.5 h-9 w-9">
                            <AvatarImage src={item.actor.image ?? undefined} />
                            <AvatarFallback>
                              {item.actor.name?.slice(0, 1)?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-primary">
                                {item.type === "LIKE" ? <Heart className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm leading-6">
                                  <span className="font-medium text-foreground">
                                    {item.actor.name ?? messages.common.user}
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {item.type === "LIKE"
                                      ? messages.notifications.likedYourPost
                                      : messages.notifications.commentedOnPost}
                                  </span>
                                </div>
                                <div className="line-clamp-1 text-xs text-muted-foreground">
                                  {item.pet.name}
                                  {item.content ? ` · ${item.content}` : ""}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu onOpenChange={(open) => open && announceOverlayOpen("header-account-menu")}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 px-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={displayImage} />
                      <AvatarFallback>
                        {displayName.slice(0, 1)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="ml-2 hidden max-w-28 truncate text-sm font-medium sm:inline">
                      {displayName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[260] w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm">{displayName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {displayEmail}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="sm:hidden">
                    <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
                      {messages.header.language}
                    </DropdownMenuLabel>
                    {locales.map((value) => (
                      <DropdownMenuItem key={value} onClick={() => setLocale(value)}>
                        <span className="flex flex-1 items-center justify-between gap-3">
                          {messages.languages[value]}
                          {value === locale ? <Check className="h-4 w-4" /> : null}
                        </span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      aria-label={messages.header.toggleTheme}
                    >
                      <span className="flex flex-1 items-center justify-between gap-3">
                        {messages.header.toggleTheme}
                        {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      {messages.header.profile}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {messages.header.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => signIn("google")} className="gap-2 px-3.5 sm:px-4.5">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">{messages.header.signIn}</span>
            </Button>
          )}
        </div>
      </div>

    </>
  );

  return (
    <header className="relative z-[110] w-full">
      <div className="relative z-[110] px-3 pt-4 sm:hidden">
        <div ref={mobileShellRef} className="glass-panel-strong relative mx-auto flex max-w-6xl flex-col gap-4 rounded-[30px] px-4 py-3.5">
          {navContent}
        </div>
      </div>

      <div
        className={cn(
          "navbar-shell hidden w-full border-b border-border/60 bg-background/55 backdrop-blur-xl sm:fixed sm:inset-x-0 sm:top-0 sm:block sm:origin-top sm:transform-gpu sm:transition-[transform,opacity] sm:duration-500 [transition-timing-function:var(--ease-soft)]",
          scrolled ? "is-scrolled" : "",
          desktopHidden ? "sm:pointer-events-none sm:-translate-y-3 sm:scale-[0.92] sm:opacity-0" : "sm:translate-y-0 sm:scale-100 sm:opacity-100"
        )}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3.5 sm:px-6">
          {navContent}
        </div>
      </div>
      {mobileNavOpen && mobileNavRect
        ? createPortal(
            <div
              ref={mobileNavMenuRef}
              className="glass-panel-strong motion-collapse fixed z-[240] overflow-hidden rounded-[24px] p-1.5 text-popover-foreground sm:hidden"
              style={{
                left: "50%",
                top: mobileNavRect.top,
                width: `min(calc(100vw - 24px), ${mobileNavRect.width}px)`,
                transform: "translateX(-50%)",
              }}
            >
              <nav className="flex flex-col gap-1">
                {primaryLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    onClick={() => setMobileNavOpen(false)}
                    className={`inline-flex items-center rounded-[20px] px-3 py-2.5 text-sm transition-[transform,background-color,color] duration-300 [transition-timing-function:var(--ease-soft)] ${
                      item.active
                        ? "bg-accent/70 text-foreground"
                        : "text-foreground/78 hover:bg-accent/55 hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>,
            document.body
          )
        : null}
    </header>
  );
}
