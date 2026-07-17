"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Box,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { PageShell } from "@/components/layout/PageShell";
import { SectionCard } from "@/components/layout/SectionCard";
import { InvoiceErrorAlert } from "@/components/invoices/InvoiceErrorAlert";
import { AppSettingsStatusCard } from "@/components/settings/AppSettingsStatusCard";
import { HealthSystemLog } from "@/components/settings/HealthSystemLog";
import {
  ImsAlert,
  ImsButton,
  ImsCheckboxCard,
  ImsSelect,
  ImsTextField,
} from "@/components/forms/ims";
import {
  checkAppServices,
  getAppSystemLog,
  updateAppSettings,
} from "@/lib/actions/app-settings";
import type { AppSettingsFormData, AppSettingsPageData } from "@/lib/app-settings-shared";
import {
  normalizeAppServiceHealthSnapshot,
  normalizeGenerationActivity,
  type GenerationActivitySnapshot,
  type SystemLogEntry,
} from "@/lib/app-settings-shared";
import { INVOICE_PAGE_SIZE_OPTIONS } from "@/lib/invoices-list-query";
import { CURRENCY_OPTIONS } from "@/lib/settings-constants";
import { imsColors } from "@/theme/imsTheme";

interface AppSettingsFormProps {
  initialData: AppSettingsPageData;
}

