import type { Invoice } from "@/lib/types/database";
import { invoiceNotesMeta, invoicePdfUrl, invoiceGoogleDocUrl } from "@/lib/invoice-form";
import { resolveGenerationStatus } from "@/lib/generation-status";
import { sanitizeExternalUrl } from "@/lib/urls";

export function isInvoiceArchived(invoice: Invoice): boolean {
  return Boolean(invoiceNotesMeta(invoice).archived);
}

export function isInvoiceGenerated(invoice: Invoice): boolean {
  if (invoice.status !== "draft") return true;
  if (invoice.generated_at) return true;
  if (invoice.google_doc_url || invoice.pdf_url) return true;
  if (invoiceGoogleDocUrl(invoice) || invoicePdfUrl(invoice)) return true;
  const gen = resolveGenerationStatus(invoice);
  return gen === "COMPLETED";
}

export function canDeleteInvoice(invoice: Invoice): boolean {
  if (isInvoiceArchived(invoice)) return false;
  if (invoice.status === "cancelled") return false;
  return invoice.status === "draft" && !isInvoiceGenerated(invoice);
}

export function canArchiveInvoice(invoice: Invoice): boolean {
  if (isInvoiceArchived(invoice)) return false;
  if (invoice.status === "cancelled") return false;
  return invoice.status !== "draft";
}

export function canCancelInvoice(invoice: Invoice): boolean {
  if (isInvoiceArchived(invoice)) return false;
  if (invoice.status === "cancelled") return false;
  return ["draft", "generated", "sent", "paid"].includes(invoice.status);
}

export function canRegenerateInvoice(invoice: Invoice): boolean {
  if (isInvoiceArchived(invoice)) return false;
  if (invoice.status === "cancelled") return false;
  return invoice.status !== "draft";
}

export function canDuplicateInvoice(invoice: Invoice): boolean {
  return !isInvoiceArchived(invoice);
}

export type DocumentHealthLevel = "ok" | "warning" | "attention";

export interface DocumentHealthIssue {
  invoiceId: string;
  invoiceNumber: string;
  level: DocumentHealthLevel;
  message: string;
}

export function checkInvoiceDocumentHealth(invoice: Invoice): DocumentHealthIssue[] {
  const issues: DocumentHealthIssue[] = [];
  const base = { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number };

  const meta = invoiceNotesMeta(invoice);
  const googleUrl = sanitizeExternalUrl(invoice.google_doc_url) || sanitizeExternalUrl(meta.google_doc_url);
  const pdfUrl = sanitizeExternalUrl(invoice.pdf_url) || sanitizeExternalUrl(meta.pdf_url);

  if (invoice.google_doc_id && !googleUrl) {
    issues.push({
      ...base,
      level: "attention",
      message: "Google Doc-ID vorhanden, aber keine gültige URL.",
    });
  }

  if (invoice.pdf_file_id && !pdfUrl) {
    issues.push({
      ...base,
      level: "attention",
      message: "PDF-Datei-ID vorhanden, aber keine gültige URL.",
    });
  }

  const generationStatus = resolveGenerationStatus(invoice);
  if (
    (generationStatus === "COMPLETED" || invoice.workflow_status === "completed") &&
    !pdfUrl &&
    invoice.status !== "draft"
  ) {
    issues.push({
      ...base,
      level: "warning",
      message: "Als abgeschlossen markiert, aber PDF-Link fehlt.",
    });
  }

  if (invoice.status !== "draft" && !googleUrl && !pdfUrl && !invoice.google_doc_id && !invoice.pdf_file_id) {
    issues.push({
      ...base,
      level: "warning",
      message: "Keine Dokumentenlinks oder IDs hinterlegt.",
    });
  }

  return issues;
}

export function summarizeDocumentHealth(issues: DocumentHealthIssue[]): DocumentHealthLevel {
  if (issues.some((i) => i.level === "attention")) return "attention";
  if (issues.some((i) => i.level === "warning")) return "warning";
  return "ok";
}
