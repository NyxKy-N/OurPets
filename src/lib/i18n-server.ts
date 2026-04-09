import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  detectLocaleFromAcceptLanguage,
  getMessages,
  isLocale,
  localeCookieName,
  type Locale,
} from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return detectLocaleFromAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale;
}

export async function getRequestI18n() {
  const locale = await getRequestLocale();

  return {
    locale,
    messages: getMessages(locale),
  };
}
