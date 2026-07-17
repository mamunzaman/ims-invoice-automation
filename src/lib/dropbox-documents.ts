import type { GenerationResultStep } from "@/lib/generation-status";
import { normalizeStepKey } from "@/lib/invoice-generation-steps";
import {
  isDropboxSharedUrl,
  isInvoiceSecureDownloadHref,
  isLocalhostAbsoluteUrl,
  isStoredDropboxPath,
  normalizeDocumentLink,
  resolveDropboxSharedUrl,
} from "@/lib/urls";

/** App-folder root used in full Dropbox archive paths for this project. */
export const DROPBOX_APP_FOLDER_ROOT_NAME = "ItConsultingMamun";

const PDF_DROPBOX_STEP_KEYS = new Set([
  "dropbox_pdf",
  "save_pdf",
  "upload_pdf",
  "copy_pdf_all",
  "pdf_drive_upload",
]);

const DOCX_DROPBOX_STEP_KEYS = new Set([
  "dropbox_docx",
  "save_docx",
  "upload_docx",
  "copy_docx_all",
  "docx_drive_upload",
]);

function stepKeysForKind(kind: "pdf" | "docx"): Set<string> {
  return kind === "pdf" ? PDF_DROPBOX_STEP_KEYS : DOCX_DROPBOX_STEP_KEYS;
}

export function extractDropboxSharedUrlFromSteps(
  steps: GenerationResultStep[] | null | undefined,
  kind: "pdf" | "docx"
): string | null {
  if (!steps?.length) return null;

  const keys = stepKeysForKind(kind);
  for (const step of steps) {
    const normalizedKey = normalizeStepKey(step.key);
    if (!keys.has(normalizedKey) && !keys.has(step.key.trim().toLowerCase())) continue;
    const sharedUrl = resolveDropboxSharedUrl(step.url);
    if (sharedUrl) return sharedUrl;
  }

  return null;
}

export function resolveStoredDropboxSharedUrl(
  directValue: string | null | undefined,
  steps: GenerationResultStep[] | null | undefined,
  kind: "pdf" | "docx"
): string | null {
  return resolveDropboxSharedUrl(directValue) ?? extractDropboxSharedUrlFromSteps(steps, kind);
}

export function resolveStoredDropboxReference(
  directValue: string | null | undefined,
  steps: GenerationResultStep[] | null | undefined,
  kind: "pdf" | "docx"
): string | null {
  return (
    normalizeDocumentLink(directValue) ??
    (() => {
      if (!steps?.length) return null;
      const keys = stepKeysForKind(kind);
      for (const step of steps) {
        const normalizedKey = normalizeStepKey(step.key);
        if (!keys.has(normalizedKey) && !keys.has(step.key.trim().toLowerCase())) continue;
        const stored = normalizeDocumentLink(step.url);
        if (stored) return stored;
      }
      return null;
    })()
  );
}

export function pickPreferredDropboxDocumentUrl(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const shared = resolveDropboxSharedUrl(value);
    if (shared) return shared;
  }

  for (const value of values) {
    const stored = normalizeDocumentLink(value);
    if (stored) return stored;
  }

  return null;
}

/**
 * Normalize a stored Dropbox file path for API use.
 * Collapses slashes/whitespace; preserves filename case; rejects URLs.
 */
export function normalizeDropboxStoredPath(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed) return null;
  if (trimmed.includes("..")) return null;
  if (isLocalhostAbsoluteUrl(trimmed) || isInvoiceSecureDownloadHref(trimmed)) return null;
  if (isDropboxSharedUrl(trimmed) || /^https?:\/\//i.test(trimmed)) return null;
  if (!isStoredDropboxPath(trimmed) && !trimmed.startsWith("/") && !trimmed.includes("/")) {
    return null;
  }

  let path = trimmed.replace(/\/+/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function resolveDropboxPathForDownload(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = normalizeDropboxStoredPath(value);
    if (normalized) return normalized;
  }
  return null;
}

export function extractDropboxPathsFromSteps(
  steps: GenerationResultStep[] | null | undefined,
  kind: "pdf" | "docx"
): string[] {
  if (!steps?.length) return [];

  const keys = stepKeysForKind(kind);
  const paths: string[] = [];

  for (const step of steps) {
    const normalizedKey = normalizeStepKey(step.key);
    const rawKey = step.key.trim().toLowerCase();
    if (!keys.has(normalizedKey) && !keys.has(rawKey)) continue;
    const path = normalizeDropboxStoredPath(step.url);
    if (path) paths.push(path);
  }

  return paths;
}

/**
 * Expand a stored path for Full Dropbox vs App Folder tokens.
 * App Folder tokens cannot see `/ItConsultingMamun/...` as that root — strip it.
 */
export function expandDropboxAppFolderPathVariants(path: string): string[] {
  const normalized = normalizeDropboxStoredPath(path);
  if (!normalized) return [];

  const out: string[] = [normalized];
  const root = `/${DROPBOX_APP_FOLDER_ROOT_NAME}`;
  const lower = normalized.toLowerCase();
  const rootLower = root.toLowerCase();

  if (lower === rootLower) {
    // nothing useful
  } else if (lower.startsWith(`${rootLower}/`)) {
    const stripped = normalized.slice(root.length);
    const strippedPath = stripped.startsWith("/") ? stripped : `/${stripped}`;
    if (strippedPath.length > 1 && !out.includes(strippedPath)) {
      out.push(strippedPath);
    }
  } else {
    const prefixed = `${root}${normalized}`;
    if (!out.includes(prefixed)) out.push(prefixed);
  }

  return out;
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export interface InvoiceDropboxPathCandidateSet {
  /** Raw stored paths found (column / notes / steps), normalized. */
  storedCandidates: string[];
  /** API probe paths including App Folder variants. */
  apiCandidates: string[];
}

export function collectInvoiceDropboxPathCandidates(params: {
  kind: "pdf" | "docx";
  columnDropboxUrl?: string | null;
  columnPdfUrl?: string | null;
  metaDropboxUrl?: string | null;
  metaPdfUrl?: string | null;
  metaDocxUrl?: string | null;
  steps?: GenerationResultStep[] | null;
}): InvoiceDropboxPathCandidateSet {
  const raw: Array<string | null | undefined> = [];

  if (params.kind === "pdf") {
    raw.push(
      params.columnDropboxUrl,
      params.metaDropboxUrl,
      params.columnPdfUrl,
      params.metaPdfUrl
    );
  } else {
    raw.push(params.columnDropboxUrl, params.metaDropboxUrl, params.metaDocxUrl);
  }

  const fromValues = raw
    .map((value) => normalizeDropboxStoredPath(value))
    .filter((value): value is string => Boolean(value));

  const fromSteps = extractDropboxPathsFromSteps(params.steps, params.kind);
  const storedCandidates = uniquePreserveOrder([...fromValues, ...fromSteps]);
  const apiCandidates = uniquePreserveOrder(
    storedCandidates.flatMap((path) => expandDropboxAppFolderPathVariants(path))
  );

  return { storedCandidates, apiCandidates };
}
