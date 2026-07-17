"use server";

import { revalidatePath } from "next/cache";
import { getInvoiceAdminSettings, updateInvoiceAdminSettings } from "@/lib/actions/invoice-admin";
import { getSettings, updateSettings } from "@/lib/actions/settings";
import {
  normalizeAppServiceHealthSnapshot,
  type AppSettingsFormData,
  type AppSettingsPageData,
  type GenerationActivitySnapshot,
  type SystemLogEntry,
} from "@/lib/app-settings-shared";
import {
  appSettingsFromSources,
  invoiceSettingsFromAppForm,
} from "@/lib/app-settings.server";
import {
  buildHealthCheckLogEntry,
  buildPersistedHealthCheckLogUpdate,
  buildPersistedServiceHealthUpdate,
  performAppServiceHealthCheck,
  readPersistedHealthCheckLog,
  readPersistedServiceHealth,
  resolveAppServiceHealth,
  type AppServiceHealthSnapshot,
} from "@/lib/app-settings-health";
import { createClient } from "@/lib/supabase/server";
import type { TechnicalErrorsDisplay } from "@/lib/types/database";

const EMPTY_ACTIVITY: GenerationActivitySnapshot = {
  timestamp: null,
  invoiceNumber: null,
};

async function fetchGenerationActivity(userId: string): Promise<{
  lastSuccessfulGeneration: GenerationActivitySnapshot;
  lastFailedGeneration: GenerationActivitySnapshot;
}> {
  const supabase = await createClient();

  const [{ data: successRows }, { data: failedRows }] = await Promise.all([
    supabase
      .from("invoices")
      .select("invoice_number, generated_at, updated_at")
      .eq("user_id", userId)
      .eq("generation_status", "COMPLETED")
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("invoices")
      .select("invoice_number, updated_at")
      .eq("user_id", userId)
      .eq("generation_status", "FAILED")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const successRow = successRows?.[0];
  const failedRow = failedRows?.[0];

  return {
    lastSuccessfulGeneration: successRow
      ? {
          timestamp: successRow.generated_at ?? successRow.updated_at ?? null,
          invoiceNumber: successRow.invoice_number ?? null,
        }
      : EMPTY_ACTIVITY,
    lastFailedGeneration: failedRow
      ? {
          timestamp: failedRow.updated_at ?? null,
          invoiceNumber: failedRow.invoice_number ?? null,
        }
      : EMPTY_ACTIVITY,
  };
}

async function buildHealthSnapshot(
  invoiceSettings: Awaited<ReturnType<typeof getInvoiceAdminSettings>>,
  userId: string,
  options?: { liveChecks?: boolean }
): Promise<AppServiceHealthSnapshot> {
  const persisted = readPersistedServiceHealth(invoiceSettings);
  const activity = await fetchGenerationActivity(userId);

  if (options?.liveChecks) {
    const live = await performAppServiceHealthCheck();
    const checkedAt = new Date().toISOString();
    const logEntry = buildHealthCheckLogEntry({
      checkedAt,
      services: live.services,
      requestFailed: live.requestFailed,
      failureMessageKey: live.failureMessageKey,
    });
    const logUpdate = buildPersistedHealthCheckLogUpdate(invoiceSettings, logEntry);

    if (live.requestFailed) {
      await updateInvoiceAdminSettings(logUpdate);

      if (persisted) {
        return normalizeAppServiceHealthSnapshot({
          services: persisted.services,
          lastSuccessfulGeneration: persisted.lastSuccessfulGeneration,
          lastFailedGeneration: persisted.lastFailedGeneration,
          checkedAt: persisted.checkedAt ?? null,
          checkFailed: true,
          checkFailureMessageKey: live.failureMessageKey,
        });
      }

      return normalizeAppServiceHealthSnapshot({
        services: live.services,
        lastSuccessfulGeneration: activity.lastSuccessfulGeneration,
        lastFailedGeneration: activity.lastFailedGeneration,
        checkedAt: null,
        checkFailed: true,
        checkFailureMessageKey: live.failureMessageKey,
      });
    }

    const snapshot = normalizeAppServiceHealthSnapshot({
      services: live.services,
      lastSuccessfulGeneration: live.lastSuccessfulGeneration,
      lastFailedGeneration: live.lastFailedGeneration,
      checkedAt,
      checkFailed: false,
    });

    await updateInvoiceAdminSettings({
      ...buildPersistedServiceHealthUpdate(snapshot, checkedAt),
      ...logUpdate,
    });

    return snapshot;
  }

  if (persisted) {
    return persisted;
  }

  return normalizeAppServiceHealthSnapshot({
    services: resolveAppServiceHealth(invoiceSettings),
    ...activity,
    checkedAt: null,
    checkFailed: false,
  });
}

export async function getAppSettingsPageData(): Promise<AppSettingsPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getSettings();
  if (!profile) return null;

  const invoiceSettings = await getInvoiceAdminSettings();
  const form = appSettingsFromSources(profile, invoiceSettings);
  const health = await buildHealthSnapshot(invoiceSettings, user.id);

  return {
    form,
    technicalErrorsDisplay: form.technical_errors_display,
    health,
    lastUpdatedAt: invoiceSettings.app_settings_updated_at ?? null,
    lastUpdatedBy: invoiceSettings.app_settings_updated_by ?? null,
  };
}

export async function checkAppServices(): Promise<AppServiceHealthSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const invoiceSettings = await getInvoiceAdminSettings();
  return buildHealthSnapshot(invoiceSettings, user.id, { liveChecks: true });
}

export async function getAppSystemLog(): Promise<SystemLogEntry[]> {
  const invoiceSettings = await getInvoiceAdminSettings();
  return readPersistedHealthCheckLog(invoiceSettings);
}

export async function getTechnicalErrorsDisplaySetting(): Promise<TechnicalErrorsDisplay> {
  const invoiceSettings = await getInvoiceAdminSettings();
  const mode = invoiceSettings.technical_errors_display;
  if (mode === "admin_only" || mode === "never" || mode === "development") {
    return mode;
  }
  return "development";
}

export async function updateAppSettings(form: AppSettingsFormData) {
  const profile = await getSettings();
  if (!profile) return { success: false as const, errors: ["NOT_AUTHENTICATED"] };

  const currentInvoiceSettings = await getInvoiceAdminSettings();
  const updatedBy = profile.email || profile.sender_name || null;
  const invoiceSettings = invoiceSettingsFromAppForm(currentInvoiceSettings, form, updatedBy);

  const invoiceResult = await updateInvoiceAdminSettings(invoiceSettings);
  if (!invoiceResult.success) return invoiceResult;

  const profileResult = await updateSettings({
    sender_name: profile.sender_name || "",
    sender_address: profile.sender_address || "",
    email: profile.email || "",
    phone: profile.phone || "",
    tax_number: profile.tax_number || "",
    default_payment_terms: form.default_payment_terms.trim(),
    small_business_rule: form.small_business_rule,
    default_currency: form.default_currency,
    customer_address_scope: profile.customer_address_scope || "DE",
  });

  if (!profileResult.success) return profileResult;

  revalidatePath("/settings");
  revalidatePath("/settings/app");
  revalidatePath("/invoices/new");
  return {
    success: true as const,
    updatedAt: invoiceSettings.app_settings_updated_at ?? new Date().toISOString(),
    updatedBy: invoiceSettings.app_settings_updated_by ?? updatedBy ?? null,
  };
}
