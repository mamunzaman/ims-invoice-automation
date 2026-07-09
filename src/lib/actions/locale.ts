"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  defaultLocale,
  isAppLocale,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/i18n/routing";

export async function getProfileLanguage(): Promise<AppLocale | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.language) return null;
  return isAppLocale(data.language) ? data.language : null;
}

export async function setUserLocale(locale: AppLocale) {
  if (!isAppLocale(locale)) {
    return { success: false as const, errors: ["Invalid locale."] };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
      .from("profiles")
      .update({ language: locale })
      .eq("id", user.id);

    if (error && !error.message.includes("language")) {
      return { success: false as const, errors: [error.message] };
    }
  }

  revalidatePath("/", "layout");
  return { success: true as const, locale };
}

export async function resolveInitialLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const profileLocale = await getProfileLanguage();
  if (profileLocale) return profileLocale;

  return defaultLocale;
}
