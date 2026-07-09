"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { OpenInNewIcon } from "@/components/icons/muiIcons";
import { SectionCard } from "@/components/layout/SectionCard";
import {
  ImsAlert,
  ImsButton,
  ImsCheckboxCard,
  ImsConfirmDialog,
  ImsSelect,
  ImsStatusChip,
  ImsTextField,
  type ImsStatusTone,
} from "@/components/forms/ims";
import {
  cleanDraftInvoices,
  getInvoiceNumberingPreview,
  resetInvoiceNumbering,
  scanDocumentLinks,
  updateInvoiceAdminSettings,
  type DocumentHealthReport,
} from "@/lib/actions/invoice-admin";
import { updateSettings } from "@/lib/actions/settings";
import type {
  Profile,
  ProfileBankAccount,
  ProfileInvoiceSettings,
  SupportedCurrency,
} from "@/lib/types/database";
import { CURRENCY_OPTIONS } from "@/lib/settings-constants";
import { intlLocaleTag, type AppLocale } from "@/i18n/routing";
import { imsColors } from "@/theme/imsTheme";

interface InvoiceAdminSectionProps {
  profile: Profile | null;
  bankAccounts: ProfileBankAccount[];
  initialSettings: ProfileInvoiceSettings;
  numberingPreview: { format: string; preview: string; year: number };
}

function driveFolderUrl(folderId?: string): string | null {
  const id = folderId?.trim();
  if (!id) return null;
  return `https://drive.google.com/drive/folders/${id}`;
}

function healthTone(level: DocumentHealthReport["level"]): ImsStatusTone {
  if (level === "ok") return "green";
  if (level === "warning") return "amber";
  return "red";
}

