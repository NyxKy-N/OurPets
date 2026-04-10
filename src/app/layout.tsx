import type { Metadata } from "next";
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
          <main className="flex-1 pb-8 pt-6 sm:pb-28 sm:pt-24">{children}</main>
          <footer className="px-4 pb-10 pt-6 sm:px-0 sm:pb-0 sm:pt-0">
            <div className="glass-panel mx-auto max-w-6xl rounded-[30px] px-5 py-5 transition-[transform,box-shadow,background-color,border-color] duration-300 [transition-timing-function:var(--ease-soft)] sm:hidden">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <div className="text-lg font-semibold tracking-tight text-foreground/92">
                    <span className="gradient-text">OurPets</span>
                  </div>
                  <div className="text-xs font-semibold tracking-[0.26em] text-muted-foreground uppercase">
                    {messages.home.eyebrow}
                  </div>
                </div>

              </div>
            </div>

            <div className="navbar-shell fixed inset-x-0 bottom-0 hidden w-full border-t border-border/60 bg-background/55 backdrop-blur-xl sm:block">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
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
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
