"use server";

import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Invoice, InvoiceFormData, Profile } from "@/lib/types/database";
import { validateInvoiceForm } from "@/lib/n8n";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import { getInvoiceAdminSettings } from "@/lib/actions/invoice-admin";
import {
  invoiceFormToDbPayload,
  DEFAULT_INVOICE_TITLE,
  invoiceToDuplicateFormData,
  stripInvoiceWorkflowFromNotes,
  DUPLICATE_INVOICE_DB_RESET,
  normalizeInvoiceFormData,
} from "@/lib/invoice-form";
import { canEditInvoice } from "@/lib/invoice-lifecycle";
import { INITIAL_INVOICE_GENERATION_STATE } from "@/lib/generation-status";
import { resolveInvoiceCurrency } from "@/lib/utils";
import {
  resolveInvoiceNumber,
  generateNextInvoiceNumber,
  yearFromInvoiceDate,
  isDuplicateInvoiceNumberError,
} from "@/lib/invoices";
import {
  ARCHIVED_NOTES_PATTERN,
  DEFAULT_INVOICE_PAGE_SIZE,
  invoiceListSortToOrderColumn,
  normalizeInvoiceListPage,
  normalizeInvoicePageSize,
  todayIsoDate,
  type InvoiceListQueryInput,
  type InvoiceListQueryResult,
  type InvoicePageSize,
} from "@/lib/invoices-list-query";

export interface InvoiceListStats {
  total: number;
  draft: number;
  generated: number;
  totalAmount: number;
}

export interface PaginatedInvoicesResult extends InvoiceListQueryResult {
  invoices: Invoice[];
}

function applyInvoiceListFilters(
  // Supabase query builder is re-assigned through chained filters.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  input: Pick<InvoiceListQueryInput, "search" | "statusFilter">
) {
  let next = query;

  if (input.statusFilter === "archived") {
    next = next.ilike("notes", ARCHIVED_NOTES_PATTERN);
  } else {
    next = next.not("notes", "ilike", ARCHIVED_NOTES_PATTERN);

    if (input.statusFilter === "draft") {
      next = next.eq("status", "draft");
    } else if (input.statusFilter === "generated") {
      next = next.eq("status", "generated");
    } else if (input.statusFilter === "paid") {
      next = next.eq("status", "paid");
    } else if (input.statusFilter === "cancelled") {
      next = next.eq("status", "cancelled");
    } else if (input.statusFilter === "overdue") {
      next = next.in("status", ["generated", "sent"]).lt("payment_deadline", todayIsoDate());
    }
  }

  const search = input.search?.trim();
  if (search) {
    const sanitized = search.replace(/[%_,]/g, "");
    const pattern = `%${sanitized}%`;
    next = next.or(`invoice_number.ilike.${pattern},notes.ilike.${pattern}`);
  }

  return next;
}

export async function getInvoicePageSizeSetting(): Promise<InvoicePageSize> {
  const settings = await getInvoiceAdminSettings();
  return normalizeInvoicePageSize(settings.invoice_page_size ?? DEFAULT_INVOICE_PAGE_SIZE);
}

export async function getInvoiceListStats(): Promise<InvoiceListStats> {
  const supabase = await createClient();

  const [totalResult, draftResult, generatedResult, amountResult] = await Promise.all([
    supabase.from("invoices").select("*", { count: "exact", head: true }),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .not("notes", "ilike", ARCHIVED_NOTES_PATTERN),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "generated")
      .not("notes", "ilike", ARCHIVED_NOTES_PATTERN),
    supabase.from("invoices").select("net_amount, status").neq("status", "cancelled"),
  ]);

  if (totalResult.error) throw new Error(totalResult.error.message);
  if (draftResult.error) throw new Error(draftResult.error.message);
  if (generatedResult.error) throw new Error(generatedResult.error.message);
  if (amountResult.error) throw new Error(amountResult.error.message);

  const totalAmount = (amountResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.net_amount),
    0
  );

  return {
    total: totalResult.count ?? 0,
    draft: draftResult.count ?? 0,
    generated: generatedResult.count ?? 0,
    totalAmount,
  };
}

