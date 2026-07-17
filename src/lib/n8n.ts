import type { Invoice, InvoiceFormData } from "@/lib/types/database";
import { buildCustomerShortCode, buildInvoiceFileName } from "@/lib/invoices";
import {
  calculateInvoiceAmounts,
  parseCompanyAddress,
  invoiceNotesMeta,
  normalizeInvoiceFormData,
  normalizeIsoDate,
  getServicePeriodFieldErrors,
  type InvoiceWebhookProfile,
} from "@/lib/invoice-form";
import {
  formatGermanCurrencyDisplay,
  formatGermanDate,
  INVOICE_LABELS,
  resolveInvoiceCurrency,
} from "@/lib/utils";
import { normalizeDocumentLink } from "@/lib/urls";
import { resolveStoredDropboxSharedUrl } from "@/lib/dropbox-documents";
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

  return { ...errors, ...getServicePeriodFieldErrors(normalized) };
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

  const smallBusiness = invoice.is_small_business ?? form.small_business_rule;
  const persistedAmounts =
    Number.isFinite(Number(invoice.net_amount)) && Number(invoice.net_amount) > 0
      ? {
          net_amount: Number(invoice.net_amount),
          vat_rate: Number(invoice.vat_rate ?? 0),
          vat_amount: Number(invoice.vat_amount ?? 0),
          gross_amount: Number(invoice.gross_amount ?? invoice.net_amount),
        }
      : null;
  const amounts =
    persistedAmounts ?? calculateInvoiceAmounts(form.amount_net, smallBusiness);
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
    small_business_rule: smallBusiness,
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
  "n8n webhook is not active. Activate the production webhook or click Execute Workflow in n8n test mode.";

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

export class N8nWebhookUnavailableError extends Error {
  readonly statusCode: number;
  readonly webhookMode: "test" | "production" | "unknown";
  readonly responseBody?: string;

  constructor(options: {
    message: string;
    statusCode: number;
    webhookMode: "test" | "production" | "unknown";
    responseBody?: string;
  }) {
    super(options.message);
    this.name = "N8nWebhookUnavailableError";
    this.statusCode = options.statusCode;
    this.webhookMode = options.webhookMode;
    this.responseBody = options.responseBody;
  }
}

export interface N8nWebhookCallResult {
  httpStatus: number;
  rawText: string;
  rawResult: unknown;
  n8nResult: Record<string, unknown>;
}

export function normalizeN8nWebhookPayload(rawResult: unknown): Record<string, unknown> {
  const candidate = Array.isArray(rawResult) ? rawResult[0] : rawResult;
  if (!candidate || typeof candidate !== "object") return {};

  const record = candidate as Record<string, unknown>;
  if (record.json && typeof record.json === "object" && !Array.isArray(record.json)) {
    return record.json as Record<string, unknown>;
  }

  return record;
}

const N8N_RESPONSE_TIMEOUT_MS = 30_000;

function resolveWebhookMode(webhookUrl: string): "test" | "production" | "unknown" {
  if (webhookUrl.includes("/webhook-test/")) {
    return "test";
  }
  if (webhookUrl.includes("/webhook/")) {
    return "production";
  }
  return "unknown";
}

function isN8nWebhookUnavailableResponse(statusCode: number, responseBody: string): boolean {
  if (statusCode !== 404) {
    return false;
  }

  const normalized = responseBody.toLowerCase();

  return (
    normalized.includes("webhook is not registered") ||
    normalized.includes("requested webhook is not registered") ||
    normalized.includes("webhook not found") ||
    normalized.includes("webhook does not exist") ||
    normalized.includes("not currently registered") ||
    normalized.includes("test webhook")
  );
}

function throwIfN8nWebhookUnavailable(
  statusCode: number,
  responseBody: string,
  webhookMode: "test" | "production" | "unknown"
): void {
  if (!isN8nWebhookUnavailableResponse(statusCode, responseBody)) {
    return;
  }

  const message =
    webhookMode === "test"
      ? 'The n8n test webhook is not listening. Open the workflow in n8n and click "Listen for test event" or "Execute workflow", then try again.'
      : webhookMode === "production"
        ? "The n8n production webhook is not available. Confirm that the workflow is active and that the production webhook URL is correct."
        : "The configured n8n webhook is not available. Confirm that the webhook URL is correct and that the workflow is listening.";

  throw new N8nWebhookUnavailableError({
    message,
    statusCode,
    webhookMode,
    responseBody: responseBody.slice(0, 500),
  });
}

