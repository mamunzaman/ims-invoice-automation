import "server-only";

import type { GenerationActivitySnapshot } from "@/lib/app-settings-shared";

const N8N_HEALTH_CHECK_TIMEOUT_MS = 10_000;

export type N8nHealthProbeState = "connected" | "offline" | "unknown";

const EMPTY_ACTIVITY: GenerationActivitySnapshot = {
  timestamp: null,
  invoiceNumber: null,
};

export interface N8nHealthServiceResult {
  state: N8nHealthProbeState;
  message: string | null;
}

export type N8nHealthCheckFailureMessageKey =
  | "integrationHealthNotConfigured"
  | "automationIncomplete"
  | "integrationHealthUnreachable";

export interface N8nHealthCheckSuccess {
  ok: true;
  services: {
    automation: N8nHealthServiceResult;
    googleDocs: N8nHealthServiceResult;
    googleDrive: N8nHealthServiceResult;
    dropbox: N8nHealthServiceResult;
  };
  lastSuccessfulGeneration: GenerationActivitySnapshot;
  lastFailedGeneration: GenerationActivitySnapshot;
}

export interface N8nHealthCheckFailure {
  ok: false;
  messageKey: N8nHealthCheckFailureMessageKey;
}

export type N8nHealthCheckResult = N8nHealthCheckSuccess | N8nHealthCheckFailure;

function isN8nWebhookUnavailableResponse(statusCode: number, responseBody: string): boolean {
  if (statusCode !== 404) {
    return false;
  }

  const normalized = responseBody.toLowerCase();

  return (
    normalized.includes("webhook is not registered") ||
    normalized.includes("requested webhook is not registered") ||
    normalized.includes("webhook not found") ||
    normalized.includes("webhook does not exist") ||
    normalized.includes("not currently registered") ||
    normalized.includes("test webhook")
  );
}

function stateFromStatusString(value: string): N8nHealthProbeState | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "connected" || normalized === "ok" || normalized === "online") {
    return "connected";
  }
  if (normalized === "offline" || normalized === "error" || normalized === "failed") {
    return "offline";
  }
  if (normalized === "unknown") {
    return "unknown";
  }
  return null;
}

function parseServiceEntry(value: unknown): N8nHealthServiceResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { state: "unknown", message: null };
  }

  const record = value as Record<string, unknown>;
  let state: N8nHealthProbeState = "unknown";

  if (typeof record.connected === "boolean") {
    state = record.connected ? "connected" : "offline";
  } else if (typeof record.status === "string") {
    state = stateFromStatusString(record.status) ?? "unknown";
  }

  const message = typeof record.message === "string" ? record.message.trim() || null : null;

  return { state, message };
}

function readServiceEntry(
  services: Record<string, unknown>,
  keys: string[]
): N8nHealthServiceResult {
  for (const key of keys) {
    if (key in services) {
      return parseServiceEntry(services[key]);
    }
  }
  return { state: "unknown", message: null };
}

function parseActivityTimestamp(value: unknown): GenerationActivitySnapshot {
  if (value === null || value === undefined) {
    return EMPTY_ACTIVITY;
  }
  if (typeof value === "string") {
    return {
      timestamp: value.trim() || null,
      invoiceNumber: null,
    };
  }
  return EMPTY_ACTIVITY;
}

function parseN8nHealthCheckPayload(raw: unknown): N8nHealthCheckSuccess | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  const servicesRaw = payload.services;

  if (!servicesRaw || typeof servicesRaw !== "object" || Array.isArray(servicesRaw)) {
    return null;
  }

  const services = servicesRaw as Record<string, unknown>;

  return {
    ok: true,
    services: {
      automation: readServiceEntry(services, ["automation"]),
      googleDocs: readServiceEntry(services, ["google_docs", "googleDocs"]),
      googleDrive: readServiceEntry(services, ["google_drive", "googleDrive"]),
      dropbox: readServiceEntry(services, ["dropbox"]),
    },
    lastSuccessfulGeneration: parseActivityTimestamp(
      payload.last_successful_generation ?? payload.lastSuccessfulGeneration
    ),
    lastFailedGeneration: parseActivityTimestamp(
      payload.last_failed_generation ?? payload.lastFailedGeneration
    ),
  };
}

export async function fetchN8nHealthCheck(): Promise<N8nHealthCheckResult> {
  const healthUrl = process.env.N8N_HEALTH_WEBHOOK_URL?.trim();
  const secret = process.env.N8N_INVOICE_SECRET?.trim();

  if (!healthUrl) {
    return { ok: false, messageKey: "integrationHealthNotConfigured" };
  }
  if (!secret) {
    return { ok: false, messageKey: "automationIncomplete" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_HEALTH_CHECK_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(healthUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-invoice-secret": secret,
        },
        body: JSON.stringify({ type: "health_check" }),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const text = await response.text();

    if (
      !response.ok ||
      response.status === 404 ||
      isN8nWebhookUnavailableResponse(response.status, text)
    ) {
      return { ok: false, messageKey: "integrationHealthUnreachable" };
    }

    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, messageKey: "integrationHealthUnreachable" };
    }

    const mapped = parseN8nHealthCheckPayload(parsed);
    if (!mapped) {
      return { ok: false, messageKey: "integrationHealthUnreachable" };
    }

    return mapped;
  } catch {
    return { ok: false, messageKey: "integrationHealthUnreachable" };
  }
}