export async function getInvoicesPaginated(
  input: InvoiceListQueryInput
): Promise<PaginatedInvoicesResult> {
  const supabase = await createClient();
  const pageSize = normalizeInvoicePageSize(input.pageSize);

  let countQuery = supabase.from("invoices").select("*", { count: "exact", head: true });
  countQuery = applyInvoiceListFilters(countQuery, input);

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = normalizeInvoiceListPage(input.page, totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dataQuery = supabase.from("invoices").select("*");
  dataQuery = applyInvoiceListFilters(dataQuery, input);
  dataQuery = dataQuery
    .order(invoiceListSortToOrderColumn(input.sort), {
      ascending: input.sort.direction === "asc",
      nullsFirst: false,
    })
    .order("invoice_date", { ascending: false })
    .range(from, to);

  const { data, error } = await dataQuery;
  if (error) throw new Error(error.message);

  return {
    invoices: data ?? [],
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

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
  noStore();
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
  const [profile, bankAccounts, invoiceSettings] = await Promise.all([
    getProfile(),
    getBankAccounts(),
    getInvoiceAdminSettings(),
  ]);
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
    invoice_language:
      invoiceSettings.default_invoice_language === "de" ? "de" : "en",
  };
}

export async function createInvoice(formData: InvoiceFormData) {
  const normalized = normalizeInvoiceFormData(formData);
  const errors = validateInvoiceForm(normalized);
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
  if (!invoice || invoice.id !== id) {
    return { success: false as const, errors: ["Rechnung nicht gefunden."] };
  }
  if (!canEditInvoice(invoice)) {
    return { success: false as const, errors: ["Nur Entwürfe können bearbeitet werden."] };
  }

  const normalized = normalizeInvoiceFormData(formData);
  const errors = validateInvoiceForm(normalized);
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
      .update({
        ...invoiceFormToDbPayload(normalized, invoiceNumber, "draft"),
        ...INITIAL_INVOICE_GENERATION_STATE,
      })
      .eq("id", id);

    if (!error) {
      revalidatePath("/invoices");
      revalidatePath(`/invoices/${id}`);
      const refreshed = await getInvoice(id);
      return {
        success: true as const,
        data: refreshed ?? { ...invoice, invoice_number: invoiceNumber },
      };
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
  const source = await getInvoice(id);
  if (!source) return { success: false as const, errors: ["Rechnung nicht gefunden."] };

  const normalized = invoiceToDuplicateFormData(source);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, errors: ["Nicht angemeldet."] };

  const year = yearFromInvoiceDate(normalized.invoice_date);
  let invoiceNumber = await generateNextInvoiceNumber(supabase, year);

  for (let attempt = 0; attempt < 2; attempt++) {
    const basePayload = invoiceFormToDbPayload(normalized, invoiceNumber, "draft");
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        ...basePayload,
        ...DUPLICATE_INVOICE_DB_RESET,
        notes: stripInvoiceWorkflowFromNotes(basePayload.notes),
      })
      .select()
      .single();

    if (!error && data) {
      const refetched = await getInvoice(data.id);
      if (!refetched) {
        return {
          success: false as const,
          errors: ["Duplizierte Rechnung konnte nicht geladen werden."],
        };
      }

      if (!canEditInvoice(refetched)) {
        return {
          success: false as const,
          errors: [`Duplizierte Rechnung hat ungültigen Status: ${refetched.status}`],
        };
      }

      revalidatePath("/invoices");
      revalidatePath(`/invoices/${refetched.id}`);
      return { success: true as const, data: refetched };
    }

    if (error && isDuplicateInvoiceNumberError(error) && attempt === 0) {
      invoiceNumber = await generateNextInvoiceNumber(supabase, year);
      continue;
    }

    if (error && isDuplicateInvoiceNumberError(error)) {
      return {
        success: false as const,
        errors: ["Rechnungsnummer konnte nicht vergeben werden. Bitte erneut versuchen."],
      };
    }

    return { success: false as const, errors: [error?.message || "Duplizieren fehlgeschlagen."] };
  }

  return { success: false as const, errors: ["Duplizieren fehlgeschlagen."] };
}
