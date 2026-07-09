import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { isAppLocale, LOCALE_COOKIE, defaultLocale, type AppLocale } from "@/i18n/routing";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;
  return defaultLocale;
}

export async function getServerT(namespace?: string) {
  const locale = await getServerLocale();
  return getTranslations({ locale, namespace });
}
