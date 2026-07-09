import { locales, type AppLocale } from "@/i18n/routing";

export interface LocaleDefinition {
  code: AppLocale;
  messageKey: string;
}

const LOCALE_LABEL_KEYS: Record<AppLocale, string> = {
  en: "english",
  de: "german",
};

export function getLocaleDefinitions(): LocaleDefinition[] {
  return locales.map((code) => ({
    code,
    messageKey: LOCALE_LABEL_KEYS[code],
  }));
}

export function getLocaleDefinition(code: string): LocaleDefinition | undefined {
  return getLocaleDefinitions().find((item) => item.code === code);
}
