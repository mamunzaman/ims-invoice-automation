import type {
  N8nWebhookMode,
  SupportedCurrency,
  TechnicalErrorsDisplay,
} from "@/lib/types/database";

export type ServiceHealthState = "connected" | "offline" | "unknown";

export type AppServiceKey = "automation" | "googleDocs" | "googleDrive" | "dropbox";

export type ServiceHealthMessageKey =
  | "configuredOnly"
  | "automationNotConfigured"
  | "automationIncomplete"
  | "automationReachable"
  | "automationUnavailable"
  | "automationTimeout"
  | "automationCheckFailed"
  | "integrationHealthNotConfigured"
  | "integrationHealthUnreachable"
  | "googleDocsNotConfigured"
  | "googleDocsAccessible"
  | "googleDocsAccessDenied"
  | "googleDocsCheckFailed"
  | "googleDriveNotConfigured"
  | "googleDriveAccessible"
  | "googleDriveAccessDenied"
  | "googleDriveCheckFailed"
  | "dropboxNotConfigured"
  | "dropboxConnected"
  | "dropboxAccessDenied"
  | "dropboxCheckFailed";

export interface AppServiceHealthRow {
  key: AppServiceKey;
  state: ServiceHealthState;
  messageKey: ServiceHealthMessageKey;
  message?: string | null;
}

export interface GenerationActivitySnapshot {
  timestamp: string | null;
  invoiceNumber: string | null;
}

export interface AppServiceHealthSnapshot {
  services: AppServiceHealthRow[];
  lastSuccessfulGeneration: GenerationActivitySnapshot;
  lastFailedGeneration: GenerationActivitySnapshot;
  checkedAt?: string | null;
  checkFailed?: boolean;
  checkFailureMessageKey?: ServiceHealthMessageKey;
}

export interface PersistedServiceHealthSnapshot {
  services: AppServiceHealthRow[];
  lastSuccessfulGeneration: GenerationActivitySnapshot;
  lastFailedGeneration: GenerationActivitySnapshot;
}

export type HealthCheckOverallStatus = "healthy" | "degraded" | "failed" | "request_failed";

export interface HealthCheckLogServiceResult {
  key: AppServiceKey;
  state: ServiceHealthState;
  messageKey: ServiceHealthMessageKey;
  message?: string | null;
}

export interface SystemLogEntry {
  id: string;
  checkedAt: string;
  overallStatus: HealthCheckOverallStatus;
  services: HealthCheckLogServiceResult[];
  requestFailed: boolean;
  failureMessageKey?: ServiceHealthMessageKey;
}

export interface AppSettingsFormData {
  retry_failed_generation: boolean;
  max_retry_attempts: number;
  generation_timeout_seconds: number;
  export_pdf: boolean;
  export_docx: boolean;
  default_currency: SupportedCurrency;
  default_invoice_language: "en" | "de";
  default_payment_terms: string;
  small_business_rule: boolean;
  default_invoice_title: string;
  notify_on_generation_failed: boolean;
  notify_on_generation_success: boolean;
  notification_language: "en" | "de";
  abuse_protection_enabled: boolean;
  rate_limit_per_user: number;
  duplicate_submit_block_seconds: number;
  max_generations_per_hour: number;
  technical_errors_display: TechnicalErrorsDisplay;
  development_mode: boolean;
  n8n_webhook_mode: N8nWebhookMode;
  invoice_page_size: number;
}

export interface AppSettingsPageData {
  form: AppSettingsFormData;
  technicalErrorsDisplay: TechnicalErrorsDisplay;
  health: AppServiceHealthSnapshot;
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
}

export const DEFAULT_APP_SETTINGS_FORM: AppSettingsFormData = {
  retry_failed_generation: true,
  max_retry_attempts: 3,
  generation_timeout_seconds: 30,
  export_pdf: true,
  export_docx: false,
  default_currency: "EUR",
  default_invoice_language: "en",
  default_payment_terms: "",
  small_business_rule: false,
  default_invoice_title: "",
  notify_on_generation_failed: true,
  notify_on_generation_success: false,
  notification_language: "en",
  abuse_protection_enabled: false,
  rate_limit_per_user: 30,
  duplicate_submit_block_seconds: 10,
  max_generations_per_hour: 20,
  technical_errors_display: "development",
  development_mode: true,
  n8n_webhook_mode: "production",
  invoice_page_size: 20,
};

