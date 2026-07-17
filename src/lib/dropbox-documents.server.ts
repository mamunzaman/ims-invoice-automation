import "server-only";

import { getOrCreateDropboxSharedLink } from "@/lib/dropbox";
import {
  resolveStoredDropboxReference,
  resolveStoredDropboxSharedUrl,
} from "@/lib/dropbox-documents";
import type { GenerationResultStep } from "@/lib/generation-status";
import { isDropboxSharedUrl, isStoredDropboxPath, resolveDropboxSharedUrl } from "@/lib/urls";

export async function ensureDropboxSharedUrl(
  directValue: string | null | undefined,
  steps: GenerationResultStep[] | null | undefined,
  kind: "pdf" | "docx"
): Promise<string | null> {
  const existing = resolveStoredDropboxSharedUrl(directValue, steps, kind);
  if (existing) return existing;

  const pathValue = isStoredDropboxPath(directValue)
    ? directValue
    : resolveStoredDropboxReference(directValue, steps, kind);

  if (!pathValue || isDropboxSharedUrl(pathValue)) {
    return resolveDropboxSharedUrl(pathValue);
  }

  try {
    return await getOrCreateDropboxSharedLink(pathValue);
  } catch {
    return null;
  }
}
