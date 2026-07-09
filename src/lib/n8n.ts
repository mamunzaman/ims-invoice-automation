import type { Invoice, InvoiceFormData } from "@/lib/types/database";
import { buildCustomerShortCode, buildInvoiceFileName } from "@/lib/invoices";
import {
  calculateInvoiceAmounts,
  parseCompanyAddress,
  invoiceNotesMeta,
  normalizeInvoiceFormData,
  normalizeIsoDate,
  type InvoiceWebhookProfile,
} from "@/lib/invoice-form";
import {
  formatGermanCurrencyDisplay,
  formatGermanDate,
  INVOICE_LABELS,
  resolveInvoiceCurrency,
} from "@/lib/utils";
import { sanitizeExternalUrl } from "@/lib/urls";
import {
  buildDefaultCompletedSteps,
  type GenerationResultStep,
} from "@/lib/generation-status";

export type InvoiceFieldErrors = Partial<Record<keyof InvoiceFormData, string>>;

export function getInvoiceFieldErrors(
  data: InvoiceFormData,
  options?: { requirePaymentDeadline?: boolean }
): InvoiceFieldErrors {
  const normalized = normalizeInvoiceFormData(data);
  const errors: InvoiceFieldErrors = {};

  if (!normalized.invoice_date) {
    errors.invoice_date = "invoiceDateRequired";
  }
  if (!normalized.customer_name) {
    errors.customer_name = "customerRequired";
  }
  if (!normalized.service_description) {
    errors.service_description = "serviceDescriptionRequired";
  }
  if (
    !normalized.amount_net ||
    Number.isNaN(parseFloat(normalized.amount_net)) ||
    parseFloat(normalized.amount_net) <= 0
  ) {
    errors.amount_net = "amountNetRequired";
  }
  if (!normalized.currency) {
    errors.currency = "currencyRequired";
  }
  if (options?.requirePaymentDeadline && !normalized.payment_deadline) {
    errors.payment_deadline = "paymentDeadlineRequired";
  }

  return errors;
}

export function validateInvoiceForm(
  data: InvoiceFormData,
  options?: { requirePaymentDeadline?: boolean }
): string[] {
  return Object.values(getInvoiceFieldErrors(data, options));
}


export function invoiceToWebhookPayload(
  invoice: Invoice,
  formData: InvoiceFormData,
  profile?: InvoiceWebhookProfile | null
) {
  const form = normalizeInvoiceFormData(formData);
  const storedMeta = invoiceNotesMeta(invoice);
  const invoice_title = form.invoice_title || storedMeta.invoice_title;
  const customer_name = form.customer_name || storedMeta.customer_name;
  const customer_salutation = form.customer_salutation || null;
  const service_description = form.service_description || storedMeta.service_description;
  const payment_terms = form.payment_terms || storedMeta.payment_terms || null;
  const optional_notes = form.optional_notes || storedMeta.user_notes || null;
  const tax_number =
    form.tax_number || storedMeta.tax_number || profile?.tax_number?.trim() || null;
  const account_holder = form.account_holder || storedMeta.account_holder || null;
  const iban = form.iban || storedMeta.iban || null;
  const bic = form.bic || storedMeta.bic || null;
  const bank_name = form.bank_name || storedMeta.bank_name || null;

  const amounts = calculateInvoiceAmounts(form.amount_net, invoice.is_small_business);
  const company = parseCompanyAddress(profile || null);
  const currency = resolveInvoiceCurrency(invoice.currency);
  const paymentDue = normalizeIsoDate(invoice.payment_deadline || form.payment_deadline);
  const invoiceDate = normalizeIsoDate(invoice.invoice_date);
  const small_business_notice = invoice.is_small_business
    ? invoice.small_business_notice || INVOICE_LABELS.small_business
    : null;

  const customer_short_code = buildCustomerShortCode(customer_name);
  const fileNameBase = buildInvoiceFileName(invoice.invoice_number, customer_name);
  const pdfFileName = buildInvoiceFileName(invoice.invoice_number, customer_name, "pdf");

  return {
    company_name: company.company_name,
    company_address: company.company_address,
    company_zip: company.company_zip,
    company_city: company.company_city,
    company_phone: company.company_phone,
    company_email: company.company_email,
    tax_number,
    invoice_number: invoice.invoice_number,
    invoice_date: invoiceDate,
    invoice_date_display: invoiceDate ? formatGermanDate(invoiceDate) : null,
    service_period: invoice.service_period,
    customer_name,
    customer_salutation,
    customer_address: form.customer_address,
    customer_zip: form.customer_zip,
    customer_city: form.customer_city,
    invoice_title,
    service_description,
    amount: amounts.net_amount,
    amount_net: amounts.net_amount,
    net_amount: amounts.net_amount,
    tax_amount: amounts.vat_amount,
    vat_amount: amounts.vat_amount,
    total_amount: amounts.gross_amount,
    gross_amount: amounts.gross_amount,
    net_amount_display: formatGermanCurrencyDisplay(amounts.net_amount, currency),
    tax_amount_display: formatGermanCurrencyDisplay(amounts.vat_amount, currency),
    total_amount_display: formatGermanCurrencyDisplay(amounts.gross_amount, currency),
    payment_due: paymentDue,
    payment_deadline: paymentDue,
    payment_due_display: paymentDue ? formatGermanDate(paymentDue) : null,
    account_holder,
    iban,
    bic,
    bank_name,
    currency,
    small_business_rule: invoice.is_small_business,
    small_business_notice,
    payment_terms,
    optional_notes,
    customer_short_code,
    file_name_base: fileNameBase,
    pdf_file_name: pdfFileName,
    google_doc_file_name: fileNameBase,
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    invoice_language:
      form.invoice_language === "de" || storedMeta.invoice_language === "de" ? "de" : "en",
  };
}

