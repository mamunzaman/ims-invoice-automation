-- App settings and invoice administration JSON on profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.invoice_settings IS
  'App and invoice admin settings (automation, documents, defaults, security).';

NOTIFY pgrst, 'reload schema';
