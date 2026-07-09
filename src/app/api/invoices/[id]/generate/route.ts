import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateInvoiceForm, invoiceToWebhookPayload, callN8nWebhook, N8nWebhookError, parseN8nDocumentUrls, parseN8nGenerationSteps } from "@/lib/n8n";
import { invoiceFormToDbPayload, mergeInvoiceDocumentUrls, mergeInvoiceGenerationSteps, getServicePeriodFieldErrors, normalizeInvoiceFormData } from "@/lib/invoice-form";
import {
  resolveInvoiceNumber,
  generateNextInvoiceNumber,
  yearFromInvoiceDate,
  isDuplicateInvoiceNumberError,
} from "@/lib/invoices";
import type { InvoiceFormData } from "@/lib/types/database";

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
    ...Object.values(getServicePeriodFieldErrors(normalized)),
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
    invoiceFormToDbPayload(normalized, number, "generated", "processing");

  let invoice = existing;
  let updateError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("invoices")
      .update({
        ...buildDbData(invoiceNumber),
        generation_status: "VALIDATING",
        generation_step: "VALIDATING",
        generation_error: null,
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

  const webhookFormData =
    accountHolder && !normalized.account_holder.trim()
      ? { ...normalized, account_holder: accountHolder }
      : normalized;

  const payload = invoiceToWebhookPayload(invoice, webhookFormData, profile);

  try {
    const n8nResponse = await callN8nWebhook(payload);
    const documentUrls = parseN8nDocumentUrls(n8nResponse);
    const { google_doc_url: googleDocUrl, pdf_url: pdfUrl, google_doc_id: googleDocId, pdf_file_id: pdfFileId } =
      documentUrls;
    const generationSteps = parseN8nGenerationSteps(n8nResponse, {
      googleDocUrl,
      pdfUrl,
    });

    const notes = mergeInvoiceGenerationSteps(
      mergeInvoiceDocumentUrls(invoice.notes, {
        google_doc_url: googleDocUrl,
        pdf_url: pdfUrl,
      }),
      generationSteps
    );

    const { data: updatedInvoice, error: urlError } = await supabase
      .from("invoices")
      .update({
        notes,
        status: "generated",
        workflow_status: "completed",
        workflow_error: null,
        generation_status: "COMPLETED",
        generation_step: "COMPLETED",
        generation_error: null,
        google_doc_id: googleDocId,
        google_doc_url: googleDocUrl,
        pdf_file_id: pdfFileId,
        pdf_url: pdfUrl,
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
      status: (n8nResponse.status as string) || "success",
      request_payload: payload,
      response_payload: n8nResponse,
    });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      workflow: {
        status: n8nResponse.status || "success",
        generation_status: "COMPLETED",
        google_doc_url: googleDocUrl,
        pdf_url: pdfUrl,
        invoice_number: invoice.invoice_number,
        generated_at: updatedInvoice.generated_at,
        steps: generationSteps,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
    const httpStatus = err instanceof N8nWebhookError ? err.httpStatus : 502;
    const workflowError =
      err instanceof N8nWebhookError
        ? `HTTP ${err.httpStatus}${err.responseBody ? `: ${err.responseBody.slice(0, 300)}` : `: ${err.message}`}`
        : errorMessage;

    await supabase
      .from("invoices")
      .update({
        workflow_status: "failed",
        workflow_error: workflowError,
        generation_status: "FAILED",
        generation_step: "VALIDATING",
        generation_error: workflowError,
      })
      .eq("id", id);

    await supabase.from("invoice_logs").insert({
      invoice_id: id,
      user_id: user.id,
      status: "error",
      request_payload: payload,
      error_message: workflowError,
      response_payload:
        err instanceof N8nWebhookError
          ? { http_status: err.httpStatus, body: err.responseBody }
          : { error: errorMessage },
    });

    const responseStatus = httpStatus === 404 ? 404 : httpStatus >= 400 && httpStatus < 600 ? httpStatus : 502;

    return NextResponse.json(
      {
        error: errorMessage,
        preserveForm: true,
        workflow_status: "failed",
        workflow_error: workflowError,
        generation_status: "FAILED",
        generation_error: workflowError,
      },
      { status: responseStatus }
    );
  }
}
