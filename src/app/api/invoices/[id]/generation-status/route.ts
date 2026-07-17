import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unpackInvoiceNotes } from "@/lib/invoice-form";
import { resolveStoredDropboxSharedUrl } from "@/lib/dropbox-documents";
import { isGenerationStatusComplete } from "@/lib/invoice-generation-client";
import type { GenerationResultStep } from "@/lib/generation-status";
import { normalizeDocumentLink } from "@/lib/urls";

export interface InvoiceGenerationStatusPayload {
  id: string;
  generation_status: string | null;
  generation_step: string | null;
  generation_error: string | null;
  google_doc_url: string | null;
  pdf_url: string | null;
  pdf_file_id: string | null;
  google_doc_id: string | null;
  docx_file_id?: string | null;
  invoice_number: string | null;
  docx_url?: string | null;
  dropbox_pdf_url?: string | null;
  dropbox_docx_url?: string | null;
  workflow_status?: string | null;
  invoice_status?: string | null;
  steps?: GenerationResultStep[];
}

function resolveGenerationStatusValue(
  data: {
    generation_status: string | null;
    status: string;
    workflow_status: string | null;
    pdf_url: string | null;
  },
  metaPdfUrl: string | null
): string | null {
  if (data.generation_status === "COMPLETED" || data.generation_status === "FAILED") {
    return data.generation_status;
  }

  const snapshot = {
    generation_status: data.generation_status,
    pdf_url: normalizeDocumentLink(data.pdf_url) ?? metaPdfUrl,
    workflow_status: data.workflow_status,
    invoice_status: data.status,
  };

  if (isGenerationStatusComplete(snapshot)) {
    return "COMPLETED";
  }

  return data.generation_status;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, status, workflow_status, generation_status, generation_step, generation_error, google_doc_url, pdf_url, pdf_file_id, google_doc_id, dropbox_pdf_url, dropbox_docx_url, invoice_number, notes"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const meta = unpackInvoiceNotes(data.notes);
  const pdfUrl =
    normalizeDocumentLink(data.pdf_url) ?? normalizeDocumentLink(meta.pdf_url);
  const generationStatus = resolveGenerationStatusValue(data, pdfUrl);

  const dropboxPdfStored =
    normalizeDocumentLink(data.dropbox_pdf_url) ?? normalizeDocumentLink(meta.dropbox_pdf_url);
  const dropboxDocxStored =
    normalizeDocumentLink(data.dropbox_docx_url) ?? normalizeDocumentLink(meta.dropbox_docx_url);

  const payload: InvoiceGenerationStatusPayload = {
    id: data.id,
    generation_status: generationStatus,
    generation_step:
      generationStatus === "COMPLETED"
        ? "COMPLETED"
        : data.generation_step ?? generationStatus,
    generation_error: data.generation_error,
    google_doc_url:
      normalizeDocumentLink(data.google_doc_url) ?? normalizeDocumentLink(meta.google_doc_url),
    pdf_url: pdfUrl,
    pdf_file_id: data.pdf_file_id,
    google_doc_id: data.google_doc_id,
    docx_file_id: meta.docx_file_id ?? null,
    invoice_number: data.invoice_number,
    docx_url: normalizeDocumentLink(meta.docx_url),
    dropbox_pdf_url:
      resolveStoredDropboxSharedUrl(dropboxPdfStored, meta.generation_steps, "pdf") ??
      dropboxPdfStored,
    dropbox_docx_url:
      resolveStoredDropboxSharedUrl(dropboxDocxStored, meta.generation_steps, "docx") ??
      dropboxDocxStored,
    workflow_status: data.workflow_status,
    invoice_status: data.status,
    steps: meta.generation_steps,
  };

  return NextResponse.json(payload);
}
