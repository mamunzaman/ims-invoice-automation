"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useTranslations } from "next-intl";
import { PageShell, type BreadcrumbItem } from "@/components/layout/PageShell";
import { SectionCard } from "@/components/layout/SectionCard";
import { CustomerPreviewCard } from "@/components/customers/CustomerPreviewCard";
import { FormValidationAlert } from "@/components/invoices/FormValidationAlert";
import { GermanAddressAutocomplete } from "@/components/forms/GermanAddressAutocomplete";
import { FormSplitLayout, ImsButton, ImsSelect, ImsTextField } from "@/components/forms/ims";
import type { CustomerAddressScope } from "@/lib/types/database";
import type { GermanAddressFields } from "@/lib/google-places";
import {
  DEFAULT_CUSTOMER_FORM,
  validateCustomerForm,
  buildCustomerAddress,
  type CustomerFieldErrors,
  type CustomerFormData,
} from "@/lib/customers";
import type { Customer } from "@/lib/types/database";

interface CustomerFormProps {
  initialData?: Customer;
  addressScope?: CustomerAddressScope;
  onSubmit: (
    data: CustomerFormData
  ) => Promise<{
    success: boolean;
    errors?: string[];
    fieldErrors?: CustomerFieldErrors;
  }>;
  submitLabel: string;
  pageTitle: string;
  pageSubtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
}

function customerToFormData(customer: Customer): CustomerFormData {
  return {
    customer_name: customer.customer_name,
    company_name: customer.company_name || "",
    contact_person: customer.contact_person || "",
    customer_email: customer.customer_email || "",
    customer_phone: customer.customer_phone || "",
    customer_vat_number: customer.customer_vat_number || "",
    street: customer.street || "",
    postal_code: customer.postal_code || "",
    city: customer.city || "",
    state: customer.state || "",
    country: customer.country || "Deutschland",
    website: customer.website || "",
    default_currency: customer.default_currency || "EUR",
    default_payment_terms_days:
      customer.default_payment_terms_days != null
        ? String(customer.default_payment_terms_days)
        : "20",
    notes: customer.notes || "",
  };
}

function translateCustomerFieldErrors(
  errors: CustomerFieldErrors,
  form: CustomerFormData,
  tValidation: ReturnType<typeof useTranslations<"validation">>
): CustomerFieldErrors {
  const translated: CustomerFieldErrors = {};

  if (errors.customer_name) translated.customer_name = tValidation("customerNameRequired");
  if (errors.street) translated.street = tValidation("streetRequired");
  if (errors.postal_code) translated.postal_code = tValidation("postalCodeRequired");
  if (errors.city) translated.city = tValidation("cityRequired");
  if (errors.country) translated.country = tValidation("countryRequired");
  if (errors.customer_email) translated.customer_email = tValidation("invalidEmail");
  if (errors.default_payment_terms_days) {
    translated.default_payment_terms_days = !form.default_payment_terms_days.trim()
      ? tValidation("paymentTermsRequired")
      : tValidation("paymentTermsPositive");
  }

  return translated;
}

