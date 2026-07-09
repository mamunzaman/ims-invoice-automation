import { type NextRequest, NextResponse } from "next/server";
import {
  detectLocaleFromAcceptLanguage,
  isAppLocale,
  LOCALE_COOKIE,
  type AppLocale,
} from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const LOCALE_PREFIX_RE = /^\/(en|de)(?=\/|$)/;

function withLocaleCookie(response: NextResponse, locale: AppLocale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

function ensureLocaleCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isAppLocale(existing)) return response;

  const locale = detectLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  return withLocaleCookie(response, locale);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const prefixMatch = pathname.match(LOCALE_PREFIX_RE);
  if (prefixMatch) {
    const locale = prefixMatch[1] as AppLocale;
    const strippedPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = strippedPath;
    const response = NextResponse.redirect(url);
    return withLocaleCookie(response, locale);
  }

  const authResponse = await updateSession(request);
  return ensureLocaleCookie(request, authResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