export function InvoiceAdminSection({
  profile,
  bankAccounts,
  initialSettings,
  numberingPreview,
}: InvoiceAdminSectionProps) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("invoiceAdmin");
  const tValidation = useTranslations("validation");
  const tNotifications = useTranslations("notifications");
  const tDialogs = useTranslations("dialogs");
  const tSettings = useTranslations("settings");
  const tCurrency = useTranslations("currency");
  const tInvoice = useTranslations("invoice");
  const [settings, setSettings] = useState<ProfileInvoiceSettings>(initialSettings);
  const [preview, setPreview] = useState(numberingPreview);
  const [defaultCurrency, setDefaultCurrency] = useState<SupportedCurrency>(
    profile?.default_currency || "EUR"
  );
  const [smallBusinessRule, setSmallBusinessRule] = useState(
    profile?.small_business_rule ?? false
  );
  const [paymentDays, setPaymentDays] = useState(
    String(initialSettings.default_payment_days ?? 14)
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [healthReport, setHealthReport] = useState<DocumentHealthReport | null>(null);

  function updateSetting<K extends keyof ProfileInvoiceSettings>(
    key: K,
    value: ProfileInvoiceSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function healthLabel(level: DocumentHealthReport["level"]): string {
    if (level === "ok") return t("healthOk");
    if (level === "warning") return t("healthWarning");
    return t("healthAttention");
  }

  async function handleSaveAdmin() {
    setErrors([]);
    setSuccess(null);
    setSaving(true);

    const days = parseInt(paymentDays, 10);
    const adminPayload: ProfileInvoiceSettings = {
      ...settings,
      default_payment_days: Number.isFinite(days) && days > 0 ? days : 14,
    };

    const adminResult = await updateInvoiceAdminSettings(adminPayload);
    if (!adminResult.success) {
      setErrors(adminResult.errors || [tValidation("saveFailed")]);
      setSaving(false);
      return;
    }

    if (profile) {
      const paymentTerms = `Zahlbar innerhalb von ${adminPayload.default_payment_days} Tagen ohne Abzug.`;
      const profileResult = await updateSettings({
        sender_name: profile.sender_name || "",
        sender_address: profile.sender_address || "",
        email: profile.email || "",
        phone: profile.phone || "",
        tax_number: profile.tax_number || "",
        default_payment_terms: paymentTerms,
        small_business_rule: smallBusinessRule,
        default_currency: defaultCurrency,
        customer_address_scope: profile.customer_address_scope || "DE",
      });

      if (!profileResult.success) {
        setErrors(profileResult.errors || [tValidation("saveFailed")]);
        setSaving(false);
        return;
      }
    }

    setSuccess(tNotifications("adminSaved"));
    setSaving(false);
    router.refresh();
  }

  async function handleResetNumbering() {
    setResetLoading(true);
    setErrors([]);
    const result = await resetInvoiceNumbering();
    setResetLoading(false);
    setResetConfirmOpen(false);

    if (!result.success) {
      setErrors(result.errors || [tValidation("saveFailed")]);
      return;
    }

    setSuccess(result.message);
    const nextPreview = await getInvoiceNumberingPreview();
    setPreview(nextPreview);
    router.refresh();
  }

  async function handleCleanDrafts() {
    setCleanLoading(true);
    setErrors([]);
    const result = await cleanDraftInvoices();
    setCleanLoading(false);

    if (result.errors.length > 0) {
      setErrors(result.errors);
    }
    setSuccess(tNotifications("draftsCleaned", { count: result.deleted }));
    router.refresh();
  }

  async function handleScanLinks() {
    setScanLoading(true);
    setErrors([]);
    const report = await scanDocumentLinks();
    setHealthReport(report);
    setScanLoading(false);
  }

  const docsFolderUrl = driveFolderUrl(settings.google_docs_folder_id);
  const pdfFolderUrl = driveFolderUrl(settings.pdf_folder_id);

  return (
    <Stack spacing={2.5} id="rechnungsverwaltung">
      {errors.length > 0 ? (
        <ImsAlert tone="error">
          {errors.map((e) => (
            <Box key={e}>{e}</Box>
          ))}
        </ImsAlert>
      ) : null}
      {success ? <ImsAlert tone="success">{success}</ImsAlert> : null}

      <SectionCard title={t("numberingTitle")} subtitle={t("numberingSubtitle")}>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mb: 0.5 }}>
                  {t("currentFormat")}
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{preview.format}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mb: 0.5 }}>
                  {t("nextNumber")}
                </Typography>
                <Typography sx={{ fontWeight: 600, fontFamily: "monospace" }}>
                  {preview.preview}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mb: 0.5 }}>
                  {t("year")}
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{preview.year}</Typography>
              </Grid>
            </Grid>

            <ImsCheckboxCard
              id="invoice_number_year_reset"
              checked={settings.invoice_number_year_reset ?? true}
              onChange={(checked) => updateSetting("invoice_number_year_reset", checked)}
              title={t("yearlyReset")}
              description={t("yearlyResetDescription")}
            />

            {settings.last_numbering_reset_at ? (
              <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
                {t("lastReset")}:{" "}
                {new Date(settings.last_numbering_reset_at).toLocaleString(intlLocaleTag(locale))}
              </Typography>
            ) : null}
          </Stack>
        </SectionCard>

        <SectionCard title={t("driveTitle")} subtitle={t("driveSubtitle")}>
          <Grid container spacing={2.25}>
            <Grid size={{ xs: 12 }}>
              <ImsTextField
                label={t("templateDocId")}
                value={settings.google_template_doc_id || ""}
                onChange={(e) => updateSetting("google_template_doc_id", e.target.value)}
                placeholder="Google Docs Template ID"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsTextField
                label={t("docsFolderId")}
                value={settings.google_docs_folder_id || ""}
                onChange={(e) => updateSetting("google_docs_folder_id", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsTextField
                label={t("pdfFolderId")}
                value={settings.pdf_folder_id || ""}
                onChange={(e) => updateSetting("pdf_folder_id", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
                <ImsButton
                  imsVariant="secondary"
                  disabled={!docsFolderUrl}
                  onClick={() => docsFolderUrl && window.open(docsFolderUrl, "_blank")}
                >
                  {t("openDocsFolder")}
                  <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
                </ImsButton>
                <ImsButton
                  imsVariant="secondary"
                  disabled={!pdfFolderUrl}
                  onClick={() => pdfFolderUrl && window.open(pdfFolderUrl, "_blank")}
                >
                  {t("openPdfFolder")}
                  <OpenInNewIcon sx={{ fontSize: 16, ml: 0.5 }} />
                </ImsButton>
              </Stack>
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard title={t("defaultsTitle")} subtitle={t("defaultsSubtitle")}>
          <Grid container spacing={2.25}>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsSelect
                label={tSettings("defaultCurrency")}
                value={defaultCurrency}
                onChange={(value) => setDefaultCurrency(value as SupportedCurrency)}
                options={CURRENCY_OPTIONS.map((o) => ({ value: o.value, label: tCurrency(o.value) }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsTextField
                label={t("defaultPaymentDays")}
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={paymentDays}
                onChange={(e) => setPaymentDays(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsSelect
                label={t("defaultBankAccount")}
                value={settings.default_bank_account_id || ""}
                onChange={(value) => updateSetting("default_bank_account_id", value || undefined)}
                options={[
                  { value: "", label: t("noDefaultBank") },
                  ...bankAccounts.map((a) => ({
                    value: a.id,
                    label: `${a.label} (${a.iban.slice(-4)})`,
                  })),
                ]}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsTextField
                label={t("defaultInvoiceTitle")}
                value={settings.default_invoice_title || ""}
                onChange={(e) => updateSetting("default_invoice_title", e.target.value)}
                placeholder={tInvoice("defaultTitle")}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ImsCheckboxCard
                id="admin_small_business_rule"
                checked={smallBusinessRule}
                onChange={setSmallBusinessRule}
                title={tSettings("smallBusinessTitle")}
                description={tSettings("smallBusinessDescription")}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard title={t("healthTitle")} subtitle={t("healthSubtitle")}>
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
              useFlexGap
            >
              <ImsButton imsVariant="secondary" loading={scanLoading} onClick={handleScanLinks}>
                {t("scanLinks")}
              </ImsButton>
              {healthReport ? (
                <ImsStatusChip
                  tone={healthTone(healthReport.level)}
                  label={healthLabel(healthReport.level)}
                />
              ) : null}
            </Stack>

            {healthReport ? (
              <Box>
                <Typography sx={{ fontSize: 13, color: imsColors.textMuted, mb: 1 }}>
                  {t("invoicesScanned", { count: healthReport.scanned })} ·{" "}
                  {t("issuesFound", { count: healthReport.issues.length })}
                </Typography>
                {healthReport.issues.length === 0 ? (
                  <Typography sx={{ fontSize: 14 }}>{t("allLinksOk")}</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {healthReport.issues.slice(0, 12).map((issue) => (
                      <Typography key={`${issue.invoiceId}-${issue.message}`} sx={{ fontSize: 13 }}>
                        <strong>{issue.invoiceNumber}</strong>: {issue.message}
                      </Typography>
                    ))}
                    {healthReport.issues.length > 12 ? (
                      <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>
                        {t("andMore", { count: healthReport.issues.length - 12 })}
                      </Typography>
                    ) : null}
                  </Stack>
                )}
              </Box>
            ) : null}
          </Stack>
        </SectionCard>

        <SectionCard title={t("dangerTitle")} subtitle={t("dangerSubtitle")}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
              {t("dangerHint")}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
              <ImsButton imsVariant="danger" onClick={() => setResetConfirmOpen(true)}>
                {t("resetNumbering")}
              </ImsButton>
              <ImsButton imsVariant="danger" loading={cleanLoading} onClick={handleCleanDrafts}>
                {t("cleanDrafts")}
              </ImsButton>
              <ImsButton imsVariant="secondary" loading={scanLoading} onClick={handleScanLinks}>
                {t("scanDriveLinks")}
              </ImsButton>
            </Stack>
          </Stack>
        </SectionCard>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <ImsButton loading={saving} onClick={handleSaveAdmin}>
          {t("saveAdmin")}
        </ImsButton>
      </Box>

      <ImsConfirmDialog
        open={resetConfirmOpen}
        title={tDialogs("resetNumberingTitle")}
        message={tDialogs("resetNumberingMessage")}
        confirmLabel={tDialogs("resetNumberingConfirm")}
        danger
        loading={resetLoading}
        onConfirm={handleResetNumbering}
        onClose={() => !resetLoading && setResetConfirmOpen(false)}
      />
    </Stack>
  );
}
