"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ThemeProvider } from "next-themes";
import {
  QueryClient,
  QueryClientProvider,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { Toaster } from "sonner";

import {
  getMessages,
  localeCookieName,
  type Locale,
  type Messages,
} from "@/lib/i18n";

const ReactQueryDevtools = dynamic(
  () => import("@tanstack/react-query-devtools").then((mod) => mod.ReactQueryDevtools),
  { ssr: false }
);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Avoid retry loops on auth/validation errors.
          const status =
            (error as { status?: number } | null)?.status ??
            (error as { response?: { status?: number } } | null)?.response?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

type ReducedEffectsContextValue = {
  reducedEffects: boolean;
  setReducedEffects: (next: boolean) => void;
  toggleReducedEffects: () => void;
};

const ReducedEffectsContext = React.createContext<ReducedEffectsContextValue | null>(null);

function LocaleProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialMessages: Messages;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState(initialLocale);

  React.useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const setLocale = React.useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);
      document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = nextLocale;
      router.refresh();
    },
    [router]
  );

  const value = React.useMemo(
    () => ({
      locale,
      messages: locale === initialLocale ? initialMessages : getMessages(locale),
      setLocale,
    }),
    [initialLocale, initialMessages, locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = React.useContext(LocaleContext);

  if (!context) {
    throw new Error("useI18n must be used within Providers");
  }

  return context;
}

export function useReducedEffects() {
  const context = React.useContext(ReducedEffectsContext);
  if (!context) {
    throw new Error("useReducedEffects must be used within Providers");
  }
  return context;
}

export function Providers({
  children,
  session,
  initialLocale,
  initialMessages,
}: {
  children: React.ReactNode;
  session: Session | null;
  initialLocale: Locale;
  initialMessages: Messages;
}) {
  const router = useRouter();
  const queryClient = getQueryClient();
  const [reducedEffects, setReducedEffectsState] = React.useState(false);

  const applyReducedEffects = React.useCallback((next: boolean, persist: boolean) => {
    setReducedEffectsState(next);
    document.documentElement.classList.toggle("reduced-effects", next);
    if (!persist) return;
    try {
      localStorage.setItem("ui:reducedEffects", next ? "1" : "0");
    } catch {
    }
  }, []);

  const setReducedEffects = React.useCallback(
    (next: boolean) => applyReducedEffects(next, true),
    [applyReducedEffects]
  );

  const toggleReducedEffects = React.useCallback(() => {
    setReducedEffects(!document.documentElement.classList.contains("reduced-effects"));
  }, [setReducedEffects]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("ui:reducedEffects");
      if (stored === "1") {
        applyReducedEffects(true, false);
        return;
      }
      if (stored === "0") {
        applyReducedEffects(false, false);
        return;
      }
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // @ts-expect-error deviceMemory is not in TS lib dom by default
      const dm: number | undefined = navigator.deviceMemory;
      const hc: number | undefined = navigator.hardwareConcurrency;
      const lowMemory = typeof dm === "number" && dm <= 4;
      const lowCpu = typeof hc === "number" && hc > 0 && hc <= 4;
      // @ts-expect-error connection is not in TS lib dom by default
      const conn: { saveData?: boolean; effectiveType?: string } | undefined = navigator.connection;
      const saveData = Boolean(conn?.saveData);
      const effectiveType = conn?.effectiveType;
      const lowNetwork = saveData || effectiveType === "2g" || effectiveType === "slow-2g";
      const reduced = prefersReducedMotion || lowMemory || lowCpu || lowNetwork;
      applyReducedEffects(Boolean(reduced), false);
    } catch {
    }
  }, [applyReducedEffects]);

  React.useEffect(() => {
    if (reducedEffects) return;
    if (typeof document === "undefined") return;
    if (!("startViewTransition" in document)) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      e.preventDefault();
      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      (document as unknown as { startViewTransition: (cb: () => void) => unknown }).startViewTransition(
        () => router.push(nextHref)
      );
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [reducedEffects, router]);

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}>
          <ReducedEffectsContext.Provider value={{ reducedEffects, setReducedEffects, toggleReducedEffects }}>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              {children}
              <Toaster richColors closeButton />
            </ThemeProvider>
          </ReducedEffectsContext.Provider>
        </LocaleProvider>
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </SessionProvider>
  );
}
