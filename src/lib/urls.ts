const TEMPLATE_URL_PATTERN = /\{\{|\}\}|\$json/i;

export function sanitizeExternalUrl(value: string | null | undefined): string | null {
  if (value == null) return null;

  const trimmed = value.trim();
  if (!trimmed || TEMPLATE_URL_PATTERN.test(trimmed)) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isExternalHttpUrl(value: string | null | undefined): value is string {
  return sanitizeExternalUrl(value) !== null;
}
