"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  CustomerAddressScope,
  Profile,
  SupportedCurrency,
} from "@/lib/types/database";

export interface SettingsFormData {
  sender_name: string;
  sender_address: string;
  email: string;
  phone: string;
  tax_number: string;
  default_payment_terms: string;
  small_business_rule: boolean;
  default_currency: SupportedCurrency;
  customer_address_scope: CustomerAddressScope;
  language?: "en" | "de" | null;
}

export async function getSettings(): Promise<Profile | null> {
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

export async function getCustomerAddressScope(): Promise<CustomerAddressScope> {
  const profile = await getSettings();
  return profile?.customer_address_scope === "WORLD" ? "WORLD" : "DE";
}

export async function updateSettings(formData: SettingsFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, errors: ["Nicht angemeldet."] };

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      sender_name: formData.sender_name.trim() || null,
      sender_address: formData.sender_address.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      tax_number: formData.tax_number.trim() || null,
      default_payment_terms: formData.default_payment_terms.trim() || null,
      small_business_rule: formData.small_business_rule,
      default_currency: formData.default_currency,
      customer_address_scope: formData.customer_address_scope,
    });

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/settings");
  revalidatePath("/invoices/new");
  revalidatePath("/customers/new");
  revalidatePath("/customers");
  return { success: true as const };
}
