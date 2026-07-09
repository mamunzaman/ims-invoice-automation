export interface CustomerFormData {
  customer_name: string;
  company_name: string;
  contact_person: string;
  customer_email: string;
  customer_phone: string;
  customer_vat_number: string;
  street: string;
  postal_code: string;
  city: string;
  state: string;
  country: string;
  website: string;
  default_currency: string;
  default_payment_terms_days: string;
  notes: string;
}

export const DEFAULT_CUSTOMER_FORM: CustomerFormData = {
  customer_name: "",
  company_name: "",
  contact_person: "",
  customer_email: "",
  customer_phone: "",
  customer_vat_number: "",
  street: "",
  postal_code: "",
  city: "",
  state: "",
  country: "Deutschland",
  website: "",
  default_currency: "EUR",
  default_payment_terms_days: "20",
  notes: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildCustomerAddress(parts: {
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string {
  const street = parts.street?.trim();
  const postal_code = parts.postal_code?.trim();
  const city = parts.city?.trim();
  const state = parts.state?.trim();
  const country = parts.country?.trim();

  const cityLine = [postal_code, city].filter(Boolean).join(" ");
  const lines = [street, cityLine, state, country].filter(Boolean);
  return lines.join("\n");
}

export function parsePaymentTermsDays(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const days = parseInt(trimmed, 10);
  if (Number.isNaN(days) || days <= 0) return null;
  return days;
}

export type CustomerFieldErrors = Partial<Record<keyof CustomerFormData, string>>;

export function validateCustomerForm(data: CustomerFormData): CustomerFieldErrors {
  const errors: CustomerFieldErrors = {};

  if (!data.customer_name.trim()) {
    errors.customer_name = "Kundenname ist erforderlich.";
  }
  if (!data.street.trim()) {
    errors.street = "Straße und Hausnummer sind erforderlich.";
  }
  if (!data.postal_code.trim()) {
    errors.postal_code = "PLZ ist erforderlich.";
  }
  if (!data.city.trim()) {
    errors.city = "Stadt ist erforderlich.";
  }
  if (!data.country.trim()) {
    errors.country = "Land ist erforderlich.";
  }

  const email = data.customer_email.trim();
  if (email && !EMAIL_REGEX.test(email)) {
    errors.customer_email = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
  }

  const days = data.default_payment_terms_days.trim();
  if (!days) {
    errors.default_payment_terms_days = "Standard-Zahlungsziel ist erforderlich.";
  } else if (parsePaymentTermsDays(days) === null) {
    errors.default_payment_terms_days =
      "Zahlungsziel muss eine positive Zahl sein.";
  }

  return errors;
}

export function customerFieldErrorsToList(errors: CustomerFieldErrors): string[] {
  return Object.values(errors);
}

export function customerFormToDbPayload(formData: CustomerFormData) {
  const street = formData.street.trim();
  const postal_code = formData.postal_code.trim();
  const city = formData.city.trim();
  const state = formData.state.trim() || null;
  const country = formData.country.trim();

  return {
    customer_name: formData.customer_name.trim(),
    company_name: formData.company_name.trim() || null,
    contact_person: formData.contact_person.trim() || null,
    customer_email: formData.customer_email.trim() || null,
    customer_phone: formData.customer_phone.trim() || null,
    customer_vat_number: formData.customer_vat_number.trim() || null,
    street,
    postal_code,
    city,
    state,
    country,
    website: formData.website.trim() || null,
    default_currency: formData.default_currency.trim() || "EUR",
    default_payment_terms_days: parsePaymentTermsDays(
      formData.default_payment_terms_days
    ),
    customer_address: buildCustomerAddress({ street, postal_code, city, state, country }),
    notes: formData.notes.trim() || null,
  };
}
