import "server-only";

import type { AppSettingsFormData } from "@/lib/app-settings-shared";
import { normalizeInvoicePageSize } from "@/lib/invoices-list-query";
import type {
  Profile,
  ProfileInvoiceSettings,
  TechnicalErrorsDisplay,
} from "@/lib/types/database";

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function appSettingsFromSources(
  profile: Profile | null,
  invoiceSettings: ProfileInvoiceSettings
): AppSettingsFormData {
  const technicalDisplay =
    invoiceSettings.technical_errors_display === "admin_only" ||
    invoiceSettings.technical_errors_display === "never"
      ? invoiceSettings.technical_errors_display
      : "development";

  return {
    retry_failed_generation: invoiceSettings.retry_failed_generation ?? true,
    max_retry_attempts: readNumber(invoiceSettings.max_retry_attempts, 3),
    generation_timeout_seconds: readNumber(invoiceSettings.generation_timeout_seconds, 30),
    export_pdf: invoiceSettings.export_pdf ?? true,
    export_docx: invoiceSettings.export_docx ?? false,
    default_currency: profile?.default_currency || "EUR",
    default_invoice_language:
      invoiceSettings.default_invoice_language === "de" ? "de" : "en",
    default_payment_terms: profile?.default_payment_terms?.trim() || "",
    small_business_rule: profile?.small_business_rule ?? false,
    default_invoice_title: invoiceSettings.default_invoice_title?.trim() || "",
    notify_on_generation_failed: invoiceSettings.notify_on_generation_failed ?? true,
    notify_on_generation_success: invoiceSettings.notify_on_generation_success ?? false,
    notification_language:
      invoiceSettings.notification_language === "de" ? "de" : "en",
    abuse_protection_enabled: invoiceSettings.spam_protection_enabled ?? false,
    rate_limit_per_user: readNumber(invoiceSettings.rate_limit_per_user, 30),
    duplicate_submit_block_seconds: readNumber(
      invoiceSettings.duplicate_submit_block_seconds,
      10
    ),
    max_generations_per_hour: readNumber(invoiceSettings.max_generations_per_hour, 20),
    technical_errors_display: technicalDisplay,
    development_mode: technicalDisplay === "development",
    n8n_webhook_mode: invoiceSettings.n8n_webhook_mode === "test" ? "test" : "production",
    invoice_page_size: normalizeInvoicePageSize(invoiceSettings.invoice_page_size),
  };
}

export function invoiceSettingsFromAppForm(
  current: ProfileInvoiceSettings,
  form: AppSettingsFormData,
  updatedBy?: string | null
): ProfileInvoiceSettings {
  const technicalErrorsDisplay: TechnicalErrorsDisplay = form.development_mode
    ? "development"
    : form.technical_errors_display;

  return {
    ...current,
    n8n_webhook_mode: form.n8n_webhook_mode,
    retry_failed_generation: form.retry_failed_generation,
    max_retry_attempts: Math.max(1, Math.floor(form.max_retry_attempts)),
    generation_timeout_seconds: Math.max(5, Math.floor(form.generation_timeout_seconds)),
    technical_errors_display: technicalErrorsDisplay,
    export_pdf: form.export_pdf,
    export_docx: form.export_docx,
    default_invoice_language: form.default_invoice_language,
    default_invoice_title: form.default_invoice_title.trim() || undefined,
    notify_on_generation_failed: form.notify_on_generation_failed,
    notify_on_generation_success: form.notify_on_generation_success,
    notification_language: form.notification_language,
    spam_protection_enabled: form.abuse_protection_enabled,
    rate_limit_per_user: Math.max(1, Math.floor(form.rate_limit_per_user)),
    duplicate_submit_block_seconds: Math.max(0, Math.floor(form.duplicate_submit_block_seconds)),
    max_generations_per_hour: Math.max(1, Math.floor(form.max_generations_per_hour)),
    invoice_page_size: normalizeInvoicePageSize(form.invoice_page_size),
    app_settings_updated_at: new Date().toISOString(),
    app_settings_updated_by: updatedBy?.trim() || undefined,
  };
}
