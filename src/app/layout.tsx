import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/app/providers";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth-server";
import { getRequestI18n } from "@/lib/i18n-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestI18n();

  return {
    title: {
      default: "OurPets",
      template: "%s · OurPets",
    },
    description: messages.meta.appDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const { locale, messages } = await getRequestI18n();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <Providers session={session} initialLocale={locale} initialMessages={messages}>
          <Header />
          <main className="flex-1 pb-28 pt-24">{children}</main>
          <footer className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-border/60 bg-background/55 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <div className="text-lg font-semibold tracking-tight text-foreground/92">
                  <span className="gradient-text">OurPets</span>
                </div>
                <div className="hidden text-xs font-semibold tracking-[0.26em] text-muted-foreground uppercase sm:block">
                  {messages.home.eyebrow}
                </div>
                <div className="hidden text-xs font-medium tracking-[0.18em] text-muted-foreground/90 sm:block">
                  © {new Date().getFullYear()} OurPets
                </div>
              </div>

              <nav aria-label="Footer" className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Link
                  href="/discover"
                  prefetch={false}
                  className="soft-control inline-flex h-11 items-center rounded-full border border-white/70 bg-white/40 px-4 text-sm font-medium text-foreground/80 backdrop-blur-xl hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background/60 active:scale-[0.98]"
                >
                  {messages.header.discover}
                </Link>
                <Link
                  href="/pets/new"
                  prefetch={false}
                  className="soft-control inline-flex h-11 items-center rounded-full border border-white/70 bg-white/40 px-4 text-sm font-medium text-foreground/80 backdrop-blur-xl hover:bg-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background/60 active:scale-[0.98]"
                >
                  {messages.header.addPet}
                </Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