export function serviceHealthTone(state: ServiceHealthState): "green" | "amber" | "red" {
  if (state === "connected") return "green";
  if (state === "unknown") return "amber";
  return "red";
}

export function normalizeGenerationActivity(
  value: GenerationActivitySnapshot | string | null | undefined
): GenerationActivitySnapshot {
  if (!value) {
    return { timestamp: null, invoiceNumber: null };
  }
  if (typeof value === "string") {
    return { timestamp: value, invoiceNumber: null };
  }
  return {
    timestamp: value.timestamp ?? null,
    invoiceNumber: value.invoiceNumber ?? null,
  };
}

export function normalizeAppServiceHealthSnapshot(
  health: AppServiceHealthSnapshot | null | undefined
): AppServiceHealthSnapshot {
  return {
    services: Array.isArray(health?.services) ? health.services : [],
    lastSuccessfulGeneration: normalizeGenerationActivity(health?.lastSuccessfulGeneration),
    lastFailedGeneration: normalizeGenerationActivity(health?.lastFailedGeneration),
    checkedAt: health?.checkedAt ?? null,
    checkFailed: health?.checkFailed ?? false,
    checkFailureMessageKey: health?.checkFailureMessageKey,
  };
}

export function toPersistedServiceHealthSnapshot(
  health: AppServiceHealthSnapshot
): PersistedServiceHealthSnapshot {
  return {
    services: health.services,
    lastSuccessfulGeneration: normalizeGenerationActivity(health.lastSuccessfulGeneration),
    lastFailedGeneration: normalizeGenerationActivity(health.lastFailedGeneration),
  };
}

export const HEALTH_CHECK_LOG_LIMIT = 20;

export function normalizeSystemLogEntry(value: unknown): SystemLogEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const checkedAt =
    (typeof row.checkedAt === "string" ? row.checkedAt : null) ??
    (typeof row.checked_at === "string" ? row.checked_at : null);
  const overallStatusRaw =
    (typeof row.overallStatus === "string" ? row.overallStatus : null) ??
    (typeof row.overall_status === "string" ? row.overall_status : null);
  const id = typeof row.id === "string" ? row.id : null;

  if (!id || !checkedAt || !overallStatusRaw) return null;
  if (
    overallStatusRaw !== "healthy" &&
    overallStatusRaw !== "degraded" &&
    overallStatusRaw !== "failed" &&
    overallStatusRaw !== "request_failed"
  ) {
    return null;
  }

  const servicesRaw = Array.isArray(row.services) ? row.services : [];
  const services: HealthCheckLogServiceResult[] = [];

  for (const item of servicesRaw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const service = item as Record<string, unknown>;
    const key = service.key;
    const state = service.state;
    const messageKey = service.messageKey;
    if (
      (key !== "automation" &&
        key !== "googleDocs" &&
        key !== "googleDrive" &&
        key !== "dropbox") ||
      (state !== "connected" && state !== "unknown" && state !== "offline") ||
      typeof messageKey !== "string"
    ) {
      continue;
    }
    services.push({
      key,
      state,
      messageKey: messageKey as ServiceHealthMessageKey,
      message: typeof service.message === "string" ? service.message : null,
    });
  }

  const requestFailed =
    row.requestFailed === true ||
    row.request_failed === true ||
    overallStatusRaw === "request_failed";

  const failureMessageKeyRaw =
    (typeof row.failureMessageKey === "string" ? row.failureMessageKey : null) ??
    (typeof row.failure_message_key === "string" ? row.failure_message_key : null);

  return {
    id,
    checkedAt,
    overallStatus: overallStatusRaw,
    services,
    requestFailed,
    failureMessageKey: failureMessageKeyRaw
      ? (failureMessageKeyRaw as ServiceHealthMessageKey)
      : undefined,
  };
}
