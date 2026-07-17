import type { Customer, Invoice, InvoiceFormData, Profile } from "@/lib/types/database";
import { INITIAL_INVOICE_GENERATION_STATE } from "@/lib/generation-status";
import { parseMultilineCustomerAddress, germanAddressFieldsToMultiline } from "@/lib/google-places";
import { formatCustomerAddress, INVOICE_LABELS, resolveInvoiceCurrency, formatDateDE } from "@/lib/utils";
import {
  hasStoredDocumentReference,
  isStoredDropboxPath,
  normalizeDocumentLink,
  resolveInvoiceDocumentDownloadHref,
  sanitizeExternalUrl,
} from "@/lib/urls";
import {
  pickPreferredDropboxDocumentUrl,
  resolveDropboxPathForDownload,
  resolveStoredDropboxReference,
  resolveStoredDropboxSharedUrl,
} from "@/lib/dropbox-documents";
import type { GenerationResultStep } from "@/lib/generation-status";
import { buildDefaultCompletedSteps } from "@/lib/generation-status";

export interface InvoiceWebhookProfile {
  sender_name?: string | null;
  sender_address?: string | null;
  email?: string | null;
  phone?: string | null;
  tax_number?: string | null;
}

const META_MARKER = "__IMS_INVOICE_META__";

export const DEFAULT_INVOICE_TITLE = "Rechnung";

const SERVICE_LINE_NUMBER_PREFIX = /^\s*\d+\.\s*/;

