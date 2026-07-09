"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Invoice, InvoiceFormData, Profile } from "@/lib/types/database";
import { validateInvoiceForm } from "@/lib/n8n";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import {
  invoiceFormToDbPayload,
  DEFAULT_INVOICE_TITLE,
  invoiceToFormData,
  getServicePeriodFieldErrors,
  normalizeInvoiceFormData,
} from "@/lib/invoice-form";
import { resolveInvoiceCurrency } from "@/lib/utils";
import {
  resolveInvoiceNumber,
  generateNextInvoiceNumber,
  yearFromInvoiceDate,
  isDuplicateInvoiceNumberError,
} from "@/lib/invoices";

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("invoice_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getDefaultInvoiceData(): Promise<
  Partial<InvoiceFormData> & { default_bank_account_id?: string }
> {
  const [profile, bankAccounts] = await Promise.all([getProfile(), getBankAccounts()]);
  const today = new Date().toISOString().split("T")[0];
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);

  const defaultBank =
    bankAccounts.find((account) => account.is_default) ?? bankAccounts[0];

  return {
    invoice_date: today,
    payment_deadline: deadline.toISOString().split("T")[0],
    currency: resolveInvoiceCurrency(profile?.default_currency),
    payment_terms: profile?.default_payment_terms || "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
    small_business_rule: profile?.small_business_rule ?? false,
    bank_name: defaultBank?.bank_name || profile?.bank_name || "",
    iban: defaultBank?.iban || profile?.iban || "",
    bic: defaultBank?.bic || profile?.bic || "",
    tax_number: profile?.tax_number || "",
    default_bank_account_id: defaultBank?.id || "",
    invoice_title: DEFAULT_INVOICE_TITLE,
    customer_salutation: "",
    customer_zip: "",
    customer_city: "",
    customer_country: "",
    account_holder: defaultBank?.account_holder || "",
    service_period_start: "",
    service_period_end: "",
    customer_id: "",
    customer_name: "",
    customer_address: "",
    service_description: "",
    amount_net: "",
    optional_notes: "",
    invoice_number: "",
    invoice_language: "en",
  };
}

export async function createInvoice(formData: InvoiceFormData) {
  const normalized = normalizeInvoiceFormData(formData);
  const errors = [
    ...validateInvoiceForm(normalized),
    ...Object.values(getServicePeriodFieldErrors(normalized)),
  ];
  if (errors.length) return { success: false as const, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, errors: ["Nicht angemeldet."] };

  const year = yearFromInvoiceDate(normalized.invoice_date);
  let invoiceNumber = await generateNextInvoiceNumber(supabase, year);

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("invoices")
      .insert(invoiceFormToDbPayload(normalized, invoiceNumber, "draft"))
      .select()
      .single();

    if (!error) {
      revalidatePath("/invoices");
      return { success: true as const, data };
    }

    if (isDuplicateInvoiceNumberError(error) && attempt === 0) {
      invoiceNumber = await generateNextInvoiceNumber(supabase, year);
      continue;
    }

    if (isDuplicateInvoiceNumberError(error)) {
      return {
        success: false as const,
        errors: ["Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen."],
      };
    }

    return { success: false as const, errors: [error.message] };
  }

  return { success: false as const, errors: ["Rechnung konnte nicht erstellt werden."] };
}

export async function updateInvoice(id: string, formData: InvoiceFormData) {
  const invoice = await getInvoice(id);
  if (!invoice) return { success: false as const, errors: ["Rechnung nicht gefunden."] };
  if (invoice.status !== "draft") {
    return { success: false as const, errors: ["Nur Entwürfe können bearbeitet werden."] };
  }

  const normalized = normalizeInvoiceFormData(formData);
  const errors = [
    ...validateInvoiceForm(normalized),
    ...Object.values(getServicePeriodFieldErrors(normalized)),
  ];
  if (errors.length) return { success: false as const, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, errors: ["Nicht angemeldet."] };

  let invoiceNumber = await resolveInvoiceNumber(
    supabase,
    normalized.invoice_date,
    invoice.invoice_number
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase
      .from("invoices")
      .update(invoiceFormToDbPayload(normalized, invoiceNumber, "draft"))
      .eq("id", id);

    if (!error) {
      revalidatePath("/invoices");
      revalidatePath(`/invoices/${id}`);
      return { success: true as const, data: { ...invoice, invoice_number: invoiceNumber } };
    }

    if (isDuplicateInvoiceNumberError(error) && attempt === 0) {
      const year = yearFromInvoiceDate(normalized.invoice_date);
      invoiceNumber = await generateNextInvoiceNumber(supabase, year);
      continue;
    }

    if (isDuplicateInvoiceNumberError(error)) {
      return {
        success: false as const,
        errors: ["Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen."],
      };
    }

    return { success: false as const, errors: [error.message] };
  }

  return { success: false as const, errors: ["Rechnung konnte nicht gespeichert werden."] };
}

export async function updateInvoiceStatus(
  id: string,
  status: Invoice["status"]
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status,
      payment_status: status === "paid" ? "paid" : status === "cancelled" ? "cancelled" : "unpaid",
    })
    .eq("id", id);

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true as const };
}

export async function duplicateInvoice(id: string) {
  const invoice = await getInvoice(id);
  if (!invoice) return { success: false as const, errors: ["Rechnung nicht gefunden."] };

  const formData = invoiceToFormData(invoice);
  formData.invoice_number = "";
  formData.invoice_date = new Date().toISOString().split("T")[0];

  return createInvoice(formData);
}
