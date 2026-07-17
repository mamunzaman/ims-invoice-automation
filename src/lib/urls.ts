const TEMPLATE_URL_PATTERN = /\{\{|\}\}|\$json/i;
const INVOICE_SECURE_DOWNLOAD_PATH =
  /^\/api\/invoices\/[^/]+\/download\/(pdf|docx)\/?$/i;

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

export function isLocalhostAbsoluteUrl(value: string | null | undefined): boolean {
  const absolute = sanitizeExternalUrl(value);
  if (!absolute) return false;
  try {
    const { hostname } = new URL(absolute);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

/** Pathname from a relative path or absolute URL (any origin). */
export function pathnameFromDocumentHref(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || TEMPLATE_URL_PATTERN.test(trimmed)) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed.split("?")[0]?.split("#")[0] || null;
  }

  const absolute = sanitizeExternalUrl(trimmed);
  if (!absolute) return null;
  try {
    return new URL(absolute).pathname;
  } catch {
    return null;
  }
}

export function isInvoiceSecureDownloadHref(value: string | null | undefined): boolean {
  const pathname = pathnameFromDocumentHref(value);
  return pathname !== null && INVOICE_SECURE_DOWNLOAD_PATH.test(pathname);
}

export function toRelativeInvoiceSecureDownloadHref(
  invoiceId: string,
  kind: "pdf" | "docx"
): string {
  return `/api/invoices/${invoiceId}/download/${kind}`;
}

/** Accepts absolute URLs and n8n/Dropbox relative document paths for storage. */
export function normalizeDocumentLink(value: string | null | undefined): string | null {
  const external = sanitizeExternalUrl(value);
  if (external) return external;

  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || TEMPLATE_URL_PATTERN.test(trimmed)) return null;

  if (trimmed.startsWith("/") || trimmed.startsWith("./")) {
    return trimmed;
  }

  if (!trimmed.includes("://") && trimmed.includes("/")) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  return null;
}

export function hasStoredDocumentReference(
  ...values: Array<string | null | undefined>
): boolean {
  return values.some((value) => normalizeDocumentLink(value) !== null);
}

export function isStoredDropboxPath(value: string | null | undefined): boolean {
  const normalized = normalizeDocumentLink(value);
  return (
    normalized !== null &&
    !normalized.startsWith("http") &&
    !isInvoiceSecureDownloadHref(normalized)
  );
}

/**
 * User-facing PDF/DOCX href:
 * Relative secure download route when a Dropbox file path exists.
 * Never hardcodes localhost/origin. Never uses public shared links as the href.
 */
export function resolveInvoiceDocumentDownloadHref(
  invoiceId: string,
  kind: "pdf" | "docx",
  dropboxUrl?: string | null,
  fallbackUrl?: string | null
): string | null {
  for (const value of [dropboxUrl, fallbackUrl]) {
    if (!value?.trim()) continue;
    if (isInvoiceSecureDownloadHref(value) || isStoredDropboxPath(value)) {
      return toRelativeInvoiceSecureDownloadHref(invoiceId, kind);
    }
  }
  return null;
}

export function isDropboxSharedUrl(value: string | null | undefined): boolean {
  const url = sanitizeExternalUrl(value);
  if (!url) return false;
  return url.includes("dropbox.com") || url.includes("dropboxusercontent.com");
}

/** User-facing PDF/DOCX button URL — Dropbox shared link only. */
export function resolveDropboxSharedUrl(value?: string | null): string | null {
  return isDropboxSharedUrl(value) ? sanitizeExternalUrl(value) : null;
}

export function isExternalHttpUrl(value: string | null | undefined): value is string {
  return sanitizeExternalUrl(value) !== null;
}

export function isGoogleDriveDocumentUrl(value: string): boolean {
  return value.includes("drive.google.com") || value.includes("docs.google.com");
}

/** Parent folder from a Dropbox path or shared link context (not localhost). */
export function extractDropboxArchiveFolder(
  dropboxPdfUrl?: string | null,
  dropboxDocxUrl?: string | null,
  invoiceYear?: number
): string | null {
  const raw = (dropboxPdfUrl ?? dropboxDocxUrl)?.trim();
  if (!raw) {
    return invoiceYear ? `IMS/Rechnungen/${invoiceYear}` : null;
  }

  const stored = normalizeDocumentLink(raw);
  if (!stored) return invoiceYear ? `IMS/Rechnungen/${invoiceYear}` : null;

  if (stored.startsWith("http")) {
    return invoiceYear ? `IMS/Rechnungen/${invoiceYear}` : null;
  }

  const normalized = stored.replace(/^\//, "");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return normalized;
  return normalized.slice(0, lastSlash);
}

/** Absolute http(s) URL for redirects — rejects localhost and internal download routes. */
export function resolveInvoiceDownloadUrl(
  dropboxUrl?: string | null,
  fallbackUrl?: string | null,
  stepUrl?: string | null
): string | null {
  for (const candidate of [dropboxUrl, stepUrl, fallbackUrl]) {
    const shared = resolveDropboxSharedUrl(candidate);
    if (shared) return shared;

    const absolute = sanitizeExternalUrl(candidate);
    if (!absolute) continue;
    if (isLocalhostAbsoluteUrl(absolute)) continue;
    if (isInvoiceSecureDownloadHref(absolute)) continue;
    if (isGoogleDriveDocumentUrl(absolute)) continue;
    return absolute;
  }

  return null;
}
