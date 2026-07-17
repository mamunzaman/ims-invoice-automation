import "server-only";

const DROPBOX_API = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT_API = "https://content.dropboxapi.com/2/files/download";

export const DROPBOX_ACCESS_TOKEN_ENV = "DROPBOX_ACCESS_TOKEN";

/** Known Dropbox app-folder root used in archived invoice paths. */
export const DROPBOX_APP_FOLDER_ROOT = "ItConsultingMamun";

export const DROPBOX_TOKEN_MISSING_MESSAGE =
  "DROPBOX_ACCESS_TOKEN is not configured. Set it in .env.local (local) or your hosting environment (production), then restart or redeploy the app.";

export class DropboxError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "DropboxError";
  }
}

export type DropboxTokenScope = "full" | "app_folder" | "unknown";

/** Server-only Dropbox API token. Never use NEXT_PUBLIC_* for this value. */
export function getDropboxAccessToken(): string | null {
  const token = process.env.DROPBOX_ACCESS_TOKEN?.trim();
  return token || null;
}

export function requireDropboxAccessToken(): string {
  const token = getDropboxAccessToken();
  if (!token) {
    throw new DropboxError(DROPBOX_TOKEN_MISSING_MESSAGE, 503);
  }
  return token;
}

export function normalizeDropboxApiPath(storedPath: string): string {
  const trimmed = storedPath.trim().replace(/\\/g, "/");
  if (!trimmed) throw new DropboxError("Dropbox path is empty.");
  if (trimmed.includes("..")) throw new DropboxError("Invalid Dropbox path.");
  if (trimmed.includes("://") || trimmed.startsWith("http")) {
    throw new DropboxError("Expected a Dropbox file path, not a URL.");
  }

  let path = trimmed.replace(/\/+/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

export function filenameFromDropboxPath(path: string): string {
  const normalized = normalizeDropboxApiPath(path);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || "document";
}

export async function getDropboxTokenScope(): Promise<DropboxTokenScope> {
  const token = requireDropboxAccessToken();

  try {
    const response = await fetch(`${DROPBOX_API}/users/get_current_account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "null",
      cache: "no-store",
    });

    if (!response.ok) return "unknown";

    const body = (await response.json()) as {
      root_info?: { ".tag"?: string };
    };
    const tag = body.root_info?.[".tag"];
    if (tag === "app") return "app_folder";
    if (tag === "user") return "full";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function getDropboxFileMetadata(path: string): Promise<{
  exists: boolean;
  path: string;
  name: string | null;
  tag: "file" | "folder" | "deleted" | "missing" | "error";
  errorSummary?: string;
}> {
  const token = requireDropboxAccessToken();
  const apiPath = normalizeDropboxApiPath(path);

  const response = await fetch(`${DROPBOX_API}/files/get_metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: apiPath,
      include_deleted: false,
    }),
    cache: "no-store",
  });

  const text = await response.text();
  let body: {
    ".tag"?: string;
    name?: string;
    error_summary?: string;
    error?: { ".tag"?: string };
  } = {};
  try {
    body = text ? (JSON.parse(text) as typeof body) : {};
  } catch {
    body = {};
  }

  if (response.ok) {
    const tag = body[".tag"];
    if (tag === "file") {
      return {
        exists: true,
        path: apiPath,
        name: body.name?.trim() || null,
        tag: "file",
      };
    }
    if (tag === "folder") {
      return { exists: false, path: apiPath, name: body.name?.trim() || null, tag: "folder" };
    }
    if (tag === "deleted") {
      return { exists: false, path: apiPath, name: null, tag: "deleted" };
    }
  }

  const summary = body.error_summary || body.error?.[".tag"] || text.slice(0, 200);
  return {
    exists: false,
    path: apiPath,
    name: null,
    tag: "missing",
    errorSummary: summary || undefined,
  };
}

/**
 * Probe candidates with files/get_metadata and return the first existing file path.
 * Never logs or returns the access token.
 */
export async function resolveExistingDropboxFilePath(candidates: string[]): Promise<{
  path: string | null;
  name: string | null;
  attemptedPaths: string[];
  tokenScope: DropboxTokenScope;
}> {
  const tokenScope = await getDropboxTokenScope();
  const attemptedPaths: string[] = [];

  for (const candidate of candidates) {
    let apiPath: string;
    try {
      apiPath = normalizeDropboxApiPath(candidate);
    } catch {
      continue;
    }
    if (attemptedPaths.includes(apiPath)) continue;
    attemptedPaths.push(apiPath);

    const meta = await getDropboxFileMetadata(apiPath);
    if (meta.exists && meta.tag === "file") {
      return {
        path: meta.path,
        name: meta.name,
        attemptedPaths,
        tokenScope,
      };
    }
  }

  return {
    path: null,
    name: null,
    attemptedPaths,
    tokenScope,
  };
}

