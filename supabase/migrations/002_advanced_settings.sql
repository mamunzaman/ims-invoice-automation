-- Advanced invoice settings: default currency, address scope, multiple bank accounts

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS customer_address_scope TEXT NOT NULL DEFAULT 'DE';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_customer_address_scope_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_customer_address_scope_check
  CHECK (customer_address_scope IN ('DE', 'WORLD'));

CREATE TABLE IF NOT EXISTS public.profile_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT,
  account_holder TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_bank_accounts_user_id_idx
  ON public.profile_bank_accounts(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS profile_bank_accounts_one_default_per_user_idx
  ON public.profile_bank_accounts(user_id)
  WHERE is_default = true;

CREATE TRIGGER profile_bank_accounts_updated_at
  BEFORE UPDATE ON public.profile_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_single_default_bank_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.profile_bank_accounts
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id IS DISTINCT FROM NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_bank_accounts_single_default ON public.profile_bank_accounts;

CREATE TRIGGER profile_bank_accounts_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.profile_bank_accounts
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_bank_account();

ALTER TABLE public.profile_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bank accounts" ON public.profile_bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts" ON public.profile_bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts" ON public.profile_bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts" ON public.profile_bank_accounts
  FOR DELETE USING (auth.uid() = user_id);