export function CustomerForm({
  initialData,
  addressScope = "DE",
  onSubmit,
  submitLabel,
  pageTitle,
  pageSubtitle,
  breadcrumbs,
}: CustomerFormProps) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const tCurrency = useTranslations("currency");
  const [form, setForm] = useState<CustomerFormData>(
    initialData ? customerToFormData(initialData) : DEFAULT_CUSTOMER_FORM
  );
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const currencyOptions = useMemo(
    () =>
      (["EUR", "USD", "GBP", "CHF"] as const).map((code) => ({
        value: code,
        label: tCurrency(code),
      })),
    [tCurrency]
  );

  function updateField(field: keyof CustomerFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  const addressFields = useMemo<GermanAddressFields>(
    () => ({
      customer_address: form.street,
      customer_zip: form.postal_code,
      customer_city: form.city,
      customer_country: form.country,
    }),
    [form.street, form.postal_code, form.city, form.country]
  );

  function handleAddressChange(fields: GermanAddressFields) {
    setForm((prev) => ({
      ...prev,
      street: fields.customer_address,
      postal_code: fields.customer_zip,
      city: fields.customer_city,
      country: fields.customer_country,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.street;
      delete next.postal_code;
      delete next.city;
      delete next.country;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const validationErrors = validateCustomerForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(translateCustomerFieldErrors(validationErrors, form, tValidation));
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const result = await onSubmit(form);
    if (!result.success) {
      if (result.fieldErrors) {
        setFieldErrors(translateCustomerFieldErrors(result.fieldErrors, form, tValidation));
      }
      setFormError(result.errors?.[0] || tValidation("genericError"));
      setLoading(false);
      return;
    }

    router.push("/customers");
    router.refresh();
  }

  const previewName = form.company_name.trim() || form.customer_name.trim();
  const previewAddress = buildCustomerAddress(form);
  const validationMessages = [
    ...(formError ? [formError] : []),
    ...Object.values(fieldErrors).filter(Boolean),
  ];

  const formContent = (
    <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
      {validationMessages.length > 0 ? (
        <FormValidationAlert messages={validationMessages} />
      ) : null}

      <SectionCard step={1} title={t("basicData")} subtitle={t("basicDataSubtitle")}>
        <Grid container spacing={2.25}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("customerName")}
              required
              name="customer_name"
              value={form.customer_name}
              onChange={(e) => updateField("customer_name", e.target.value)}
              error={Boolean(fieldErrors.customer_name)}
              helperText={fieldErrors.customer_name}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("companyName")}
              name="company_name"
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ImsTextField
              label={t("contactPerson")}
              name="contact_person"
              value={form.contact_person}
              onChange={(e) => updateField("contact_person", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("email")}
              type="email"
              name="customer_email"
              value={form.customer_email}
              onChange={(e) => updateField("customer_email", e.target.value)}
              error={Boolean(fieldErrors.customer_email)}
              helperText={fieldErrors.customer_email}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("phone")}
              name="customer_phone"
              value={form.customer_phone}
              onChange={(e) => updateField("customer_phone", e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ImsTextField
              label={t("website")}
              name="website"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder={t("websitePlaceholder")}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard step={2} title={t("billingAddress")} subtitle={t("billingAddressSubtitle")}>
        <Stack spacing={2.25}>
          <GermanAddressAutocomplete
            values={addressFields}
            regionScope={addressScope}
            onChange={handleAddressChange}
          />
          {(fieldErrors.street ||
            fieldErrors.postal_code ||
            fieldErrors.city ||
            fieldErrors.country) && (
            <FormValidationAlert
              messages={[
                fieldErrors.street ||
                  fieldErrors.postal_code ||
                  fieldErrors.city ||
                  fieldErrors.country ||
                  "",
              ].filter(Boolean)}
            />
          )}
          <ImsTextField
            label={t("stateProvince")}
            name="state"
            value={form.state}
            onChange={(e) => updateField("state", e.target.value)}
          />
        </Stack>
      </SectionCard>

      <SectionCard step={3} title={t("invoiceSettings")} subtitle={t("invoiceSettingsSubtitle")}>
        <Grid container spacing={2.25}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsSelect
              label={t("defaultCurrency")}
              name="default_currency"
              value={form.default_currency}
              onChange={(value) => updateField("default_currency", value)}
              options={currencyOptions}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("defaultPaymentTermsLabel")}
              type="number"
              name="default_payment_terms_days"
              value={form.default_payment_terms_days}
              onChange={(e) => updateField("default_payment_terms_days", e.target.value)}
              error={Boolean(fieldErrors.default_payment_terms_days)}
              helperText={fieldErrors.default_payment_terms_days}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ImsTextField
              label={t("vatNumber")}
              name="customer_vat_number"
              value={form.customer_vat_number}
              onChange={(e) => updateField("customer_vat_number", e.target.value)}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard step={4} title={t("internalNotes")} subtitle={t("internalNotesSubtitle")}>
        <ImsTextField
          label={t("notes")}
          name="notes"
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder={t("notesPlaceholder")}
          multiline
          minRows={4}
        />
      </SectionCard>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        sx={{ justifyContent: "flex-end" }}
      >
        <ImsButton imsVariant="ghost" onClick={() => router.back()}>
          {tCommon("cancel")}
        </ImsButton>
        <ImsButton type="submit" loading={loading}>
          {loading ? tCommon("saving") : submitLabel}
        </ImsButton>
      </Stack>
    </Stack>
  );

  const previewContent = (
    <CustomerPreviewCard
      name={previewName}
      secondaryName={
        form.company_name.trim() &&
        form.customer_name.trim() &&
        form.company_name.trim() !== form.customer_name.trim()
          ? form.customer_name
          : undefined
      }
      contactPerson={form.contact_person}
      email={form.customer_email}
      phone={form.customer_phone}
      website={form.website}
      address={previewAddress}
      currency={form.default_currency}
      paymentTermsDays={form.default_payment_terms_days}
      vatNumber={form.customer_vat_number}
    />
  );

  return (
    <PageShell
      breadcrumbs={breadcrumbs}
      title={pageTitle}
      subtitle={pageSubtitle}
    >
      <FormSplitLayout form={formContent} preview={previewContent} />
    </PageShell>
  );
}
