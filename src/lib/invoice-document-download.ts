import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unpackInvoiceNotes } from "@/lib/invoice-form";
import {
  DROPBOX_TOKEN_MISSING_MESSAGE,
  DropboxError,
  downloadDropboxFile,
  filenameFromDropboxPath,
  getDropboxAccessToken,
  resolveExistingDropboxFilePath,
} from "@/lib/dropbox";
import { collectInvoiceDropboxPathCandidates } from "@/lib/dropbox-documents";

export type InvoiceDownloadKind = "pdf" | "docx";

const CONTENT_TYPES: Record<InvoiceDownloadKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function buildDownloadFilename(
  invoiceNumber: string | null,
  kind: InvoiceDownloadKind,
  sourcePath?: string,
  metadataName?: string | null
) {
  if (metadataName?.trim() && metadataName.includes(".")) {
    return metadataName.trim();
  }
  const fromPath = sourcePath ? filenameFromDropboxPath(sourcePath) : null;
  if (fromPath && fromPath.includes(".")) return fromPath;
  const safeNumber = (invoiceNumber || "invoice").replace(/[^\w.-]+/g, "_");
  return `${safeNumber}.${kind}`;
}

export async function handleInvoiceDocumentDownload(
  invoiceId: string,
  kind: InvoiceDownloadKind
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getDropboxAccessToken()) {
    return NextResponse.json({ error: DROPBOX_TOKEN_MISSING_MESSAGE }, { status: 503 });
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, pdf_url, dropbox_pdf_url, dropbox_docx_url, notes")
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const meta = unpackInvoiceNotes(invoice.notes);
  const { storedCandidates, apiCandidates } = collectInvoiceDropboxPathCandidates({
    kind,
    columnDropboxUrl: kind === "pdf" ? invoice.dropbox_pdf_url : invoice.dropbox_docx_url,
    columnPdfUrl: kind === "pdf" ? invoice.pdf_url : null,
    metaDropboxUrl: kind === "pdf" ? meta.dropbox_pdf_url : meta.dropbox_docx_url,
    metaPdfUrl: meta.pdf_url,
    metaDocxUrl: meta.docx_url,
    steps: meta.generation_steps,
  });

  if (apiCandidates.length === 0) {
    console.info("[invoice-document-download]", {
      invoiceId,
      kind,
      storedCandidates,
      apiCandidates,
      resolvedPath: null,
      tokenScope: null,
      reason: "no_dropbox_path_candidates",
    });

    return NextResponse.json(
      {
        error:
          "Dropbox file path not available for secure download. Public shared links are not used.",
        attempted_paths: [],
      },
      { status: 404 }
    );
  }

  try {
    const resolved = await resolveExistingDropboxFilePath(apiCandidates);

    console.info("[invoice-document-download]", {
      invoiceId,
      kind,
      storedCandidates,
      apiCandidates,
      attemptedPaths: resolved.attemptedPaths,
      resolvedPath: resolved.path,
      tokenScope: resolved.tokenScope,
    });

    if (!resolved.path) {
      return NextResponse.json(
        {
          error: "Dropbox file not found for secure download.",
          attempted_paths: resolved.attemptedPaths,
          token_scope: resolved.tokenScope,
        },
        { status: 404 }
      );
    }

    const downloaded = await downloadDropboxFile(resolved.path);
    const filename = buildDownloadFilename(
      invoice.invoice_number,
      kind,
      resolved.path,
      resolved.name
    );
    const contentType = downloaded.contentType || CONTENT_TYPES[kind];

    return new NextResponse(downloaded.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof DropboxError) {
      const status =
        err.status === 503
          ? 503
          : err.status && err.status >= 400 && err.status < 600
            ? err.status
            : 502;
      return NextResponse.json({ error: err.message }, { status });
    }

    const message = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