export async function callN8nWebhook(payload: Record<string, unknown>): Promise<N8nWebhookCallResult> {
  const webhookUrl = process.env.N8N_INVOICE_WEBHOOK_URL;
  const secret = process.env.N8N_INVOICE_SECRET;

  if (!webhookUrl || !secret) {
    throw new Error("n8n Webhook-Konfiguration fehlt.");
  }

  const webhookMode = resolveWebhookMode(webhookUrl);

  console.error(`[n8n] Calling webhook: ${maskWebhookUrl(webhookUrl)}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, N8N_RESPONSE_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-invoice-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    throwIfN8nWebhookUnavailable(response.status, text, webhookMode);
    let rawResult: unknown = {};

    try {
      rawResult = text ? JSON.parse(text) : {};
    } catch {
      console.error("[n8n] HTTP status:", response.status);
      console.error("[n8n] Raw response (non-JSON):", text.slice(0, 2000));
      if (!response.ok) {
        const message = n8nWebhookErrorMessage(response.status, text.slice(0, 200));
        throw new N8nWebhookError(message, response.status, text.slice(0, 500));
      }
      throw new Error(`Ungültige Antwort vom n8n Webhook: ${text.slice(0, 200)}`);
    }

    const n8nResult = normalizeN8nWebhookPayload(rawResult);

    console.error("[n8n] HTTP status:", response.status);
    console.error("[n8n] Raw n8n response:", JSON.stringify(rawResult).slice(0, 2000));
    console.error("[n8n] Normalized n8n result:", JSON.stringify(n8nResult).slice(0, 2000));

    if (!response.ok) {
      const detail =
        (n8nResult.error as string) ||
        (n8nResult.message as string) ||
        text.slice(0, 200);
      const message = n8nWebhookErrorMessage(response.status, detail);
      console.error(
        `[n8n] Webhook failed: HTTP ${response.status} — ${maskWebhookUrl(webhookUrl)} — ${detail}`
      );
      throw new N8nWebhookError(message, response.status, text.slice(0, 500));
    }

    return {
      httpStatus: response.status,
      rawText: text,
      rawResult,
      n8nResult,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "n8n response timed out after 30 seconds. The workflow may still be running."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function readN8nStringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapN8nResponse(data: unknown): Record<string, unknown> {
  return normalizeN8nWebhookPayload(data);
}

function readN8nDocumentLink(value: unknown): string | null {
  return normalizeDocumentLink(typeof value === "string" ? value : null);
}

export interface N8nDocumentUrls {
  google_doc_url: string | null;
  pdf_url: string | null;
  google_doc_id: string | null;
  pdf_file_id: string | null;
  docx_url: string | null;
  docx_file_id: string | null;
  dropbox_pdf_url: string | null;
  dropbox_docx_url: string | null;
}

export interface N8nGenerationResponse extends N8nDocumentUrls {
  success: boolean;
  workflow_status: string | null;
  invoice_number: string | null;
  steps: GenerationResultStep[];
  raw: Record<string, unknown>;
}

export function parseN8nDocumentUrls(response: Record<string, unknown>): N8nDocumentUrls {
  const parsed = parseN8nGenerationResponse(response);
  return {
    google_doc_url: parsed.google_doc_url,
    pdf_url: parsed.pdf_url,
    google_doc_id: parsed.google_doc_id,
    pdf_file_id: parsed.pdf_file_id,
    docx_url: parsed.docx_url,
    docx_file_id: parsed.docx_file_id,
    dropbox_pdf_url: parsed.dropbox_pdf_url,
    dropbox_docx_url: parsed.dropbox_docx_url,
  };
}

export function parseN8nGenerationResponse(data: unknown): N8nGenerationResponse {
  const response = unwrapN8nResponse(data);
  const success = response.success !== false;
  const google_doc_url = readN8nDocumentLink(response.google_doc_url);
  const pdf_url = readN8nDocumentLink(response.pdf_url);
  const docx_url = readN8nDocumentLink(response.docx_url);
  const dropbox_pdf_url = readN8nDocumentLink(response.dropbox_pdf_url);
  const dropbox_docx_url = readN8nDocumentLink(response.dropbox_docx_url);

  const steps = parseN8nGenerationSteps(response, {
    googleDocUrl: google_doc_url,
    pdfUrl: pdf_url,
    docxUrl: docx_url,
    dropboxPdfUrl: dropbox_pdf_url,
    dropboxDocxUrl: dropbox_docx_url,
  });

  const resolvedDropboxPdfUrl =
    resolveStoredDropboxSharedUrl(dropbox_pdf_url, steps, "pdf") ?? dropbox_pdf_url;
  const resolvedDropboxDocxUrl =
    resolveStoredDropboxSharedUrl(dropbox_docx_url, steps, "docx") ?? dropbox_docx_url;

  return {
    success,
    workflow_status: readN8nStringField(response.workflow_status),
    invoice_number: readN8nStringField(response.invoice_number),
    google_doc_url,
    pdf_url,
    google_doc_id: readN8nStringField(response.google_doc_id),
    pdf_file_id: readN8nStringField(response.pdf_file_id),
    docx_url,
    docx_file_id: readN8nStringField(response.docx_file_id),
    dropbox_pdf_url: resolvedDropboxPdfUrl,
    dropbox_docx_url: resolvedDropboxDocxUrl,
    steps,
    raw: response,
  };
}

export function parseN8nGenerationSteps(
  response: Record<string, unknown>,
  fallbackUrls?: {
    googleDocUrl?: string | null;
    pdfUrl?: string | null;
    docxUrl?: string | null;
    dropboxPdfUrl?: string | null;
    dropboxDocxUrl?: string | null;
  }
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
      const url = readN8nDocumentLink(step.url as string | undefined);

      if (!key || !label) continue;

      parsed.push({ key, label, status, ...(url ? { url } : {}) });
    }

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return buildDefaultCompletedSteps(fallbackUrls);
}