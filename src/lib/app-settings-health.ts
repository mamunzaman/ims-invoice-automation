import "server-only";

import { fetchN8nHealthCheck, type N8nHealthServiceResult } from "@/lib/n8n-health.server";
import type { ProfileInvoiceSettings } from "@/lib/types/database";
import type {
  AppServiceHealthRow,
  AppServiceHealthSnapshot,
  AppServiceKey,
  GenerationActivitySnapshot,
  HealthCheckOverallStatus,
  PersistedServiceHealthSnapshot,
  ServiceHealthMessageKey,
  ServiceHealthState,
  SystemLogEntry,
} from "@/lib/app-settings-shared";
import {
  HEALTH_CHECK_LOG_LIMIT,
  normalizeAppServiceHealthSnapshot,
  normalizeGenerationActivity,
  normalizeSystemLogEntry,
  toPersistedServiceHealthSnapshot,
} from "@/lib/app-settings-shared";

export type {
  AppServiceHealthRow,
  AppServiceHealthSnapshot,
  AppServiceKey,
  GenerationActivitySnapshot,
  ServiceHealthMessageKey,
  ServiceHealthState,
  SystemLogEntry,
} from "@/lib/app-settings-shared";

export interface AppServiceHealthCheckResult {
  requestFailed: boolean;
  failureMessageKey?: ServiceHealthMessageKey;
  services: AppServiceHealthRow[];
  lastSuccessfulGeneration: GenerationActivitySnapshot;
  lastFailedGeneration: GenerationActivitySnapshot;
}

function hasAutomationConfig(): boolean {
  const url = process.env.N8N_INVOICE_WEBHOOK_URL?.trim();
  const secret = process.env.N8N_INVOICE_SECRET?.trim();
  return Boolean(url && secret);
}

function hasPartialAutomationConfig(): boolean {
  return Boolean(
    process.env.N8N_INVOICE_WEBHOOK_URL?.trim() || process.env.N8N_INVOICE_SECRET?.trim()
  );
}

function hasIntegrationHealthEndpoint(): boolean {
  return Boolean(process.env.N8N_HEALTH_WEBHOOK_URL?.trim());
}

function fallbackMessageKeyForState(
  key: AppServiceKey,
  state: N8nHealthServiceResult["state"]
): ServiceHealthMessageKey {
  if (key === "automation") {
    if (state === "connected") return "automationReachable";
    if (state === "offline") return "automationUnavailable";
    return "automationCheckFailed";
  }
  if (key === "googleDocs") {
    if (state === "connected") return "googleDocsAccessible";
    if (state === "offline") return "googleDocsAccessDenied";
    return "googleDocsCheckFailed";
  }
  if (key === "googleDrive") {
    if (state === "connected") return "googleDriveAccessible";
    if (state === "offline") return "googleDriveAccessDenied";
    return "googleDriveCheckFailed";
  }
  if (state === "connected") return "dropboxConnected";
  if (state === "offline") return "dropboxAccessDenied";
  return "dropboxCheckFailed";
}

function buildOfflineServiceRows(messageKey: ServiceHealthMessageKey): AppServiceHealthRow[] {
  const keys: AppServiceKey[] = ["automation", "googleDocs", "googleDrive", "dropbox"];
  return keys.map((key) => ({
    key,
    state: "offline",
    messageKey,
  }));
}

function mapLiveServiceRow(
  key: AppServiceKey,
  service: N8nHealthServiceResult
): AppServiceHealthRow {
  return {
    key,
    state: service.state,
    messageKey: fallbackMessageKeyForState(key, service.state),
    message: service.message,
  };
}

function resolveGoogleDocsStatic(settings: ProfileInvoiceSettings): AppServiceHealthRow {
  const configured = Boolean(settings.google_template_doc_id?.trim());
  return {
    key: "googleDocs",
    state: configured ? "unknown" : "offline",
    messageKey: configured
      ? hasIntegrationHealthEndpoint()
        ? "configuredOnly"
        : "integrationHealthNotConfigured"
      : "googleDocsNotConfigured",
  };
}

function resolveGoogleDriveStatic(settings: ProfileInvoiceSettings): AppServiceHealthRow {
  const configured = Boolean(
    settings.google_docs_folder_id?.trim() || settings.pdf_folder_id?.trim()
  );
  return {
    key: "googleDrive",
    state: configured ? "unknown" : "offline",
    messageKey: configured
      ? hasIntegrationHealthEndpoint()
        ? "configuredOnly"
        : "integrationHealthNotConfigured"
      : "googleDriveNotConfigured",
  };
}

function resolveDropboxStatic(settings: ProfileInvoiceSettings): AppServiceHealthRow {
  const configured = Boolean(settings.dropbox_archive_folder_id?.trim());
  return {
    key: "dropbox",
    state: configured ? "unknown" : "offline",
    messageKey: configured
      ? hasIntegrationHealthEndpoint()
        ? "configuredOnly"
        : "integrationHealthNotConfigured"
      : "dropboxNotConfigured",
  };
}

export function resolveAppServiceHealth(
  settings: ProfileInvoiceSettings
): AppServiceHealthRow[] {
  const automationState: ServiceHealthState = hasAutomationConfig()
    ? "unknown"
    : hasPartialAutomationConfig()
      ? "unknown"
      : "offline";
  const automationMessageKey: ServiceHealthMessageKey = hasAutomationConfig()
    ? "configuredOnly"
    : hasPartialAutomationConfig()
      ? "automationIncomplete"
      : "automationNotConfigured";

  return [
    { key: "automation", state: automationState, messageKey: automationMessageKey },
    resolveGoogleDocsStatic(settings),
    resolveGoogleDriveStatic(settings),
    resolveDropboxStatic(settings),
  ];
}

