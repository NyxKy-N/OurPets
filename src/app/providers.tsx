"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ThemeProvider } from "next-themes";
import {
  QueryClient,
  QueryClientProvider,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import {
  getMessages,
  localeCookieName,
  type Locale,
  type Messages,
} from "@/lib/i18n";

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
  const queryClient = getQueryClient();

  React.useEffect(() => {
    try {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // @ts-expect-error deviceMemory is not in TS lib dom by default
      const dm: number | undefined = navigator.deviceMemory;
      const hc: number | undefined = navigator.hardwareConcurrency;
      const lowMemory = typeof dm === "number" && dm <= 4;
      const lowCpu = typeof hc === "number" && hc > 0 && hc <= 4;
      const reduced = prefersReducedMotion || lowMemory || lowCpu;
      document.documentElement.classList.toggle("reduced-effects", Boolean(reduced));
    } catch {
    }
  }, []);

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
            <Toaster richColors closeButton />
          </ThemeProvider>
        </LocaleProvider>
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </SessionProvider>
  );
}
