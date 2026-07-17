import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  validateInvoiceForm,
  invoiceToWebhookPayload,
  callN8nWebhook,
  N8nWebhookError,
  N8nWebhookUnavailableError,
  parseN8nGenerationResponse,
} from "@/lib/n8n";
import {
  invoiceFormToDbPayload,
  mergeInvoiceGenerationMetadata,
  mergeSavedInvoiceIntoFormPayload,
  normalizeInvoiceFormData,
} from "@/lib/invoice-form";
import {
  INVOICE_GENERATION_FAILED_STATE,
  INVOICE_GENERATION_START_STATE,
} from "@/lib/generation-status";
import {
  resolveInvoiceNumber,
  generateNextInvoiceNumber,
  yearFromInvoiceDate,
  isDuplicateInvoiceNumberError,
} from "@/lib/invoices";
import { ensureDropboxSharedUrl } from "@/lib/dropbox-documents.server";
import type { InvoiceFormData } from "@/lib/types/database";

function revalidateInvoicePaths(id: string) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

const UNCONFIRMED_GENERATION_MESSAGE =
  "Automation response could not be confirmed. The workflow may still be running.";

function isDefinitiveGenerationFailure(error: unknown): boolean {
  return error instanceof N8nWebhookError;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const body = await request.json();
  const formData = body as InvoiceFormData;
  const normalized = normalizeInvoiceFormData(formData);

  const validationErrors = [
    ...validateInvoiceForm(normalized, { requirePaymentDeadline: true }),
  ];
  if (validationErrors.length) {
    return NextResponse.json({ errors: validationErrors }, { status: 400 });
  }

  let invoiceNumber = await resolveInvoiceNumber(
    supabase,
    normalized.invoice_date,
    existing.invoice_number
  );

  const buildDbData = (number: string) =>
    invoiceFormToDbPayload(normalized, number, "draft", INVOICE_GENERATION_START_STATE.workflow_status);

  let invoice = existing;
  let updateError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("invoices")
      .update({
        ...buildDbData(invoiceNumber),
        ...INVOICE_GENERATION_START_STATE,
      })
      .eq("id", id)
      .select()
      .single();

    if (!error) {
      invoice = data;
      updateError = null;
      break;
    }

    updateError = error;
    if (isDuplicateInvoiceNumberError(error) && attempt === 0) {
      const year = yearFromInvoiceDate(normalized.invoice_date);
      invoiceNumber = await generateNextInvoiceNumber(supabase, year);
      continue;
    }
    break;
  }

  if (updateError) {
    if (isDuplicateInvoiceNumberError(updateError)) {
      return NextResponse.json(
        { errors: ["Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen."] },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("sender_name, sender_address, email, phone, tax_number")
    .eq("id", user.id)
    .single();

  let accountHolder: string | null = normalized.account_holder?.trim() || null;
  if (!accountHolder && normalized.iban) {
    const { data: bankAccount } = await supabase
      .from("profile_bank_accounts")
      .select("account_holder")
      .eq("user_id", user.id)
      .eq("iban", normalized.iban)
      .maybeSingle();
    accountHolder = bankAccount?.account_holder ?? null;
  }

  const webhookFormData = mergeSavedInvoiceIntoFormPayload(
    accountHolder && !normalized.account_holder.trim()
      ? { ...normalized, account_holder: accountHolder }
      : normalized,
    invoice
  );

  const payload = invoiceToWebhookPayload(invoice, webhookFormData, profile);

  try {
    const { httpStatus, rawResult, n8nResult } = await callN8nWebhook(payload);

    console.error("[generate] n8n HTTP status:", httpStatus);
    console.error("[generate] raw n8n response:", JSON.stringify(rawResult).slice(0, 2000));
    console.error("[generate] normalized n8n result:", JSON.stringify(n8nResult).slice(0, 2000));

    const parsed = parseN8nGenerationResponse(n8nResult);

    if (n8nResult.success === false || parsed.success === false) {
      throw new N8nWebhookError(
        "n8n workflow reported failure.",
        502,
        JSON.stringify(n8nResult).slice(0, 500)
      );
    }

    const {
      google_doc_url: googleDocUrl,
      pdf_url: pdfUrl,
      google_doc_id: googleDocId,
      pdf_file_id: pdfFileId,
      docx_url: docxUrl,
      docx_file_id: docxFileId,
      dropbox_pdf_url: dropboxPdfUrl,
      dropbox_docx_url: dropboxDocxUrl,
      steps: generationSteps,
      workflow_status: workflowStatus,
      invoice_number: responseInvoiceNumber,
    } = parsed;

    if (!pdfUrl) {
      throw new N8nWebhookError(
        "n8n response is missing PDF link.",
        502,
        JSON.stringify(n8nResult).slice(0, 500)
      );
    }

    const finalDropboxPdfUrl =
      (await ensureDropboxSharedUrl(dropboxPdfUrl, generationSteps, "pdf")) ?? dropboxPdfUrl;
    const finalDropboxDocxUrl =
      (await ensureDropboxSharedUrl(dropboxDocxUrl, generationSteps, "docx")) ?? dropboxDocxUrl;

    const notes = mergeInvoiceGenerationMetadata(
      invoice.notes,
      {
        google_doc_url: googleDocUrl,
        pdf_url: pdfUrl,
        docx_url: docxUrl,
        docx_file_id: docxFileId,
        dropbox_pdf_url: finalDropboxPdfUrl,
        dropbox_docx_url: finalDropboxDocxUrl,
      },
      generationSteps
    );

    const { data: updatedInvoice, error: urlError } = await supabase
      .from("invoices")
      .update({
        notes,
        status: "generated",
        workflow_status: workflowStatus || "completed",
        workflow_error: null,
        generation_status: "COMPLETED",
        generation_step: "COMPLETED",
        generation_error: null,
        google_doc_id: googleDocId,
        google_doc_url: googleDocUrl,
        pdf_file_id: pdfFileId,
        pdf_url: pdfUrl,
        dropbox_pdf_url: finalDropboxPdfUrl,
        dropbox_docx_url: finalDropboxDocxUrl,
        generated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (urlError) {
      throw new Error(urlError.message);
    }

    await supabase.from("invoice_logs").insert({
      invoice_id: id,
      user_id: user.id,
      status: workflowStatus || "completed",
      request_payload: payload,
      response_payload: n8nResult,
    });

    revalidateInvoicePaths(id);

    const normalizedN8n = {
      success: n8nResult.success !== false,
      workflow_status: workflowStatus || "completed",
      invoice_number: responseInvoiceNumber || invoice.invoice_number,
      google_doc_id: googleDocId,
      google_doc_url: googleDocUrl,
      pdf_file_id: pdfFileId,
      pdf_url: pdfUrl,
      docx_file_id: docxFileId,
      docx_url: docxUrl,
      dropbox_pdf_url: finalDropboxPdfUrl,
      dropbox_docx_url: finalDropboxDocxUrl,
      steps: generationSteps,
    };

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      n8n: normalizedN8n,
      workflow: {
        status: normalizedN8n.workflow_status,
        generation_status: "COMPLETED",
        google_doc_url: googleDocUrl,
        pdf_url: pdfUrl,
        docx_url: docxUrl,
        dropbox_pdf_url: finalDropboxPdfUrl,
        dropbox_docx_url: finalDropboxDocxUrl,
        invoice_number: normalizedN8n.invoice_number,
        generated_at: updatedInvoice.generated_at,
        steps: generationSteps,
      },
    });
  } catch (err) {
    if (err instanceof N8nWebhookUnavailableError) {
      const errorMessage = err.message;
      const workflowError = `HTTP ${err.statusCode}${err.responseBody ? `: ${err.responseBody.slice(0, 300)}` : `: ${err.message}`}`;

      await supabase
        .from("invoices")
        .update({
          ...INVOICE_GENERATION_FAILED_STATE,
          workflow_error: workflowError,
          generation_error: errorMessage,
        })
        .eq("id", id);

      await supabase.from("invoice_logs").insert({
        invoice_id: id,
        user_id: user.id,
        status: "error",
        request_payload: payload,
        error_message: workflowError,
        response_payload: {
          error_code: "N8N_WEBHOOK_UNAVAILABLE",
          http_status: err.statusCode,
          webhook_mode: err.webhookMode,
          body: err.responseBody,
        },
      });

      revalidateInvoicePaths(id);

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          generation_error: errorMessage,
          error_code: "N8N_WEBHOOK_UNAVAILABLE",
          webhook_available: false,
          webhook_mode: err.webhookMode,
          retry_safe: true,
          preserveForm: true,
        },
        { status: 503 }
      );
    }

    const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
    const httpStatus = err instanceof N8nWebhookError ? err.httpStatus : 502;
    const workflowError =
      err instanceof N8nWebhookError
        ? `HTTP ${err.httpStatus}${err.responseBody ? `: ${err.responseBody.slice(0, 300)}` : `: ${err.message}`}`
        : errorMessage;
    const definitiveFailure = isDefinitiveGenerationFailure(err);

    if (definitiveFailure) {
      await supabase
        .from("invoices")
        .update({
          ...INVOICE_GENERATION_FAILED_STATE,
          workflow_error: workflowError,
          generation_error: errorMessage,
        })
        .eq("id", id);
    } else {
      await supabase
        .from("invoices")
        .update({
          generation_error: UNCONFIRMED_GENERATION_MESSAGE,
        })
        .eq("id", id);
    }

    await supabase.from("invoice_logs").insert({
      invoice_id: id,
      user_id: user.id,
      status: "error",
      request_payload: payload,
      error_message: definitiveFailure ? workflowError : UNCONFIRMED_GENERATION_MESSAGE,
      response_payload:
        err instanceof N8nWebhookError
          ? { http_status: err.httpStatus, body: err.responseBody }
          : { error: errorMessage, unconfirmed: !definitiveFailure },
    });

    revalidateInvoicePaths(id);

    if (!definitiveFailure) {
      return NextResponse.json(
        {
          success: false,
          uncertain: true,
          check_generation_status: true,
          message: UNCONFIRMED_GENERATION_MESSAGE,
          error: UNCONFIRMED_GENERATION_MESSAGE,
          preserveForm: true,
          generation_error: UNCONFIRMED_GENERATION_MESSAGE,
        },
        { status: 502 }
      );
    }

    const responseStatus =
      httpStatus === 404 ? 404 : httpStatus >= 400 && httpStatus < 600 ? httpStatus : 502;

    return NextResponse.json(
      {
        error: errorMessage,
        preserveForm: true,
        workflow_status: "failed",
        workflow_error: workflowError,
        generation_status: "FAILED",
        generation_error: errorMessage,
      },
      { status: responseStatus }
    );
  }
}
