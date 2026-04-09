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
          <main className="flex-1">{children}</main>
          <footer className="border-t py-8">
            <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground sm:text-left">
              © {new Date().getFullYear()} OurPets
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
