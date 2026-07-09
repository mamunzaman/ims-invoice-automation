-- PROPOSED: Invoice administration settings on profiles.
-- Run manually in Supabase when ready. App degrades gracefully if column is missing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.invoice_settings IS
  'Invoice admin: google_template_doc_id, google_docs_folder_id, pdf_folder_id, default_payment_days, default_invoice_title, invoice_number_year_reset';

-- Optional: extend invoice_status enum with archived (alternative to notes-meta archive flag)
-- ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'archived';
