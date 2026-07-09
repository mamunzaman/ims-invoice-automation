export type InvoiceStatus =
  | "draft"
  | "generated"
  | "sent"
  | "paid"
  | "cancelled";

export type GenerationStatus =
  | "PENDING"
  | "VALIDATING"
  | "COPYING_TEMPLATE"
  | "REPLACING_PLACEHOLDERS"
  | "EXPORTING_PDF"
  | "UPLOADING_PDF"
  | "COMPLETED"
  | "FAILED";

export type CustomerAddressScope = "DE" | "WORLD";

export type SupportedCurrency = "EUR" | "USD" | "GBP" | "CHF";

export interface ProfileInvoiceSettings {
  google_template_doc_id?: string;
  google_docs_folder_id?: string;
  pdf_folder_id?: string;
  default_payment_days?: number;
  default_invoice_title?: string;
  invoice_number_year_reset?: boolean;
  default_bank_account_id?: string;
  last_numbering_reset_at?: string;
}

export interface Profile {
  id: string;
  sender_name: string | null;
  sender_address: string | null;
  email: string | null;
  phone: string | null;
  tax_number: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  default_payment_terms: string | null;
  small_business_rule: boolean;
  default_currency: SupportedCurrency;
  customer_address_scope: CustomerAddressScope;
  invoice_settings?: ProfileInvoiceSettings | null;
  language?: "en" | "de" | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileBankAccount {
  id: string;
  user_id: string;
  label: string;
  bank_name: string;
  iban: string;
  bic: string | null;
  account_holder: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  company_name: string | null;
  contact_person: string | null;
  customer_address: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_vat_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  default_currency: string | null;
  default_payment_terms_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string | null;
  template_id: string | null;
  invoice_number: string;
  invoice_date: string;
  service_period: string | null;
  payment_deadline: string | null;
  currency: string;
  net_amount: number;
  vat_rate: number;
  vat_amount: number;
  gross_amount: number;
  is_small_business: boolean;
  small_business_notice: string | null;
  notes: string | null;
  status: InvoiceStatus;
  payment_status: string;
  workflow_status: string;
  workflow_error: string | null;
  generation_status: GenerationStatus | null;
  generation_step: GenerationStatus | null;
  generation_error: string | null;
  google_doc_id: string | null;
  google_doc_url: string | null;
  pdf_file_id: string | null;
  pdf_url: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLog {
  id: string;
  invoice_id: string;
  user_id: string;
  status: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface InvoiceFormData {
  invoice_number: string;
  invoice_date: string;
  service_period_start: string;
  service_period_end: string;
  invoice_title: string;
  customer_id: string;
  customer_name: string;
  customer_salutation: string;
  customer_address: string;
  customer_zip: string;
  customer_city: string;
  customer_country: string;
  service_description: string;
  amount_net: string;
  currency: string;
  payment_deadline: string;
  payment_terms: string;
  optional_notes: string;
  small_business_rule: boolean;
  bank_name: string;
  account_holder: string;
  iban: string;
  bic: string;
  tax_number: string;
  invoice_language: string;
}

export interface N8nWebhookResponse {
  status: string;
  google_doc_url?: string;
  pdf_url?: string;
  invoice_number?: string;
}

export interface DashboardStats {
  totalInvoices: number;
  paidInvoices: number;
  openInvoices: number;
  draftInvoices: number;
  totalAmountThisMonth: number;
}
