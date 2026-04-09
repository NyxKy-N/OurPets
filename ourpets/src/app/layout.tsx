import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Header } from "@/components/layout/header";
import { getSession } from "@/lib/auth-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OurPets",
    template: "%s · OurPets",
  },
  description: "A social platform to share and explore pets.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers session={session}>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-8">
            <div className="mx-auto max-w-5xl px-4 text-sm text-muted-foreground">
              © {new Date().getFullYear()} OurPets
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
