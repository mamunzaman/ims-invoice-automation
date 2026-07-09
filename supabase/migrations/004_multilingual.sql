-- PROPOSED: User interface language preference.
-- Run manually in Supabase when ready.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'de'));

COMMENT ON COLUMN public.profiles.language IS 'UI language: en or de';
