import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface InvoiceGenerationStatusPayload {
  id: string;
  generation_status: string | null;
  generation_step: string | null;
  generation_error: string | null;
  google_doc_url: string | null;
  pdf_url: string | null;
  pdf_file_id: string | null;
  google_doc_id: string | null;
  invoice_number: string | null;
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
      "id, generation_status, generation_step, generation_error, google_doc_url, pdf_url, pdf_file_id, google_doc_id, invoice_number"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload: InvoiceGenerationStatusPayload = {
    id: data.id,
    generation_status: data.generation_status,
    generation_step: data.generation_step,
    generation_error: data.generation_error,
    google_doc_url: data.google_doc_url,
    pdf_url: data.pdf_url,
    pdf_file_id: data.pdf_file_id,
    google_doc_id: data.google_doc_id,
    invoice_number: data.invoice_number,
  };

  return NextResponse.json(payload);
}