export async function downloadDropboxFile(path: string): Promise<{
  data: ArrayBuffer;
  filename: string;
  contentType: string | null;
}> {
  const token = requireDropboxAccessToken();
  const apiPath = normalizeDropboxApiPath(path);

  const response = await fetch(DROPBOX_CONTENT_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path: apiPath }),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new DropboxError(
      `Dropbox download failed (${response.status}): ${details.slice(0, 300)}`,
      response.status
    );
  }

  let filename = filenameFromDropboxPath(apiPath);
  const apiResultHeader = response.headers.get("dropbox-api-result");
  if (apiResultHeader) {
    try {
      const metadata = JSON.parse(apiResultHeader) as { name?: string };
      if (metadata.name?.trim()) {
        filename = metadata.name.trim();
      }
    } catch {
      // Keep path-derived filename.
    }
  }

  return {
    data: await response.arrayBuffer(),
    filename,
    contentType: response.headers.get("content-type"),
  };
}

function extractSharedLinkUrl(payload: { url?: string; links?: Array<{ url?: string }> }): string | null {
  return payload.url?.trim() || payload.links?.[0]?.url?.trim() || null;
}

function isSharedLinkAlreadyExistsError(error: unknown): boolean {
  const text = JSON.stringify(error).toLowerCase();
  return text.includes("shared_link_already_exists");
}

async function createSharedLink(token: string, path: string): Promise<string> {
  const response = await fetch(`${DROPBOX_API}/sharing/create_shared_link_with_settings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: normalizeDropboxApiPath(path),
      settings: {
        requested_visibility: { ".tag": "public" },
        audience: { ".tag": "public" },
        access: { ".tag": "viewer" },
      },
    }),
  });

  const body = (await response.json()) as { url?: string; error_summary?: string };
  if (!response.ok) {
    throw new DropboxError(body.error_summary || `Dropbox shared link failed (${response.status})`, response.status);
  }

  const url = extractSharedLinkUrl(body);
  if (!url) throw new DropboxError(`Dropbox did not return a shared link for ${path}`);
  return url;
}

async function listSharedLinks(token: string, path: string): Promise<string> {
  const response = await fetch(`${DROPBOX_API}/sharing/list_shared_links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: normalizeDropboxApiPath(path),
      direct_only: true,
    }),
  });

  const body = (await response.json()) as { links?: Array<{ url?: string }>; error_summary?: string };
  if (!response.ok) {
    throw new DropboxError(body.error_summary || `Dropbox list shared links failed (${response.status})`, response.status);
  }

  const url = extractSharedLinkUrl(body);
  if (!url) throw new DropboxError(`No existing shared link found for ${path}`);
  return url;
}

export async function getOrCreateDropboxSharedLink(path: string): Promise<string> {
  const token = requireDropboxAccessToken();

  try {
    return await createSharedLink(token, path);
  } catch (error) {
    if (!isSharedLinkAlreadyExistsError(error)) throw error;
    return listSharedLinks(token, path);
  }
}

const DROPBOX_HEALTH_CHECK_TIMEOUT_MS = 10_000;

export type DropboxHealthProbeState = "connected" | "offline" | "unknown";

export interface DropboxHealthProbeResult {
  state: DropboxHealthProbeState;
  messageKey:
    | "dropboxNotConfigured"
    | "dropboxConnected"
    | "dropboxAccessDenied"
    | "dropboxCheckFailed";
}

export async function probeDropboxHealth(): Promise<DropboxHealthProbeResult> {
  const token = getDropboxAccessToken();
  if (!token) {
    return { state: "offline", messageKey: "dropboxNotConfigured" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DROPBOX_HEALTH_CHECK_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${DROPBOX_API}/users/get_current_account`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "null",
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      return { state: "connected", messageKey: "dropboxConnected" };
    }
    if (response.status === 401 || response.status === 403) {
      return { state: "offline", messageKey: "dropboxAccessDenied" };
    }
    return { state: "unknown", messageKey: "dropboxCheckFailed" };
  } catch {
    return { state: "unknown", messageKey: "dropboxCheckFailed" };
  }
}
