"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Check, Languages, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useI18n } from "@/app/providers";
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

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, messages, setLocale } = useI18n();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const primaryLinks = [
    { href: "/", label: messages.header.home, active: pathname === "/" },
    {
      href: "/discover",
      label: messages.header.discover,
      active: pathname === "/discover",
    },
  ];

  const utilityLinks = [
    ...(session
      ? [
          { href: "/pets/new", label: messages.header.addPet, active: pathname === "/pets/new" },
          { href: "/profile", label: messages.header.profile, active: pathname === "/profile" },
        ]
      : []),
  ];

  return (
    <header className="px-3 pt-4 sm:px-4 sm:pt-5">
      <div
        className={`navbar-shell glass-panel-strong mx-auto flex max-w-6xl flex-col gap-4 rounded-[30px] px-4 py-3.5 sm:px-5 ${scrolled ? "is-scrolled" : ""}`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            prefetch={false}
            className="shrink-0 rounded-full px-1 text-lg font-semibold tracking-[-0.04em] transition-[transform,opacity] duration-300 ease-out hover:-translate-y-0.5 hover:opacity-80 sm:text-xl"
          >
            OurPets
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <DropdownMenu>
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

            {status === "loading" ? (
              <div className="glass-button h-10 w-24 animate-pulse rounded-full" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 px-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user.image ?? undefined} />
                      <AvatarFallback>
                        {session.user.name?.slice(0, 1)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="ml-2 hidden max-w-28 truncate text-sm font-medium sm:inline">
                      {session.user.name ?? messages.common.account}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm">{session.user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {session.user.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" prefetch={false}>
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
            ) : (
              <Button onClick={() => signIn("google")} className="gap-2 px-3.5 sm:px-4.5">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{messages.header.signIn}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <nav className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {primaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={item.active ? "page" : undefined}
                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-center transition-[transform,box-shadow,background-color,color,border-color,opacity] duration-300 [transition-timing-function:var(--ease-soft)] sm:text-left ${
                  item.active
                    ? "glass-button border-primary/28 bg-primary/[0.16] text-foreground shadow-[0_14px_32px_hsl(var(--primary)/0.16)]"
                    : "glass-button text-foreground/78"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {utilityLinks.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {utilityLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  aria-current={item.active ? "page" : undefined}
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 transition-[transform,box-shadow,background-color,color,border-color,opacity] duration-300 [transition-timing-function:var(--ease-soft)] ${
                    item.active
                      ? "glass-button border-primary/24 bg-primary/[0.14] text-foreground"
                      : "glass-button text-foreground/72"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
