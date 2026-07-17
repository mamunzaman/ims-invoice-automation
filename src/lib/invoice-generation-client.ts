import type { InvoiceGenerationStatusPayload } from "@/app/api/invoices/[id]/generation-status/route";
import type { GenerationResultStep } from "@/lib/generation-status";
import {
  createCanonicalPendingSteps,
  generationStepToResultStep,
  inferCompletedStepsFromUrls,
  isPayloadGenerationSuccess,
  mergeGenerationSteps,
  mergeGenerateResults,
  normalizeGenerationResultSteps,
} from "@/lib/invoice-generation-steps";
import { normalizeDocumentLink } from "@/lib/urls";
import { resolveStoredDropboxSharedUrl } from "@/lib/dropbox-documents";

export interface InvoiceGenerateApiResponse {
  success?: boolean;
  invoice?: {
    id?: string;
    invoice_number?: string | null;
    pdf_url?: string | null;
    pdf_file_id?: string | null;
    google_doc_url?: string | null;
    google_doc_id?: string | null;
    generated_at?: string | null;
    status?: string;
    workflow_status?: string;
    generation_status?: string | null;
  };
  n8n?: {
    success?: boolean;
    workflow_status?: string | null;
    invoice_number?: string | null;
    google_doc_id?: string | null;
    google_doc_url?: string | null;
    pdf_file_id?: string | null;
    pdf_url?: string | null;
    docx_file_id?: string | null;
    docx_url?: string | null;
    dropbox_pdf_url?: string | null;
    dropbox_docx_url?: string | null;
    steps?: GenerationResultStep[];
  };
  workflow?: {
    status?: string;
    generation_status?: string;
    google_doc_url?: string | null;
    pdf_url?: string | null;
    docx_url?: string | null;
    dropbox_pdf_url?: string | null;
    dropbox_docx_url?: string | null;
    invoice_number?: string | null;
    generated_at?: string | null;
    steps?: GenerationResultStep[];
  };
  errors?: string[];
  error?: string;
  generation_error?: string;
  workflow_error?: string;
  workflow_status?: string;
  generation_status?: string;
}

export function isGenerateApiSuccess(data: InvoiceGenerateApiResponse): boolean {
  if (data.success === true) return true;
  if (data.n8n?.success === true) return true;
  if (data.workflow?.status === "completed") return true;
  if (data.workflow?.generation_status === "COMPLETED") return true;
  if (data.workflow_status === "completed") return true;
  if (data.generation_status === "COMPLETED") return true;
  return false;
}

export function isGenerationStatusComplete(
  data: Pick<
    InvoiceGenerationStatusPayload,
    "generation_status" | "pdf_url" | "workflow_status" | "invoice_status"
  >
): boolean {
  if (data.generation_status === "COMPLETED") return true;
  if (data.generation_status === "FAILED") return false;
  if (data.workflow_status === "completed") return true;
  if (data.invoice_status === "generated") return true;
  if (normalizeDocumentLink(data.pdf_url)) return true;
  return false;
}

export function normalizeGenerateApiResult(
  invoiceId: string,
  data: InvoiceGenerateApiResponse
): InvoiceGenerationStatusPayload {
  const n8n = data.n8n;
  const workflow = data.workflow;
  const invoice = data.invoice;

  const pdfUrl =
    normalizeDocumentLink(n8n?.pdf_url) ??
    normalizeDocumentLink(workflow?.pdf_url) ??
    normalizeDocumentLink(invoice?.pdf_url);
  const docxUrl =
    normalizeDocumentLink(n8n?.docx_url) ?? normalizeDocumentLink(workflow?.docx_url);
  const googleDocUrl =
    normalizeDocumentLink(n8n?.google_doc_url) ??
    normalizeDocumentLink(workflow?.google_doc_url) ??
    normalizeDocumentLink(invoice?.google_doc_url);
  const rawSteps =
    n8n?.steps?.length ? n8n.steps : workflow?.steps?.length ? workflow.steps : null;
  const dropboxPdfUrl =
    resolveStoredDropboxSharedUrl(
      normalizeDocumentLink(n8n?.dropbox_pdf_url) ?? normalizeDocumentLink(workflow?.dropbox_pdf_url),
      rawSteps ?? null,
      "pdf"
    ) ??
    normalizeDocumentLink(n8n?.dropbox_pdf_url) ??
    normalizeDocumentLink(workflow?.dropbox_pdf_url);
  const dropboxDocxUrl =
    resolveStoredDropboxSharedUrl(
      normalizeDocumentLink(n8n?.dropbox_docx_url) ?? normalizeDocumentLink(workflow?.dropbox_docx_url),
      rawSteps ?? null,
      "docx"
    ) ??
    normalizeDocumentLink(n8n?.dropbox_docx_url) ??
    normalizeDocumentLink(workflow?.dropbox_docx_url);

  const urlContext = {
    googleDocUrl,
    pdfUrl,
    docxUrl,
    dropboxPdfUrl,
    dropboxDocxUrl,
  };

  const incomingSteps = rawSteps
    ? normalizeGenerationResultSteps(rawSteps)
    : isPayloadGenerationSuccess({
        generation_status: "COMPLETED",
        workflow_status: n8n?.workflow_status ?? workflow?.status ?? "completed",
        pdf_url: pdfUrl,
        docx_url: docxUrl,
        dropbox_pdf_url: dropboxPdfUrl,
        dropbox_docx_url: dropboxDocxUrl,
      })
      ? inferCompletedStepsFromUrls(urlContext)
      : [];

  const steps = mergeGenerationSteps(createCanonicalPendingSteps(), incomingSteps).map(
    generationStepToResultStep
  );

  return {
    id: invoice?.id || invoiceId,
    generation_status: "COMPLETED",
    generation_step: "COMPLETED",
    generation_error: null,
    google_doc_url: googleDocUrl,
    pdf_url: pdfUrl,
    pdf_file_id: n8n?.pdf_file_id ?? invoice?.pdf_file_id ?? null,
    google_doc_id: n8n?.google_doc_id ?? invoice?.google_doc_id ?? null,
    docx_file_id: n8n?.docx_file_id ?? null,
    invoice_number:
      n8n?.invoice_number ?? workflow?.invoice_number ?? invoice?.invoice_number ?? null,
    docx_url: docxUrl,
    dropbox_pdf_url: dropboxPdfUrl,
    dropbox_docx_url: dropboxDocxUrl,
    workflow_status: n8n?.workflow_status ?? workflow?.status ?? "completed",
    invoice_status: invoice?.status ?? "generated",
    steps,
  };
}

export async function fetchInvoiceGenerationStatus(
  invoiceId: string
): Promise<InvoiceGenerationStatusPayload | null> {
  const response = await fetch(`/api/invoices/${invoiceId}/generation-status`);
  if (!response.ok) return null;
  const payload = (await response.json()) as InvoiceGenerationStatusPayload;
  return mergeGenerateResults(null, payload) ?? payload;
}

export { mergeGenerateResults };
