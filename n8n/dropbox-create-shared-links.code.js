/**
 * n8n Code node — place AFTER Dropbox PDF/DOCX upload nodes, BEFORE "Respond to Webhook".
 *
 * Workflow nodes (add or update):
 *   1. [existing] Upload PDF to Dropbox archive → outputs `dropbox_pdf_path`
 *   2. [existing] Upload DOCX to Dropbox archive → outputs `dropbox_docx_path`
 *   3. [NEW] Code — "Create Dropbox Shared Links" (this file)
 *   4. [existing] Code — respond-to-webhook.code.js
 *   5. [existing] Respond to Webhook
 *
 * Environment (n8n Settings → Variables):
 *   DROPBOX_ACCESS_TOKEN — Dropbox API token with files.content.read + sharing.write
 *
 * Dropbox API calls (server-side in n8n only):
 *   POST https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings
 *   POST https://api.dropboxapi.com/2/sharing/list_shared_links   (when link already exists)
 *
 * Supabase fields written by the app from the webhook response:
 *   dropbox_pdf_url = https://www.dropbox.com/s/...
 *   dropbox_docx_url = https://www.dropbox.com/s/...
 */

function readToken() {
  const token = $env.DROPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("DROPBOX_ACCESS_TOKEN is not configured in n8n.");
  }
  return token;
}

function isDropboxPath(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  return trimmed.includes("/");
}

function isDropboxSharedUrl(value) {
  if (!value || typeof value !== "string") return false;
  return /^https:\/\/(www\.)?dropbox\.com\//i.test(value.trim());
}

function normalizeDropboxPath(value) {
  const trimmed = String(value).trim();
  if (!trimmed) throw new Error("Dropbox path is empty.");
  if (trimmed.includes("..")) throw new Error(`Invalid Dropbox path: ${trimmed}`);
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function extractSharedLinkUrl(payload) {
  return payload?.url || payload?.links?.[0]?.url || null;
}

function isSharedLinkAlreadyExistsError(error) {
  const summary = String(error?.errorSummary || error?.message || error || "").toLowerCase();
  const tag = String(error?.error?.[".tag"] || error?.body?.error?.[".tag"] || "").toLowerCase();
  return summary.includes("shared_link_already_exists") || tag === "shared_link_already_exists";
}

async function createSharedLink(token, path) {
  return this.helpers.httpRequest({
    method: "POST",
    url: "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: {
      path: normalizeDropboxPath(path),
      settings: {
        requested_visibility: { ".tag": "public" },
        audience: { ".tag": "public" },
        access: { ".tag": "viewer" },
      },
    },
    json: true,
  });
}

async function listSharedLinks(token, path) {
  return this.helpers.httpRequest({
    method: "POST",
    url: "https://api.dropboxapi.com/2/sharing/list_shared_links",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: {
      path: normalizeDropboxPath(path),
      direct_only: true,
    },
    json: true,
  });
}

async function getOrCreateSharedLink(token, path) {
  try {
    const created = await createSharedLink.call(this, token, path);
    const url = extractSharedLinkUrl(created);
    if (!url) throw new Error(`Dropbox did not return a shared link for ${path}`);
    return url;
  } catch (error) {
    if (!isSharedLinkAlreadyExistsError(error)) {
      throw error;
    }

    const listed = await listSharedLinks.call(this, token, path);
    const url = extractSharedLinkUrl(listed);
    if (!url) {
      throw new Error(`Shared link already exists for ${path}, but list_shared_links returned none.`);
    }
    return url;
  }
}

async function resolveDropboxSharedUrl(token, pathValue, existingUrlValue) {
  if (isDropboxSharedUrl(existingUrlValue)) {
    return existingUrlValue.trim();
  }

  if (!isDropboxPath(pathValue)) {
    return isDropboxSharedUrl(existingUrlValue) ? existingUrlValue.trim() : null;
  }

  return getOrCreateSharedLink.call(this, token, pathValue);
}

const token = readToken();
const output = { ...$json };

const pdfPath = output.dropbox_pdf_path || (isDropboxPath(output.dropbox_pdf_url) ? output.dropbox_pdf_url : null);
const docxPath = output.dropbox_docx_path || (isDropboxPath(output.dropbox_docx_url) ? output.dropbox_docx_url : null);

if (pdfPath || isDropboxSharedUrl(output.dropbox_pdf_url)) {
  output.dropbox_pdf_url = await resolveDropboxSharedUrl.call(
    this,
    token,
    pdfPath,
    output.dropbox_pdf_url
  );
}

if (docxPath || isDropboxSharedUrl(output.dropbox_docx_url)) {
  output.dropbox_docx_url = await resolveDropboxSharedUrl.call(
    this,
    token,
    docxPath,
    output.dropbox_docx_url
  );
}

return { json: output };
