import type { Customer } from "@/lib/types/database";
import { buildCustomerAddress } from "@/lib/customers";
import type { AppLocale } from "@/i18n/routing";
import { intlLocaleTag } from "@/i18n/routing";

export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale: AppLocale = "en"
): string {
  return new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency,
  }).format(amount);
}

export const DEFAULT_INVOICE_CURRENCY = "EUR";

const SUPPORTED_CURRENCIES = new Set(["EUR", "USD", "GBP", "CHF"]);

export function resolveInvoiceCurrency(currency?: string | null): string {
  const trimmed = currency?.trim().toUpperCase();
  if (trimmed && SUPPORTED_CURRENCIES.has(trimmed)) {
    return trimmed;
  }
  return DEFAULT_INVOICE_CURRENCY;
}

export function formatIsoDate(isoDate: string, locale: AppLocale = "en"): string {
  const datePart = isoDate?.trim().split("T")[0];
  if (!datePart) return "";

  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    year: "numeric",
    month: locale === "de" ? "numeric" : "long",
    day: "numeric",
  }).format(date);
}

/** @deprecated Use formatIsoDate with locale */
export function formatGermanDate(isoDate: string): string {
  return formatIsoDate(isoDate, "de");
}

export const formatDateDE = formatGermanDate;

export function formatGermanCurrencyDisplay(amount: number, currency = "EUR"): string {
  return formatCurrency(amount, resolveInvoiceCurrency(currency), "de");
}

export function formatDate(date: string, locale: AppLocale = "en"): string {
  return new Intl.DateTimeFormat(intlLocaleTag(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatCustomerAddress(customer: Customer): string {
  if (customer.customer_address?.trim()) {
    return customer.customer_address;
  }

  return buildCustomerAddress(customer);
}

export function customerDisplayName(customer: Customer): string {
  return customer.company_name?.trim() || customer.customer_name;
}

export function paymentTermsFromCustomer(
  customer: Customer,
  fallback: string,
  daysLabel?: (days: number) => string
): string {
  if (customer.default_payment_terms_days) {
    if (daysLabel) return daysLabel(customer.default_payment_terms_days);
    return `Payment due within ${customer.default_payment_terms_days} days without deduction.`;
  }
  return fallback;
}

export function paymentDeadlineFromCustomer(customer: Customer): string | null {
  if (!customer.default_payment_terms_days) return null;

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + customer.default_payment_terms_days);
  return deadline.toISOString().split("T")[0];
}

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generated: "bg-blue-100 text-blue-700",
  sent: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

/** Field keys for invoice labels — resolve via useTranslations('invoice') */
export const INVOICE_LABEL_KEYS = {
  invoice_number: "invoiceNumber",
  invoice_date: "invoiceDate",
  invoice_title: "invoiceTitle",
  service_period: "servicePeriod",
  service_period_start: "servicePeriodStart",
  service_period_end: "servicePeriodEnd",
  customer: "customer",
  customer_salutation: "customerSalutation",
  service_description: "serviceDescription",
  amount_net: "amountNet",
  total_amount: "totalAmount",
  tax_amount: "taxAmount",
  payment_deadline: "paymentDeadline",
  payment_terms: "paymentTerms",
  bank_details: "bankDetails",
  small_business: "smallBusiness",
} as const;

/** @deprecated Use useTranslations('status') */
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  generated: "Generated",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Cancelled",
  archived: "Archived",
  overdue: "Overdue",
};

/** @deprecated Use useTranslations('invoice') */
export const INVOICE_LABELS = {
  invoice_number: "Invoice number",
  invoice_date: "Invoice date",
  invoice_title: "Invoice title",
  service_period: "Service period",
  service_period_start: "From",
  service_period_end: "To",
  customer: "Customer",
  customer_salutation: "Salutation",
  service_description: "Service description",
  amount_net: "Net amount",
  total_amount: "Total amount",
  tax_amount: "VAT",
  payment_deadline: "Payment due",
  payment_terms: "Payment terms",
  bank_details: "Bank details",
  small_business: "No VAT shown pursuant to §19 UStG",
};
