"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProfileBankAccount } from "@/lib/types/database";

export interface BankAccountFormData {
  label: string;
  account_holder: string;
  bank_name: string;
  iban: string;
  bic: string;
  is_default: boolean;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function syncProfileBankFields(userId: string, account: ProfileBankAccount) {
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      bank_name: account.bank_name,
      iban: account.iban,
      bic: account.bic,
    })
    .eq("id", userId);
}

export async function getBankAccounts(): Promise<ProfileBankAccount[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_bank_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBankAccount(formData: BankAccountFormData) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false as const, errors: ["Nicht angemeldet."] };

  const label = formData.label.trim();
  const bank_name = formData.bank_name.trim();
  const iban = formData.iban.trim();

  if (!label || !bank_name || !iban) {
    return {
      success: false as const,
      errors: ["Bezeichnung, Bank und IBAN sind Pflichtfelder."],
    };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profile_bank_accounts")
    .select("id")
    .eq("user_id", userId);

  const isFirstAccount = !existing?.length;
  const isDefault = formData.is_default || isFirstAccount;

  const { data, error } = await supabase
    .from("profile_bank_accounts")
    .insert({
      user_id: userId,
      label,
      account_holder: formData.account_holder.trim() || null,
      bank_name,
      iban,
      bic: formData.bic.trim() || null,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return { success: false as const, errors: [error.message] };

  if (data.is_default) {
    await syncProfileBankFields(userId, data);
  }

  revalidatePath("/settings");
  revalidatePath("/invoices/new");
  return { success: true as const, data };
}

export async function updateBankAccount(id: string, formData: BankAccountFormData) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false as const, errors: ["Nicht angemeldet."] };

  const label = formData.label.trim();
  const bank_name = formData.bank_name.trim();
  const iban = formData.iban.trim();

  if (!label || !bank_name || !iban) {
    return {
      success: false as const,
      errors: ["Bezeichnung, Bank und IBAN sind Pflichtfelder."],
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_bank_accounts")
    .update({
      label,
      account_holder: formData.account_holder.trim() || null,
      bank_name,
      iban,
      bic: formData.bic.trim() || null,
      is_default: formData.is_default,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return { success: false as const, errors: [error.message] };

  if (data.is_default) {
    await syncProfileBankFields(userId, data);
  }

  revalidatePath("/settings");
  revalidatePath("/invoices/new");
  return { success: true as const, data };
}

export async function deleteBankAccount(id: string) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false as const, errors: ["Nicht angemeldet."] };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_bank_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/settings");
  revalidatePath("/invoices/new");
  return { success: true as const };
}

export async function setDefaultBankAccount(id: string) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false as const, errors: ["Nicht angemeldet."] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_bank_accounts")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return { success: false as const, errors: [error.message] };

  await syncProfileBankFields(userId, data);

  revalidatePath("/settings");
  revalidatePath("/invoices/new");
  return { success: true as const, data };
}