export const N8N_WEBHOOK_NOT_FOUND_MESSAGE =
  "n8n Webhook nicht gefunden. Prüfe: Workflow aktiv? Production-URL statt Test-URL? Webhook-Pfad korrekt?";

export function maskWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveKeys = /secret|token|key|password|auth|signature/i;

    parsed.searchParams.forEach((_, key) => {
      if (sensitiveKeys.test(key)) {
        parsed.searchParams.set(key, "***");
      }
    });

    return parsed.toString();
  } catch {
    return url.replace(
      /([?&](?:token|secret|key|password|auth|signature)=)[^&]+/gi,
      "$1***"
    );
  }
}

export function n8nWebhookErrorMessage(httpStatus: number, detail?: string | null): string {
  if (httpStatus === 404) {
    return N8N_WEBHOOK_NOT_FOUND_MESSAGE;
  }

  const trimmed = detail?.trim();
  if (trimmed) {
    return `n8n Webhook fehlgeschlagen (HTTP ${httpStatus}): ${trimmed}`;
  }

  return `n8n Webhook fehlgeschlagen (HTTP ${httpStatus})`;
}

export class N8nWebhookError extends Error {
  readonly httpStatus: number;
  readonly responseBody: string;

  constructor(message: string, httpStatus: number, responseBody = "") {
    super(message);
    this.name = "N8nWebhookError";
    this.httpStatus = httpStatus;
    this.responseBody = responseBody;
  }
}

export async function callN8nWebhook(payload: Record<string, unknown>) {
  const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;
  const secret = process.env.N8N_INVOICE_SECRET;

  if (!webhookUrl || !secret) {
    throw new Error("n8n Webhook-Konfiguration fehlt.");
  }

  console.error(`[n8n] Calling webhook: ${maskWebhookUrl(webhookUrl)}`);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-invoice-secret": secret,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!response.ok) {
      const message = n8nWebhookErrorMessage(response.status, text.slice(0, 200));
      throw new N8nWebhookError(message, response.status, text.slice(0, 500));
    }
    throw new Error(`Ungültige Antwort vom n8n Webhook: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const detail = (data.error as string) || (data.message as string) || text.slice(0, 200);
    const message = n8nWebhookErrorMessage(response.status, detail);
    console.error(
      `[n8n] Webhook failed: HTTP ${response.status} — ${maskWebhookUrl(webhookUrl)} — ${detail}`
    );
    throw new N8nWebhookError(message, response.status, text.slice(0, 500));
  }

  return data;
}

export interface N8nDocumentUrls {
  google_doc_url: string | null;
  pdf_url: string | null;
  google_doc_id: string | null;
  pdf_file_id: string | null;
}

export function parseN8nDocumentUrls(response: Record<string, unknown>): N8nDocumentUrls {
  return {
    google_doc_url: sanitizeExternalUrl(response.google_doc_url as string | undefined),
    pdf_url: sanitizeExternalUrl(response.pdf_url as string | undefined),
    google_doc_id:
      typeof response.google_doc_id === "string" && response.google_doc_id.trim()
        ? response.google_doc_id.trim()
        : null,
    pdf_file_id:
      typeof response.pdf_file_id === "string" && response.pdf_file_id.trim()
        ? response.pdf_file_id.trim()
        : null,
  };
}

export function parseN8nGenerationSteps(
  response: Record<string, unknown>,
  fallbackUrls?: { googleDocUrl?: string | null; pdfUrl?: string | null }
): GenerationResultStep[] {
  const rawSteps = response.steps;

  if (Array.isArray(rawSteps) && rawSteps.length > 0) {
    const parsed: GenerationResultStep[] = [];

    for (const item of rawSteps) {
      if (!item || typeof item !== "object") continue;

      const step = item as Record<string, unknown>;
      const key = typeof step.key === "string" ? step.key.trim() : "";
      const label = typeof step.label === "string" ? step.label.trim() : "";
      const status = typeof step.status === "string" ? step.status.trim() : "completed";
      const url = sanitizeExternalUrl(step.url as string | undefined);

      if (!key || !label) continue;

      parsed.push({ key, label, status, ...(url ? { url } : {}) });
    }

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return buildDefaultCompletedSteps(fallbackUrls);
}