export function normalizeServiceDescription(value: string): string {
  return value
    .split("\n")
    .map((line) => line.replace(SERVICE_LINE_NUMBER_PREFIX, "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function normalizeCustomerSalutation(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^guten\s+tag\b/i.test(trimmed)) return "";
  if (/^hello\b/i.test(trimmed)) return "";
  if (/^hi\b/i.test(trimmed)) return "";
  return trimmed;
}

export function normalizeAmountNet(value: string): string {
  const normalized = value.replace(/\s/g, "").replace(",", ".").trim();
  if (!normalized) return "";

  const num = parseFloat(normalized);
  if (Number.isNaN(num) || num <= 0) return normalized;

  return String(num);
}

export function normalizeIsoDate(value: string): string {
  return value?.trim().split("T")[0] || "";
}

export function formatServicePeriod(start: string, end: string): string {
  const service_period_start = normalizeIsoDate(start);
  const service_period_end = normalizeIsoDate(end);
  if (!service_period_start || !service_period_end) return "";

  return `${formatDateDE(service_period_start)} - ${formatDateDE(service_period_end)}`;
}

function parseGermanDateSegment(segment: string): string {
  const match = segment.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!day || !month || !year || month > 12 || day > 31) return "";

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseServicePeriod(value: string | null | undefined): {
  service_period_start: string;
  service_period_end: string;
} {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return { service_period_start: "", service_period_end: "" };
  }

  const parts = trimmed.split(/\s*[-–—]\s*/);
  if (parts.length === 2) {
    const service_period_start =
      parseGermanDateSegment(parts[0]) || normalizeIsoDate(parts[0]);
    const service_period_end =
      parseGermanDateSegment(parts[1]) || normalizeIsoDate(parts[1]);
    if (service_period_start && service_period_end) {
      return { service_period_start, service_period_end };
    }
  }

  return { service_period_start: "", service_period_end: "" };
}

export type ServicePeriodFieldErrors = Partial<
  Pick<InvoiceFormData, "service_period_start" | "service_period_end">
>;

export function getServicePeriodFieldErrors(data: InvoiceFormData): ServicePeriodFieldErrors {
  const errors: ServicePeriodFieldErrors = {};
  const start = normalizeIsoDate(data.service_period_start);
  const end = normalizeIsoDate(data.service_period_end);

  if (!start) {
    errors.service_period_start = "servicePeriodStartRequired";
  }
  if (!end) {
    errors.service_period_end = "servicePeriodEndRequired";
  }
  if (start && end && end < start) {
    errors.service_period_end = "servicePeriodEndAfterStart";
  }

  return errors;
}

export function normalizeInvoiceFormData(form: InvoiceFormData): InvoiceFormData {
  return {
    ...form,
    invoice_title: form.invoice_title.trim() || DEFAULT_INVOICE_TITLE,
    customer_name: form.customer_name.trim(),
    customer_salutation: normalizeCustomerSalutation(form.customer_salutation),
    customer_address: form.customer_address.trim(),
    customer_zip: form.customer_zip.trim(),
    customer_city: form.customer_city.trim(),
    customer_country: form.customer_country.trim(),
    service_description: normalizeServiceDescription(form.service_description),
    service_period_start: normalizeIsoDate(form.service_period_start),
    service_period_end: normalizeIsoDate(form.service_period_end),
    amount_net: normalizeAmountNet(form.amount_net),
    currency: resolveInvoiceCurrency(form.currency),
    invoice_date: normalizeIsoDate(form.invoice_date),
    payment_deadline: normalizeIsoDate(form.payment_deadline),
    payment_terms: form.payment_terms.trim(),
    optional_notes: form.optional_notes.trim(),
    bank_name: form.bank_name.trim(),
    account_holder: form.account_holder.trim(),
    iban: form.iban.replace(/\s/g, "").trim(),
    bic: form.bic.trim(),
    tax_number: form.tax_number.trim(),
    invoice_language: form.invoice_language === "de" ? "de" : "en",
  };
}

export interface InvoiceNotesMeta {
  invoice_title: string;
  customer_salutation: string;
  customer_name: string;
  customer_address: string;
  customer_zip: string;
  customer_city: string;
  customer_country: string;
  service_description: string;
  payment_terms: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  bic: string;
  tax_number: string;
  user_notes: string;
  google_doc_url?: string;
  pdf_url?: string;
  docx_url?: string;
  docx_file_id?: string;
  dropbox_pdf_url?: string;
  dropbox_docx_url?: string;
  generation_steps?: GenerationResultStep[];
  archived?: boolean;
  archived_at?: string;
  invoice_language?: "en" | "de";
}

export function composeInvoiceCustomerAddress(parts: {
  customer_address: string;
  customer_zip: string;
  customer_city: string;
  customer_country?: string;
}): string {
  return germanAddressFieldsToMultiline({
    customer_address: parts.customer_address,
    customer_zip: parts.customer_zip,
    customer_city: parts.customer_city,
    customer_country: parts.customer_country?.trim() || "",
  });
}

export function parseInvoiceCustomerAddress(address: string) {
  return parseMultilineCustomerAddress(address);
}

export function unpackInvoiceNotes(stored: string | null | undefined): InvoiceNotesMeta {
  const value = stored?.trim() || "";
  if (!value.startsWith(META_MARKER)) {
    return {
      invoice_title: DEFAULT_INVOICE_TITLE,
      customer_salutation: "",
      customer_name: "",
      customer_address: value,
      customer_zip: "",
      customer_city: "",
      customer_country: "",
      service_description: "",
      payment_terms: "",
      bank_name: "",
      account_holder: "",
      iban: "",
      bic: "",
      tax_number: "",
      user_notes: value,
    };
  }

  const newlineIndex = value.indexOf("\n");
  const metaJson =
    newlineIndex === -1 ? value.slice(META_MARKER.length) : value.slice(META_MARKER.length, newlineIndex);
  const trailingNotes = newlineIndex === -1 ? "" : value.slice(newlineIndex + 1);

  try {
    const meta = JSON.parse(metaJson) as Partial<InvoiceNotesMeta>;
    return {
      invoice_title: meta.invoice_title?.trim() || DEFAULT_INVOICE_TITLE,
      customer_salutation: normalizeCustomerSalutation(meta.customer_salutation?.trim() || ""),
      customer_name: meta.customer_name?.trim() || "",
      customer_address: meta.customer_address?.trim() || "",
      customer_zip: meta.customer_zip?.trim() || "",
      customer_city: meta.customer_city?.trim() || "",
      customer_country: meta.customer_country?.trim() || "",
      service_description: normalizeServiceDescription(meta.service_description?.trim() || ""),
      payment_terms: meta.payment_terms?.trim() || "",
      bank_name: meta.bank_name?.trim() || "",
      account_holder: meta.account_holder?.trim() || "",
      iban: meta.iban?.trim() || "",
      bic: meta.bic?.trim() || "",
      tax_number: meta.tax_number?.trim() || "",
      user_notes: meta.user_notes?.trim() || trailingNotes,
      google_doc_url: normalizeDocumentLink(meta.google_doc_url) || undefined,
      pdf_url: normalizeDocumentLink(meta.pdf_url) || undefined,
      docx_url: normalizeDocumentLink(meta.docx_url) || undefined,
      docx_file_id: meta.docx_file_id?.trim() || undefined,
      dropbox_pdf_url: normalizeDocumentLink(meta.dropbox_pdf_url) || undefined,
      dropbox_docx_url: normalizeDocumentLink(meta.dropbox_docx_url) || undefined,
      archived: meta.archived === true,
      archived_at: meta.archived_at?.trim() || undefined,
      generation_steps: Array.isArray(meta.generation_steps)
        ? meta.generation_steps
            .map((step): GenerationResultStep | null => {
              if (!step || typeof step !== "object") return null;
              const item = step as Partial<GenerationResultStep>;
              const key = item.key?.trim() || "";
              const label = item.label?.trim() || "";
              if (!key || !label) return null;
              const url = sanitizeExternalUrl(item.url);
              return {
                key,
                label,
                status: item.status?.trim() || "completed",
                ...(url ? { url } : {}),
              };
            })
            .filter((step): step is GenerationResultStep => step !== null)
        : undefined,
    };
  } catch {
    return {
      invoice_title: DEFAULT_INVOICE_TITLE,
      customer_salutation: "",
      customer_name: "",
      customer_address: "",
      customer_zip: "",
      customer_city: "",
      customer_country: "",
      service_description: "",
      payment_terms: "",
      bank_name: "",
      account_holder: "",
      iban: "",
      bic: "",
      tax_number: "",
      user_notes: value,
    };
  }
}

export function packInvoiceNotes(meta: InvoiceNotesMeta): string {
  const payload: InvoiceNotesMeta = {
    ...meta,
    invoice_title: meta.invoice_title.trim() || DEFAULT_INVOICE_TITLE,
    customer_salutation: normalizeCustomerSalutation(meta.customer_salutation.trim()),
    customer_name: meta.customer_name.trim(),
    customer_address: meta.customer_address.trim(),
    customer_zip: meta.customer_zip.trim(),
    customer_city: meta.customer_city.trim(),
    customer_country: meta.customer_country.trim(),
    service_description: normalizeServiceDescription(meta.service_description.trim()),
    payment_terms: meta.payment_terms.trim(),
    bank_name: meta.bank_name.trim(),
    account_holder: meta.account_holder.trim(),
    iban: meta.iban.trim(),
    bic: meta.bic.trim(),
    tax_number: meta.tax_number.trim(),
    user_notes: meta.user_notes.trim(),
  };

  const hasMeta =
    payload.invoice_title !== DEFAULT_INVOICE_TITLE ||
    payload.customer_salutation ||
    payload.customer_name ||
    payload.customer_address ||
    payload.customer_zip ||
    payload.customer_city ||
    payload.customer_country ||
    payload.service_description ||
    payload.payment_terms ||
    payload.bank_name ||
    payload.account_holder ||
    payload.iban ||
    payload.bic ||
    payload.tax_number ||
    payload.google_doc_url ||
    payload.pdf_url ||
    payload.docx_url ||
    payload.docx_file_id ||
    payload.dropbox_pdf_url ||
    payload.dropbox_docx_url ||
    payload.generation_steps?.length ||
    payload.archived;

  if (!hasMeta && !payload.user_notes) {
    return "";
  }

  return `${META_MARKER}${JSON.stringify(payload)}`;
}

export function formToNotesMeta(form: InvoiceFormData): InvoiceNotesMeta {
  const normalized = normalizeInvoiceFormData(form);

  return {
    invoice_title: normalized.invoice_title,
    customer_salutation: normalized.customer_salutation,
    customer_name: normalized.customer_name,
    customer_address: composeInvoiceCustomerAddress({
      customer_address: normalized.customer_address,
      customer_zip: normalized.customer_zip,
      customer_city: normalized.customer_city,
      customer_country: normalized.customer_country,
    }),
    customer_zip: normalized.customer_zip,
    customer_city: normalized.customer_city,
    customer_country: normalized.customer_country,
    service_description: normalized.service_description,
    payment_terms: normalized.payment_terms,
    bank_name: normalized.bank_name,
    account_holder: normalized.account_holder,
    iban: normalized.iban,
    bic: normalized.bic,
    tax_number: normalized.tax_number,
    user_notes: normalized.optional_notes,
    invoice_language: normalized.invoice_language === "de" ? "de" : "en",
  };
}

export function mergeInvoiceArchiveState(
  notes: string | null | undefined,
  archived: boolean
): string {
  const meta = unpackInvoiceNotes(notes);
  return packInvoiceNotes({
    ...meta,
    archived,
    archived_at: archived ? new Date().toISOString() : undefined,
  });
}

export interface InvoiceDocumentMetadata {
  google_doc_url?: string | null;
  pdf_url?: string | null;
  docx_url?: string | null;
  docx_file_id?: string | null;
  dropbox_pdf_url?: string | null;
  dropbox_docx_url?: string | null;
}

export function mergeInvoiceDocumentUrls(
  notes: string | null | undefined,
  urls: InvoiceDocumentMetadata
): string {
  return mergeInvoiceGenerationMetadata(notes, urls);
}

export function mergeInvoiceGenerationMetadata(
  notes: string | null | undefined,
  metadata: InvoiceDocumentMetadata,
  steps?: GenerationResultStep[] | null
): string {
  const meta = unpackInvoiceNotes(notes);

  const googleDocUrl =
    metadata.google_doc_url !== undefined
      ? normalizeDocumentLink(metadata.google_doc_url)
      : normalizeDocumentLink(meta.google_doc_url);
  const pdfUrl =
    metadata.pdf_url !== undefined
      ? normalizeDocumentLink(metadata.pdf_url)
      : normalizeDocumentLink(meta.pdf_url);
  const docxUrl =
    metadata.docx_url !== undefined
      ? normalizeDocumentLink(metadata.docx_url)
      : normalizeDocumentLink(meta.docx_url);
  const dropboxPdfUrl =
    metadata.dropbox_pdf_url !== undefined
      ? normalizeDocumentLink(metadata.dropbox_pdf_url)
      : normalizeDocumentLink(meta.dropbox_pdf_url);
  const dropboxDocxUrl =
    metadata.dropbox_docx_url !== undefined
      ? normalizeDocumentLink(metadata.dropbox_docx_url)
      : normalizeDocumentLink(meta.dropbox_docx_url);
  const docxFileId =
    metadata.docx_file_id !== undefined
      ? metadata.docx_file_id?.trim() || undefined
      : meta.docx_file_id;

  return packInvoiceNotes({
    ...meta,
    google_doc_url: googleDocUrl || undefined,
    pdf_url: pdfUrl || undefined,
    docx_url: docxUrl || undefined,
    docx_file_id: docxFileId || undefined,
    dropbox_pdf_url: dropboxPdfUrl || undefined,
    dropbox_docx_url: dropboxDocxUrl || undefined,
    generation_steps: steps?.length ? steps : meta.generation_steps,
  });
}

export function mergeInvoiceGenerationSteps(
  notes: string | null | undefined,
  steps: GenerationResultStep[] | null | undefined
): string {
  return mergeInvoiceGenerationMetadata(notes, {}, steps);
}

export function calculateInvoiceAmounts(amountNet: string, smallBusinessRule: boolean) {
  const net = parseFloat(amountNet);
  if (Number.isNaN(net) || net <= 0) {
    return { net_amount: 0, vat_rate: 0, vat_amount: 0, gross_amount: 0 };
  }

  if (smallBusinessRule) {
    return { net_amount: net, vat_rate: 0, vat_amount: 0, gross_amount: net };
  }

  return { net_amount: net, vat_rate: 0, vat_amount: 0, gross_amount: net };
}

export function invoiceFormToDbPayload(
  data: InvoiceFormData,
  invoiceNumber: string,
  status: Invoice["status"] = "draft",
  workflowStatus?: Invoice["workflow_status"]
) {
  const normalized = normalizeInvoiceFormData(data);
  const amounts = calculateInvoiceAmounts(normalized.amount_net, normalized.small_business_rule);

  return {
    customer_id: normalized.customer_id || null,
    template_id: null,
    invoice_number: invoiceNumber,
    invoice_date: normalized.invoice_date,
    service_period: formatServicePeriod(
      normalized.service_period_start,
      normalized.service_period_end
    ) || null,
    payment_deadline: normalized.payment_deadline || null,
    currency: normalized.currency,
    net_amount: amounts.net_amount,
    vat_rate: amounts.vat_rate,
    vat_amount: amounts.vat_amount,
    gross_amount: amounts.gross_amount,
    is_small_business: normalized.small_business_rule,
    small_business_notice: normalized.small_business_rule ? INVOICE_LABELS.small_business : null,
    notes: packInvoiceNotes(formToNotesMeta(normalized)) || null,
    status,
    payment_status: status === "paid" ? "paid" : "unpaid",
    workflow_status: workflowStatus ?? (status === "draft" ? "draft" : "pending"),
  };
}

export function customerToInvoiceAddressFields(customer: Customer) {
  if (customer.street?.trim() || customer.postal_code?.trim() || customer.city?.trim()) {
    return {
      customer_address: customer.street?.trim() || "",
      customer_zip: customer.postal_code?.trim() || "",
      customer_city: customer.city?.trim() || "",
      customer_country: customer.country?.trim() || "",
    };
  }

  return parseInvoiceCustomerAddress(formatCustomerAddress(customer));
}

export function invoiceNotesMeta(invoice: Invoice): InvoiceNotesMeta {
  return unpackInvoiceNotes(invoice.notes);
}

export function invoiceCustomerName(invoice: Invoice): string {
  return invoiceNotesMeta(invoice).customer_name || "—";
}

export function invoiceCustomerAddress(invoice: Invoice): string {
  const meta = invoiceNotesMeta(invoice);
  if (meta.customer_address) return meta.customer_address;
  return composeInvoiceCustomerAddress({
    customer_address: "",
    customer_zip: meta.customer_zip,
    customer_city: meta.customer_city,
    customer_country: meta.customer_country,
  });
}

export function invoiceServiceDescription(invoice: Invoice): string {
  return invoiceNotesMeta(invoice).service_description;
}

export function invoicePdfUrl(invoice: Invoice): string | null {
  const meta = invoiceNotesMeta(invoice);
  return resolveStoredDropboxSharedUrl(
    invoice.dropbox_pdf_url ?? meta.dropbox_pdf_url ?? invoice.pdf_url ?? meta.pdf_url,
    meta.generation_steps,
    "pdf"
  );
}

export function invoiceGoogleDocUrl(invoice: Invoice): string | null {
  return (
    sanitizeExternalUrl(invoice.google_doc_url) ??
    sanitizeExternalUrl(invoiceNotesMeta(invoice).google_doc_url)
  );
}

export function invoiceDocxUrl(invoice: Invoice): string | null {
  const meta = invoiceNotesMeta(invoice);
  return resolveStoredDropboxSharedUrl(
    invoice.dropbox_docx_url ?? meta.dropbox_docx_url ?? meta.docx_url,
    meta.generation_steps,
    "docx"
  );
}

export interface InvoiceDocumentUrls {
  googleDocUrl: string | null;
  pdfDownloadHref: string | null;
  docxDownloadHref: string | null;
  pdfGenerated: boolean;
  docxGenerated: boolean;
  pdfSavedInDropbox: boolean;
  docxSavedInDropbox: boolean;
  dropboxPdfPath: string | null;
  dropboxDocxPath: string | null;
}

function preferPathForArchiveDisplay(
  primary: string | null,
  fallback: string | null
): string | null {
  if (isStoredDropboxPath(primary)) return primary;
  if (isStoredDropboxPath(fallback)) return fallback;
  return primary ?? fallback;
}

export function invoiceDocumentUrls(invoice: Invoice): InvoiceDocumentUrls {
  const meta = invoiceNotesMeta(invoice);
  const steps = meta.generation_steps;

  const dropboxPdf =
    pickPreferredDropboxDocumentUrl(
      invoice.dropbox_pdf_url,
      meta.dropbox_pdf_url,
      resolveStoredDropboxReference(invoice.dropbox_pdf_url ?? meta.dropbox_pdf_url, steps, "pdf")
    ) ?? null;
  const pdfFallback =
    pickPreferredDropboxDocumentUrl(invoice.pdf_url, meta.pdf_url) ?? null;

  const dropboxDocx =
    pickPreferredDropboxDocumentUrl(
      invoice.dropbox_docx_url,
      meta.dropbox_docx_url,
      resolveStoredDropboxReference(invoice.dropbox_docx_url ?? meta.dropbox_docx_url, steps, "docx")
    ) ?? null;
  const docxFallback = pickPreferredDropboxDocumentUrl(meta.docx_url) ?? null;

  // Priority: dropbox_*_url || pdf_url / docx_url (single source per card — no duplicates)
  const pdfSource = dropboxPdf ?? pdfFallback;
  let docxSource = dropboxDocx ?? docxFallback;

  // Avoid rendering the same file as both PDF and DOCX
  if (docxSource && pdfSource && docxSource === pdfSource) {
    const lower = docxSource.toLowerCase();
    if (lower.endsWith(".docx") || lower.includes(".docx?")) {
      // keep on DOCX card only when extension is clearly docx
    } else if (lower.endsWith(".pdf") || lower.includes(".pdf?")) {
      docxSource = null;
    } else {
      docxSource = dropboxDocx && dropboxDocx !== pdfSource ? dropboxDocx : null;
    }
  }

  const pdfGenerated = hasStoredDocumentReference(pdfSource);
  const docxGenerated = hasStoredDocumentReference(docxSource);

  const pdfPath = resolveDropboxPathForDownload(
    invoice.dropbox_pdf_url,
    meta.dropbox_pdf_url,
    invoice.pdf_url,
    meta.pdf_url,
    dropboxPdf,
    pdfFallback
  );
  const docxPath = resolveDropboxPathForDownload(
    invoice.dropbox_docx_url,
    meta.dropbox_docx_url,
    meta.docx_url,
    dropboxDocx,
    docxFallback
  );

  return {
    googleDocUrl: invoiceGoogleDocUrl(invoice),
    pdfDownloadHref: pdfPath
      ? resolveInvoiceDocumentDownloadHref(invoice.id, "pdf", pdfPath, null)
      : null,
    docxDownloadHref: docxPath
      ? resolveInvoiceDocumentDownloadHref(invoice.id, "docx", docxPath, null)
      : null,
    pdfGenerated,
    docxGenerated,
    pdfSavedInDropbox: hasStoredDocumentReference(dropboxPdf),
    docxSavedInDropbox: hasStoredDocumentReference(dropboxDocx),
    dropboxPdfPath: preferPathForArchiveDisplay(pdfPath ?? dropboxPdf, pdfFallback),
    dropboxDocxPath: preferPathForArchiveDisplay(docxPath ?? dropboxDocx, docxFallback),
  };
}

export function invoiceGenerationSteps(invoice: Invoice): GenerationResultStep[] {
  const meta = invoiceNotesMeta(invoice);
  if (meta.generation_steps?.length) {
    return meta.generation_steps;
  }

  return buildDefaultCompletedSteps({
    googleDocUrl: invoiceGoogleDocUrl(invoice),
    pdfUrl: invoicePdfUrl(invoice),
  });
}

export function invoiceToFormData(
  invoice: Invoice,
  defaults?: Partial<InvoiceFormData>
): InvoiceFormData {
  const meta = invoiceNotesMeta(invoice);
  const address = parseInvoiceCustomerAddress(meta.customer_address);

  const period = parseServicePeriod(invoice.service_period ?? "");

  return normalizeInvoiceFormData({
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date ?? "",
    service_period_start: period.service_period_start,
    service_period_end: period.service_period_end,
    invoice_title: meta.invoice_title,
    customer_id: invoice.customer_id || "",
    customer_name: meta.customer_name,
    customer_salutation: meta.customer_salutation,
    customer_address: address.customer_address,
    customer_zip: address.customer_zip || meta.customer_zip,
    customer_city: address.customer_city || meta.customer_city,
    customer_country: address.customer_country || meta.customer_country,
    service_description: meta.service_description,
    amount_net: String(invoice.net_amount),
    currency: invoice.currency,
    payment_deadline: invoice.payment_deadline ?? "",
    payment_terms: meta.payment_terms || defaults?.payment_terms || "",
    optional_notes: meta.user_notes,
    small_business_rule: invoice.is_small_business,
    bank_name: meta.bank_name,
    account_holder: meta.account_holder || defaults?.account_holder || "",
    iban: meta.iban,
    bic: meta.bic,
    tax_number: meta.tax_number,
    invoice_language: meta.invoice_language || defaults?.invoice_language || "en",
  });
}

export const INVOICE_WORKFLOW_RESET = {
  status: "draft" as const,
  payment_status: "unpaid",
  workflow_status: "draft",
  workflow_error: null,
  ...INITIAL_INVOICE_GENERATION_STATE,
  google_doc_id: null,
  google_doc_url: null,
  pdf_file_id: null,
  pdf_url: null,
  dropbox_pdf_url: null,
  dropbox_docx_url: null,
  generated_at: null,
} as const;

/** Clears generated document/workflow columns when duplicating to a fresh draft. Requires migration 006. */
export const DUPLICATE_INVOICE_DB_RESET = INVOICE_WORKFLOW_RESET;

export function stripInvoiceWorkflowFromNotes(notes: string | null | undefined): string | null {
  const meta = unpackInvoiceNotes(notes);
  delete meta.google_doc_url;
  delete meta.pdf_url;
  delete meta.docx_url;
  delete meta.docx_file_id;
  delete meta.dropbox_pdf_url;
  delete meta.dropbox_docx_url;
  delete meta.generation_steps;
  delete meta.archived;
  delete meta.archived_at;
  const packed = packInvoiceNotes(meta);
  return packed || null;
}

export function invoiceToDuplicateFormData(
  invoice: Invoice,
  defaults?: Partial<InvoiceFormData>
): InvoiceFormData {
  return normalizeInvoiceFormData({
    ...invoiceToFormData(invoice, defaults),
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
  });
}

export function mergeSavedInvoiceIntoFormPayload(
  form: InvoiceFormData,
  invoice: Invoice
): InvoiceFormData {
  const fromDb = invoiceToFormData(invoice);
  const normalized = normalizeInvoiceFormData(form);

  return normalizeInvoiceFormData({
    ...fromDb,
    ...normalized,
    amount_net: String(invoice.net_amount),
    currency: invoice.currency,
    small_business_rule: invoice.is_small_business,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date ?? normalized.invoice_date,
    payment_deadline: invoice.payment_deadline ?? normalized.payment_deadline,
  });
}

export function parseCompanyAddress(profile: InvoiceWebhookProfile | Profile | null) {
  const parsed = parseMultilineCustomerAddress(profile?.sender_address || "");
  return {
    company_name: profile?.sender_name?.trim() || "",
    company_address: parsed.customer_address,
    company_zip: parsed.customer_zip,
    company_city: parsed.customer_city,
    company_phone: profile?.phone?.trim() || "",
    company_email: profile?.email?.trim() || "",
  };
}