export async function performAppServiceHealthCheck(): Promise<AppServiceHealthCheckResult> {
  const result = await fetchN8nHealthCheck();

  if (!result.ok) {
    return {
      requestFailed: true,
      failureMessageKey: result.messageKey,
      services: buildOfflineServiceRows(result.messageKey),
      lastSuccessfulGeneration: { timestamp: null, invoiceNumber: null },
      lastFailedGeneration: { timestamp: null, invoiceNumber: null },
    };
  }

  return {
    requestFailed: false,
    services: [
      mapLiveServiceRow("automation", result.services.automation),
      mapLiveServiceRow("googleDocs", result.services.googleDocs),
      mapLiveServiceRow("googleDrive", result.services.googleDrive),
      mapLiveServiceRow("dropbox", result.services.dropbox),
    ],
    lastSuccessfulGeneration: result.lastSuccessfulGeneration,
    lastFailedGeneration: result.lastFailedGeneration,
  };
}

const SERVICE_KEYS: AppServiceKey[] = ["automation", "googleDocs", "googleDrive", "dropbox"];

function isValidServiceKey(value: unknown): value is AppServiceKey {
  return typeof value === "string" && SERVICE_KEYS.includes(value as AppServiceKey);
}

function isValidServiceState(value: unknown): value is ServiceHealthState {
  return value === "connected" || value === "unknown" || value === "offline";
}

function normalizePersistedServiceRow(value: unknown): AppServiceHealthRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!isValidServiceKey(row.key) || !isValidServiceState(row.state)) return null;
  if (typeof row.messageKey !== "string") return null;
  return {
    key: row.key,
    state: row.state,
    messageKey: row.messageKey as ServiceHealthMessageKey,
    message: typeof row.message === "string" ? row.message : null,
  };
}

export function readPersistedServiceHealth(
  settings: ProfileInvoiceSettings
): AppServiceHealthSnapshot | null {
  const checkedAt = settings.service_health_checked_at?.trim();
  const snapshot = settings.service_health_snapshot;
  if (!checkedAt || !snapshot) return null;

  const services = Array.isArray(snapshot.services)
    ? snapshot.services
        .map(normalizePersistedServiceRow)
        .filter((row): row is AppServiceHealthRow => row !== null)
    : [];

  if (services.length === 0) return null;

  return normalizeAppServiceHealthSnapshot({
    services,
    lastSuccessfulGeneration: normalizeGenerationActivity(
      snapshot.lastSuccessfulGeneration as GenerationActivitySnapshot | null | undefined
    ),
    lastFailedGeneration: normalizeGenerationActivity(
      snapshot.lastFailedGeneration as GenerationActivitySnapshot | null | undefined
    ),
    checkedAt,
    checkFailed: false,
  });
}

export function buildPersistedServiceHealthUpdate(
  health: AppServiceHealthSnapshot,
  checkedAt: string
): Pick<ProfileInvoiceSettings, "service_health_checked_at" | "service_health_snapshot"> {
  const persisted: PersistedServiceHealthSnapshot = toPersistedServiceHealthSnapshot(health);
  return {
    service_health_checked_at: checkedAt,
    service_health_snapshot: persisted,
  };
}

export function deriveHealthCheckOverallStatus(
  services: AppServiceHealthRow[],
  requestFailed: boolean
): HealthCheckOverallStatus {
  if (requestFailed) return "request_failed";
  if (services.length === 0) return "failed";

  const connectedCount = services.filter((service) => service.state === "connected").length;
  if (connectedCount === services.length) return "healthy";
  if (connectedCount === 0) return "failed";
  return "degraded";
}

export function buildHealthCheckLogEntry(params: {
  checkedAt: string;
  services: AppServiceHealthRow[];
  requestFailed: boolean;
  failureMessageKey?: ServiceHealthMessageKey;
}): SystemLogEntry {
  return {
    id: crypto.randomUUID(),
    checkedAt: params.checkedAt,
    overallStatus: deriveHealthCheckOverallStatus(params.services, params.requestFailed),
    services: params.services.map((service) => ({
      key: service.key,
      state: service.state,
      messageKey: service.messageKey,
      message: service.message ?? null,
    })),
    requestFailed: params.requestFailed,
    failureMessageKey: params.failureMessageKey,
  };
}

export function readPersistedHealthCheckLog(settings: ProfileInvoiceSettings): SystemLogEntry[] {
  const raw = settings.service_health_log;
  if (!Array.isArray(raw)) return [];

  return raw
    .map(normalizeSystemLogEntry)
    .filter((entry): entry is SystemLogEntry => entry !== null)
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
    .slice(0, HEALTH_CHECK_LOG_LIMIT);
}

export function appendPersistedHealthCheckLog(
  settings: ProfileInvoiceSettings,
  entry: SystemLogEntry
): SystemLogEntry[] {
  return [entry, ...readPersistedHealthCheckLog(settings)].slice(0, HEALTH_CHECK_LOG_LIMIT);
}

export function buildPersistedHealthCheckLogUpdate(
  settings: ProfileInvoiceSettings,
  entry: SystemLogEntry
): Pick<ProfileInvoiceSettings, "service_health_log"> {
  return {
    service_health_log: appendPersistedHealthCheckLog(settings, entry),
  };
}
