import type { SupabaseClient } from "@supabase/supabase-js";

const INVOICE_NUMBER_RE = /^(\d{4})-(\d{4})$/;

const LEGAL_SUFFIXES = new Set([
  "gmbh",
  "ug",
  "ag",
  "kg",
  "ltd",
  "limited",
  "inc",
  "llc",
  "plc",
  "corp",
  "corporation",
  "company",
  "co",
  "sa",
  "bv",
  "nv",
  "ek",
  "ev",
]);

export function formatInvoiceNumber(year: number, serial: number): string {
  return `${year}-${String(serial).padStart(4, "0")}`;
}

export function yearFromInvoiceDate(invoiceDate: string): number {
  return new Date(invoiceDate).getFullYear();
}

function parseSerial(invoiceNumber: string, year: number): number | null {
  const match = invoiceNumber.match(INVOICE_NUMBER_RE);
  if (!match) return null;
  if (parseInt(match[1], 10) !== year) return null;
  return parseInt(match[2], 10);
}

export async function generateNextInvoiceNumber(
  supabase: SupabaseClient,
  year: number
): Promise<string> {
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${year}-%`);

  if (error) throw new Error(error.message);

  let maxSerial = 0;
  for (const row of data ?? []) {
    const serial = parseSerial(row.invoice_number, year);
    if (serial != null && serial > maxSerial) {
      maxSerial = serial;
    }
  }

  return formatInvoiceNumber(year, maxSerial + 1);
}

export async function resolveInvoiceNumber(
  supabase: SupabaseClient,
  invoiceDate: string,
  existingNumber?: string | null
): Promise<string> {
  const trimmed = existingNumber?.trim();
  if (trimmed) return trimmed;

  const year = yearFromInvoiceDate(invoiceDate);
  return generateNextInvoiceNumber(supabase, year);
}

export function isDuplicateInvoiceNumberError(error: { code?: string }): boolean {
  return error.code === "23505";
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/\./g, "");
}

function isLegalSuffix(word: string): boolean {
  return LEGAL_SUFFIXES.has(normalizeWord(word));
}

function meaningfulWords(customerName: string): string[] {
  const normalized = customerName
    .trim()
    .replace(/[&+/,.()[\]{}-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  return normalized
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !isLegalSuffix(word));
}

export function buildCustomerShortCode(customerName: string): string {
  const words = meaningfulWords(customerName);

  if (words.length === 0) {
    return "KND";
  }

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  if (words.length === 2) {
    return words
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function buildInvoiceFileName(
  invoiceNumber: string,
  customerName: string,
  extension?: string
): string {
  const code = buildCustomerShortCode(customerName);
  const base = `Rechnung_${invoiceNumber}_${code}`;
  if (!extension) return base;
  return `${base}.${extension.replace(/^\./, "")}`;
}
