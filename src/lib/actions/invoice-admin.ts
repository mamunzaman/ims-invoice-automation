"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { InvoiceFormData, ProfileInvoiceSettings } from "@/lib/types/database";
import {
  canDeleteInvoice,
  canArchiveInvoice,
  checkInvoiceDocumentHealth,
  summarizeDocumentHealth,
  type DocumentHealthIssue,
  type DocumentHealthLevel,
  isInvoiceGenerated,
} from "@/lib/invoice-lifecycle";
import {
  invoiceToFormData,
  mergeInvoiceArchiveState,
} from "@/lib/invoice-form";
import {
  duplicateInvoice,
  getInvoice,
  getInvoices,
  updateInvoiceStatus,
} from "@/lib/actions/invoices";
import {
  formatInvoiceNumber,
  generateNextInvoiceNumber,
} from "@/lib/invoices";

export async function archiveInvoice(id: string) {
  const invoice = await getInvoice(id);
  if (!invoice) return { success: false as const, errors: ["Rechnung nicht gefunden."] };
  if (!canArchiveInvoice(invoice)) {
    return { success: false as const, errors: ["Diese Rechnung kann nicht archiviert werden."] };
  }

  const supabase = await createClient();
  const notes = mergeInvoiceArchiveState(invoice.notes, true);
  const { error } = await supabase.from("invoices").update({ notes }).eq("id", id);

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true as const };
}

export async function deleteDraftInvoice(id: string, confirmDriveDelete = false) {
  const invoice = await getInvoice(id);
  if (!invoice) return { success: false as const, errors: ["Rechnung nicht gefunden."] };
  if (!canDeleteInvoice(invoice)) {
    return {
      success: false as const,
      errors: ["Nur unveröffentlichte Entwürfe können gelöscht werden."],
    };
  }

  const hasDriveArtifacts =
    Boolean(invoice.google_doc_id || invoice.pdf_file_id || invoice.google_doc_url || invoice.pdf_url);

  if (hasDriveArtifacts && !confirmDriveDelete) {
    return {
      success: false as const,
      needsDriveConfirmation: true as const,
      errors: [
        "Für diesen Entwurf existieren bereits Dokumente. Bitte Löschen der Drive-Dateien bestätigen.",
      ],
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/invoices");
  return { success: true as const };
}

export async function cancelInvoice(id: string) {
  const invoice = await getInvoice(id);
  if (!invoice) return { success: false as const, errors: ["Rechnung nicht gefunden."] };
  if (invoice.status === "cancelled") {
    return { success: false as const, errors: ["Rechnung ist bereits storniert."] };
  }

  return updateInvoiceStatus(id, "cancelled");
}

export async function duplicateInvoiceAction(id: string) {
  return duplicateInvoice(id);
}

export async function getInvoiceNumberingPreview() {
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const nextNumber = await generateNextInvoiceNumber(supabase, year);

  return {
    format: `${year}-NNNN`,
    preview: nextNumber,
    year,
  };
}

export async function checkInvoiceNumberResetAllowed(year: number) {
  const supabase = await createClient();
  const targetNumber = formatInvoiceNumber(year, 1);

  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("invoice_number", targetNumber)
    .maybeSingle();

  if (error) return { allowed: false as const, reason: error.message };

  if (data) {
    return {
      allowed: false as const,
      reason: `Rechnungsnummer ${targetNumber} existiert bereits. Zurücksetzen würde Duplikate erzeugen.`,
    };
  }

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `${year}-%`);

  if ((count ?? 0) > 0) {
    return {
      allowed: false as const,
      reason: `Für ${year} existieren bereits ${count} Rechnung(en). Nummerierung kann nicht auf 0001 zurückgesetzt werden.`,
    };
  }

  return { allowed: true as const, nextNumber: targetNumber };
}

export async function cleanDraftInvoices() {
  const invoices = await getInvoices();
  const drafts = invoices.filter((inv) => canDeleteInvoice(inv));

  let deleted = 0;
  const errors: string[] = [];

  for (const draft of drafts) {
    const result = await deleteDraftInvoice(draft.id, false);
    if (result.success) {
      deleted += 1;
    } else if ("errors" in result && result.errors) {
      errors.push(`${draft.invoice_number}: ${result.errors[0]}`);
    }
  }

  revalidatePath("/invoices");
  return { success: true as const, deleted, errors };
}

export interface DocumentHealthReport {
  level: DocumentHealthLevel;
  issues: DocumentHealthIssue[];
  scanned: number;
}

export async function scanDocumentLinks(): Promise<DocumentHealthReport> {
  const invoices = await getInvoices();
  const issues = invoices.flatMap((invoice) => checkInvoiceDocumentHealth(invoice));

  return {
    level: summarizeDocumentHealth(issues),
    issues,
    scanned: invoices.length,
  };
}

export async function getInvoiceAdminSettings(): Promise<ProfileInvoiceSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("invoice_settings")
    .eq("id", user.id)
    .single();

  if (error || !data?.invoice_settings) return {};
  return (data.invoice_settings as ProfileInvoiceSettings) || {};
}

export async function updateInvoiceAdminSettings(settings: ProfileInvoiceSettings) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, errors: ["Nicht angemeldet."] };

  const { error } = await supabase
    .from("profiles")
    .update({ invoice_settings: settings })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("invoice_settings")) {
      return {
        success: false as const,
        errors: [
          "Administrationseinstellungen konnten nicht gespeichert werden. Bitte Migration 003 ausführen.",
        ],
      };
    }
    return { success: false as const, errors: [error.message] };
  }

  revalidatePath("/settings");
  return { success: true as const };
}

export async function resetInvoiceNumbering() {
  const year = new Date().getFullYear();
  const check = await checkInvoiceNumberResetAllowed(year);

  if (!check.allowed) {
    return { success: false as const, errors: [check.reason] };
  }

  const current = await getInvoiceAdminSettings();
  const result = await updateInvoiceAdminSettings({
    ...current,
    invoice_number_year_reset: true,
    last_numbering_reset_at: new Date().toISOString(),
  });

  if (!result.success) return result;

  revalidatePath("/settings");
  return {
    success: true as const,
    nextNumber: check.nextNumber,
    message: `Nummerierung für ${year} ist bereit. Nächste Nummer: ${check.nextNumber}`,
  };
}
export async function buildRegeneratePayload(id: string): Promise<
  | { success: true; formData: InvoiceFormData }
  | { success: false; errors: string[] }
> {
  const invoice = await getInvoice(id);
  if (!invoice) return { success: false, errors: ["Rechnung nicht gefunden."] };
  if (invoice.status === "draft" && !isInvoiceGenerated(invoice)) {
    return { success: false, errors: ["Entwürfe müssen zuerst über die Rechnungserstellung generiert werden."] };
  }

  return { success: true, formData: invoiceToFormData(invoice) };
}
