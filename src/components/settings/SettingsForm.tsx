"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Box, Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import { PageShell } from "@/components/layout/PageShell";
import { SectionCard } from "@/components/layout/SectionCard";
import { FormValidationAlert } from "@/components/invoices/FormValidationAlert";
import {
  ImsAlert,
  ImsButton,
  ImsCheckboxCard,
  ImsSelect,
  ImsStickyFooter,
  ImsTextField,
} from "@/components/forms/ims";
import { GermanAddressAutocomplete } from "@/components/forms/GermanAddressAutocomplete";
import { BankAccountsSection } from "@/components/settings/BankAccountsSection";
import { InvoiceAdminSection } from "@/components/settings/InvoiceAdminSection";
import { updateSettings, type SettingsFormData } from "@/lib/actions/settings";
import { setUserLocale } from "@/lib/actions/locale";
import type { CustomerAddressScope, Profile, ProfileBankAccount, ProfileInvoiceSettings } from "@/lib/types/database";
import {
  germanAddressFieldsToMultiline,
  parseMultilineCustomerAddress,
} from "@/lib/google-places";
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, type AppLocale } from "@/i18n/routing";
import { getLocaleDefinitions } from "@/i18n/locale-config";
import { CURRENCY_OPTIONS } from "@/lib/settings-constants";

interface SettingsFormProps {
  profile: Profile | null;
  bankAccounts: ProfileBankAccount[];
  invoiceAdminSettings: ProfileInvoiceSettings;
  numberingPreview: { format: string; preview: string; year: number };
}

export function SettingsForm({
  profile,
  bankAccounts,
  invoiceAdminSettings,
  numberingPreview,
}: SettingsFormProps) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("navigation");
  const tScope = useTranslations("scope");
  const tCurrency = useTranslations("currency");
  const [, startLocaleTransition] = useTransition();
  const [form, setForm] = useState<SettingsFormData>({
    sender_name: profile?.sender_name || "",
    sender_address: profile?.sender_address || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    tax_number: profile?.tax_number || "",
    default_payment_terms:
      profile?.default_payment_terms || "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
    small_business_rule: profile?.small_business_rule ?? false,
    default_currency: profile?.default_currency || "EUR",
    customer_address_scope: profile?.customer_address_scope || "DE",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [languageSuccess, setLanguageSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof SettingsFormData>(field: K, value: SettingsFormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const senderAddressFields = useMemo(
    () => parseMultilineCustomerAddress(form.sender_address),
    [form.sender_address]
  );

  function handleLocaleChange(next: string) {
    const nextLocale = next as AppLocale;
    if (nextLocale === locale) return;

    startLocaleTransition(async () => {
      setLanguageSuccess(false);
      localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      document.cookie = `${LOCALE_COOKIE}=${nextLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      const result = await setUserLocale(nextLocale);
      if (!result.success) {
        setErrors(result.errors || [t("saveFailed")]);
        return;
      }
      setLanguageSuccess(true);
      router.refresh();
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);
    setLoading(true);

    const result = await updateSettings(form);
    if (!result.success) {
      setErrors(result.errors || [t("saveFailed")]);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <PageShell
      breadcrumbs={[{ label: tNav("settings") }]}
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          {errors.length > 0 ? <FormValidationAlert messages={errors} /> : null}
          {success ? <ImsAlert tone="success">{t("saved")}</ImsAlert> : null}
          {languageSuccess ? <ImsAlert tone="success">{t("languageSaved")}</ImsAlert> : null}

          <SectionCard title={t("general")} subtitle={t("languageSubtitle")}>
            <ImsSelect
              label={tCommon("language")}
              value={locale}
              onChange={handleLocaleChange}
              options={getLocaleDefinitions().map((item) => ({
                value: item.code,
                label: tCommon(item.messageKey),
              }))}
            />
          </SectionCard>

          <SectionCard title={t("sender")} subtitle={t("senderSubtitle")}>
            <Grid container spacing={2.25}>
              <Grid size={{ xs: 12 }}>
                <ImsTextField
                  label={t("name")}
                  name="sender_name"
                  value={form.sender_name}
                  onChange={(e) => updateField("sender_name", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ImsTextField
                  label={t("email")}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <ImsTextField
                  label={t("phone")}
                  name="phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </Grid>
            </Grid>
          </SectionCard>

          <SectionCard title={t("addressSection")} subtitle={t("addressSubtitle")}>
            <Stack spacing={2.25}>
              <GermanAddressAutocomplete
                values={senderAddressFields}
                regionScope="DE"
                onChange={(fields) =>
                  updateField("sender_address", germanAddressFieldsToMultiline(fields))
                }
              />
              <ImsSelect
                label={t("customerAddressScope")}
                name="customer_address_scope"
                value={form.customer_address_scope}
                onChange={(value) =>
                  updateField("customer_address_scope", value as CustomerAddressScope)
                }
                options={[
                  { value: "DE", label: tScope("de") },
                  { value: "WORLD", label: tScope("world") },
                ]}
              />
            </Stack>
          </SectionCard>

          <SectionCard title={t("taxData")} subtitle={t("taxDataSubtitle")}>
            <Stack spacing={2.25}>
              <ImsTextField
                label={t("taxNumber")}
                name="tax_number"
                value={form.tax_number}
                onChange={(e) => updateField("tax_number", e.target.value)}
              />
              <ImsCheckboxCard
                id="small_business_rule"
                name="small_business_rule"
                checked={form.small_business_rule}
                onChange={(checked) => updateField("small_business_rule", checked)}
                title={t("smallBusinessTitle")}
                description={t("smallBusinessDescription")}
              />
            </Stack>
          </SectionCard>

          <Box id="bankkonten">
            <SectionCard title={t("bankAccountsTitle")} subtitle={t("bankAccountsSubtitle")}>
              <BankAccountsSection accounts={bankAccounts} />
            </SectionCard>
          </Box>

          <Box id="vorlagen">
            <SectionCard title={t("defaultsTitle")} subtitle={t("defaultsSubtitle")}>
              <Grid container spacing={2.25}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <ImsSelect
                    label={t("defaultCurrency")}
                    name="default_currency"
                    value={form.default_currency}
                    onChange={(value) =>
                      updateField("default_currency", value as SettingsFormData["default_currency"])
                    }
                    options={CURRENCY_OPTIONS.map((option) => ({
                      value: option.value,
                      label: tCurrency(option.value),
                    }))}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <ImsTextField
                    label={t("defaultPaymentTerms")}
                    name="default_payment_terms"
                    value={form.default_payment_terms}
                    onChange={(e) => updateField("default_payment_terms", e.target.value)}
                    multiline
                    minRows={3}
                  />
                </Grid>
              </Grid>
            </SectionCard>
          </Box>

          <InvoiceAdminSection
            profile={profile}
            bankAccounts={bankAccounts}
            initialSettings={invoiceAdminSettings}
            numberingPreview={numberingPreview}
          />
        </Stack>

        <ImsStickyFooter hint={t("stickyHint")}>
          <ImsButton type="submit" loading={loading}>
            {loading ? tCommon("saving") : t("saveSettings")}
          </ImsButton>
        </ImsStickyFooter>
      </Box>
    </PageShell>
  );
}
