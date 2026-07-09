"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, type AppLocale } from "@/i18n/routing";

export function LocaleBootstrap() {
  const locale = useLocale() as AppLocale;

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }

    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  }, [locale]);

  return null;
}
