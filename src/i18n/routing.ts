import { defineRouting } from "next-intl/routing";

export const locales = ["en", "de"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_STORAGE_KEY = "ims.locale";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeCookie: {
    name: LOCALE_COOKIE,
    maxAge: 60 * 60 * 24 * 365,
  },
});

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return (locales as readonly string[]).includes(value ?? "");
}

export function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): AppLocale {
  if (!acceptLanguage) return defaultLocale;
  const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() || "";
  if (primary.startsWith("de")) return "de";
  return defaultLocale;
}

export function intlLocaleTag(locale: AppLocale): string {
  return locale === "de" ? "de-DE" : "en-US";
}
