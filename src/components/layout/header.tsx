"use client";

import Link from "next/link";
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
  const { theme, setTheme } = useTheme();
  const { locale, messages, setLocale } = useI18n();

  const navLinks = [
    { href: "/", label: messages.header.explore },
    ...(session
      ? [
          { href: "/pets/new", label: messages.header.addPet },
          { href: "/profile", label: messages.header.profile },
        ]
      : []),
  ];

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" prefetch={false} className="shrink-0 text-lg font-semibold tracking-tight sm:text-xl">
            OurPets
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-3">
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
              variant="ghost"
              size="icon"
              aria-label={messages.header.toggleTheme}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="hidden h-5 w-5 dark:block" />
              <Moon className="h-5 w-5 dark:hidden" />
            </Button>

            {status === "loading" ? (
              <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 rounded-full px-2 sm:rounded-md">
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
              <Button onClick={() => signIn("google")} className="gap-2 px-3 sm:px-4">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{messages.header.signIn}</span>
              </Button>
            )}
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="rounded-md border border-transparent bg-muted/50 px-3 py-2 text-center transition-colors hover:border-border hover:bg-accent hover:text-foreground sm:bg-transparent sm:px-0 sm:py-0 sm:text-left"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