export function AppSettingsForm({ initialData }: AppSettingsFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("appSettings");
  const tNav = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const tCurrency = useTranslations("currency");

  const [form, setForm] = useState<AppSettingsFormData>(initialData.form);
  const [baseline, setBaseline] = useState<AppSettingsFormData>(initialData.form);
  const [health, setHealth] = useState(() => normalizeAppServiceHealthSnapshot(initialData.health));
  const [lastUpdatedAt, setLastUpdatedAt] = useState(initialData.lastUpdatedAt);
  const [lastUpdatedBy, setLastUpdatedBy] = useState(initialData.lastUpdatedBy);
  const [technicalDetails, setTechnicalDetails] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingServices, setCheckingServices] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<SystemLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const displayedLastUpdatedAt = lastUpdatedAt ?? initialData.lastUpdatedAt;
  const displayedLastUpdatedBy = lastUpdatedBy ?? initialData.lastUpdatedBy;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale]
  );

  function formatTimestamp(value: string | null | undefined) {
    if (!value) return t("status.never");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("status.never");
    return dateFormatter.format(date);
  }

  function formatGenerationActivity(entry: GenerationActivitySnapshot | string | null | undefined) {
    const normalized = normalizeGenerationActivity(entry);
    if (!normalized.timestamp) return t("status.never");
    const formatted = formatTimestamp(normalized.timestamp);
    return normalized.invoiceNumber ? `${formatted} · ${normalized.invoiceNumber}` : formatted;
  }

  function updateField<K extends keyof AppSettingsFormData>(key: K, value: AppSettingsFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function handleCancel() {
    setForm(baseline);
    setTechnicalDetails(null);
    setSaveFailed(false);
    setSuccess(false);
  }

  async function handleCheckServices() {
    if (checkingServices) return;
    setCheckingServices(true);
    try {
      const snapshot = await checkAppServices();
      if (snapshot) setHealth(normalizeAppServiceHealthSnapshot(snapshot));
      if (logOpen) {
        setLogLoading(true);
        setLogEntries(await getAppSystemLog());
        setLogLoading(false);
      }
    } finally {
      setCheckingServices(false);
    }
  }

  async function handleViewSystemLog() {
    setLogOpen(true);
    setLogLoading(true);
    const entries = await getAppSystemLog();
    setLogEntries(entries);
    setLogLoading(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTechnicalDetails(null);
    setSaveFailed(false);
    setSuccess(false);
    setLoading(true);

    const result = await updateAppSettings(form);
    if (!result.success) {
      const technical =
        "technical" in result && Array.isArray(result.technical)
          ? result.technical.join("\n")
          : null;
      setTechnicalDetails(technical);
      setSaveFailed(true);
      setLoading(false);
      return;
    }

    setBaseline(form);
    setSaveFailed(false);
    setSuccess(true);
    setLastUpdatedAt(result.updatedAt);
    setLastUpdatedBy(result.updatedBy);
    setLoading(false);
    router.refresh();
  }

  const footerMeta = (
    <Stack spacing={0.25}>
      <Typography sx={{ fontSize: 12.5, color: imsColors.textMuted }}>
        {t("footer.lastUpdated")}: {formatTimestamp(displayedLastUpdatedAt)}
      </Typography>
      {displayedLastUpdatedBy ? (
        <Typography sx={{ fontSize: 12.5, color: imsColors.textMuted }}>
          {t("footer.lastUpdatedBy")}: {displayedLastUpdatedBy}
        </Typography>
      ) : null}
    </Stack>
  );

  return (
    <PageShell
      breadcrumbs={[
        { label: tNav("profile"), href: "/settings" },
        { label: t("title") },
      ]}
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {saveFailed ? (
            <InvoiceErrorAlert
              title={t("saveFailedTitle")}
              messages={[t("saveFailedMessage"), t("saveFailedContact")]}
              technicalDetails={technicalDetails}
              technicalDetailsLabel={t("technicalDetails")}
              technicalErrorsDisplay={initialData.technicalErrorsDisplay}
              tone="error"
            />
          ) : null}
          {success ? <ImsAlert tone="success">{t("saved")}</ImsAlert> : null}

          <AppSettingsStatusCard
            health={health}
            checking={checkingServices}
            onCheckServices={handleCheckServices}
            onViewSystemLog={handleViewSystemLog}
            formatGenerationActivity={formatGenerationActivity}
            formatLastChecked={formatTimestamp}
          />

          <SectionCard
            title={t("documentGeneration.title")}
            subtitle={t("documentGeneration.subtitle")}
            action={
              <ImsButton href="/settings#vorlagen" imsVariant="secondary">
                {t("documentGeneration.manageTemplates")}
              </ImsButton>
            }
          >
            <Stack spacing={2.25}>
              <ImsCheckboxCard
                id="retry_failed_generation"
                checked={form.retry_failed_generation}
                onChange={(checked) => updateField("retry_failed_generation", checked)}
                title={t("documentGeneration.retryFailedGeneration")}
                description={t("documentGeneration.retryFailedGenerationHint")}
              />
              <Grid container spacing={2.25}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsTextField
                    label={t("documentGeneration.maxRetryAttempts")}
                    type="number"
                    slotProps={{ htmlInput: { min: 1 } }}
                    value={String(form.max_retry_attempts)}
                    onChange={(e) =>
                      updateField("max_retry_attempts", parseInt(e.target.value, 10) || 3)
                    }
                    helperText={t("documentGeneration.maxRetryAttemptsHint")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsTextField
                    label={t("documentGeneration.generationTimeout")}
                    type="number"
                    slotProps={{ htmlInput: { min: 5 } }}
                    value={String(form.generation_timeout_seconds)}
                    onChange={(e) =>
                      updateField(
                        "generation_timeout_seconds",
                        parseInt(e.target.value, 10) || 30
                      )
                    }
                    helperText={t("documentGeneration.generationTimeoutHint")}
                  />
                </Grid>
              </Grid>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: imsColors.textDark, mb: 1 }}>
                  {t("documentGeneration.exportFormats")}
                </Typography>
                <Stack spacing={1}>
                  <ImsCheckboxCard
                    id="export_pdf"
                    checked={form.export_pdf}
                    onChange={(checked) => updateField("export_pdf", checked)}
                    title={t("documentGeneration.exportPdf")}
                    description={t("documentGeneration.exportPdfHint")}
                  />
                  <ImsCheckboxCard
                    id="export_docx"
                    checked={form.export_docx}
                    onChange={(checked) => updateField("export_docx", checked)}
                    title={t("documentGeneration.exportDocx")}
                    description={t("documentGeneration.exportDocxHint")}
                  />
                </Stack>
              </Box>
            </Stack>
          </SectionCard>

          <SectionCard title={t("invoiceDefaults.title")} subtitle={t("invoiceDefaults.subtitle")}>
            <Grid container spacing={2.25}>
              <Grid size={{ xs: 12, md: 6 }}>
                <ImsSelect
                  label={t("invoiceDefaults.defaultCurrency")}
                  value={form.default_currency}
                  onChange={(value) =>
                    updateField("default_currency", value as AppSettingsFormData["default_currency"])
                  }
                  options={CURRENCY_OPTIONS.map((option) => ({
                    value: option.value,
                    label: tCurrency(option.value),
                  }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ImsSelect
                  label={t("invoiceDefaults.defaultInvoiceLanguage")}
                  value={form.default_invoice_language}
                  onChange={(value) =>
                    updateField(
                      "default_invoice_language",
                      value as AppSettingsFormData["default_invoice_language"]
                    )
                  }
                  options={[
                    { value: "en", label: tCommon("english") },
                    { value: "de", label: tCommon("german") },
                  ]}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ImsSelect
                  label={t("invoiceDefaults.invoicePageSize")}
                  value={String(form.invoice_page_size)}
                  onChange={(value) =>
                    updateField("invoice_page_size", Number.parseInt(value, 10) || 20)
                  }
                  options={INVOICE_PAGE_SIZE_OPTIONS.map((size) => ({
                    value: String(size),
                    label: String(size),
                  }))}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <ImsTextField
                  label={t("invoiceDefaults.defaultPaymentTerms")}
                  value={form.default_payment_terms}
                  onChange={(e) => updateField("default_payment_terms", e.target.value)}
                  multiline
                  minRows={3}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <ImsCheckboxCard
                  id="app_small_business_rule"
                  checked={form.small_business_rule}
                  onChange={(checked) => updateField("small_business_rule", checked)}
                  title={t("invoiceDefaults.smallBusinessTitle")}
                  description={t("invoiceDefaults.smallBusinessDescription")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ImsTextField
                  label={t("invoiceDefaults.defaultInvoiceTitle")}
                  value={form.default_invoice_title}
                  onChange={(e) => updateField("default_invoice_title", e.target.value)}
                  placeholder={t("invoiceDefaults.defaultInvoiceTitlePlaceholder")}
                />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title={t("notifications.title")} subtitle={t("notifications.subtitle")}>
            <Stack spacing={2.25}>
              <ImsCheckboxCard
                id="notify_on_generation_failed"
                checked={form.notify_on_generation_failed}
                onChange={(checked) => updateField("notify_on_generation_failed", checked)}
                title={t("notifications.notifyOnFailed")}
                description={t("notifications.notifyOnFailedHint")}
              />
              <ImsCheckboxCard
                id="notify_on_generation_success"
                checked={form.notify_on_generation_success}
                onChange={(checked) => updateField("notify_on_generation_success", checked)}
                title={t("notifications.notifyOnSuccess")}
                description={t("notifications.notifyOnSuccessHint")}
              />
              <Grid container spacing={2.25}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsSelect
                    label={t("notifications.notificationLanguage")}
                    value={form.notification_language}
                    onChange={(value) =>
                      updateField(
                        "notification_language",
                        value as AppSettingsFormData["notification_language"]
                      )
                    }
                    options={[
                      { value: "en", label: tCommon("english") },
                      { value: "de", label: tCommon("german") },
                    ]}
                  />
                </Grid>
              </Grid>
            </Stack>
          </SectionCard>

          <SectionCard title={t("security.title")} subtitle={t("security.subtitle")}>
            <Stack spacing={2.25}>
              <ImsCheckboxCard
                id="abuse_protection_enabled"
                checked={form.abuse_protection_enabled}
                onChange={(checked) => updateField("abuse_protection_enabled", checked)}
                title={t("security.abuseProtectionEnabled")}
                description={t("security.abuseProtectionEnabledHint")}
              />
              <Grid container spacing={2.25}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsTextField
                    label={t("security.rateLimitPerUser")}
                    type="number"
                    slotProps={{ htmlInput: { min: 1 } }}
                    value={String(form.rate_limit_per_user)}
                    onChange={(e) =>
                      updateField("rate_limit_per_user", parseInt(e.target.value, 10) || 1)
                    }
                    helperText={t("security.rateLimitPerUserHint")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsTextField
                    label={t("security.duplicateSubmitBlockSeconds")}
                    type="number"
                    slotProps={{ htmlInput: { min: 0 } }}
                    value={String(form.duplicate_submit_block_seconds)}
                    onChange={(e) =>
                      updateField(
                        "duplicate_submit_block_seconds",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    helperText={t("security.duplicateSubmitBlockSecondsHint")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsTextField
                    label={t("security.maxGenerationsPerHour")}
                    type="number"
                    slotProps={{ htmlInput: { min: 1 } }}
                    value={String(form.max_generations_per_hour)}
                    onChange={(e) =>
                      updateField(
                        "max_generations_per_hour",
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                    helperText={t("security.maxGenerationsPerHourHint")}
                  />
                </Grid>
              </Grid>
            </Stack>
          </SectionCard>

          <SectionCard
            title={t("developer.title")}
            subtitle={t("developer.subtitle")}
            action={
              <IconButton
                aria-label={developerOpen ? t("developer.collapse") : t("developer.expand")}
                onClick={() => setDeveloperOpen((open) => !open)}
                size="small"
              >
                <Typography sx={{ fontSize: 18, lineHeight: 1, color: imsColors.textMuted }}>
                  {developerOpen ? "▾" : "▸"}
                </Typography>
              </IconButton>
            }
          >
            <Collapse in={developerOpen}>
              <Stack spacing={2.25} sx={{ pt: 0.5 }}>
                <ImsCheckboxCard
                  id="development_mode"
                  checked={form.development_mode}
                  onChange={(checked) => updateField("development_mode", checked)}
                  title={t("developer.developmentMode")}
                  description={t("developer.developmentModeHint")}
                />
                <ImsSelect
                  label={t("developer.technicalErrors")}
                  value={form.technical_errors_display}
                  disabled={form.development_mode}
                  onChange={(value) =>
                    updateField(
                      "technical_errors_display",
                      value as AppSettingsFormData["technical_errors_display"]
                    )
                  }
                  options={[
                    { value: "development", label: t("developer.technicalErrorsDevelopment") },
                    { value: "admin_only", label: t("developer.technicalErrorsAdminOnly") },
                    { value: "never", label: t("developer.technicalErrorsNever") },
                  ]}
                />
                <ImsSelect
                  label={t("developer.webhookMode")}
                  value={form.n8n_webhook_mode}
                  onChange={(value) =>
                    updateField("n8n_webhook_mode", value as AppSettingsFormData["n8n_webhook_mode"])
                  }
                  options={[
                    { value: "production", label: t("developer.webhookModeProduction") },
                    { value: "test", label: t("developer.webhookModeTest") },
                  ]}
                />
              </Stack>
            </Collapse>
          </SectionCard>
        </Stack>

        <Box sx={{ position: "sticky", bottom: 12, zIndex: 5, mt: 2.5 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "14px",
              border: `1px solid ${imsColors.border}`,
              bgcolor: "rgba(252, 253, 251, 0.98)",
              backdropFilter: "blur(8px)",
              px: { xs: 2, md: 2.25 },
              py: { xs: 1.25, md: 1.35 },
              boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              sx={{ alignItems: { md: "center" }, justifyContent: "space-between", gap: 1.25 }}
            >
              {footerMeta}
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: { xs: "stretch", md: "flex-end" }, width: { xs: "100%", md: "auto" } }}
              >
                <ImsButton type="button" imsVariant="ghost" onClick={handleCancel} disabled={loading}>
                  {tCommon("cancel")}
                </ImsButton>
                <ImsButton type="submit" loading={loading}>
                  {loading ? tCommon("saving") : t("save")}
                </ImsButton>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      <Dialog open={logOpen} onClose={() => setLogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("systemLog.title")}</DialogTitle>
        <DialogContent dividers>
          <HealthSystemLog
            entries={logEntries}
            loading={logLoading}
            formatTimestamp={formatTimestamp}
          />
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
