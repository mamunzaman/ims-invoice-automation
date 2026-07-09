"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  customerFieldErrorsToList,
  customerFormToDbPayload,
  validateCustomerForm,
  type CustomerFormData,
} from "@/lib/customers";
import type { Customer } from "@/lib/types/database";

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("customer_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createCustomer(formData: CustomerFormData) {
  const fieldErrors = validateCustomerForm(formData);
  const errors = customerFieldErrorsToList(fieldErrors);
  if (errors.length) return { success: false as const, errors, fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, errors: ["Nicht angemeldet."] };

  const { data, error } = await supabase
    .from("customers")
    .insert(customerFormToDbPayload(formData))
    .select()
    .single();

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/customers");
  return { success: true as const, data };
}

export async function updateCustomer(id: string, formData: CustomerFormData) {
  const fieldErrors = validateCustomerForm(formData);
  const errors = customerFieldErrorsToList(fieldErrors);
  if (errors.length) return { success: false as const, errors, fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update(customerFormToDbPayload(formData))
    .eq("id", id);

  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath(`/customers/${id}/edit`);
  return { success: true as const };
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", id);

  if (count && count > 0) {
    return {
      success: false as const,
      errors: ["Kunde kann nicht gelöscht werden, da Rechnungen vorhanden sind."],
    };
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { success: false as const, errors: [error.message] };

  revalidatePath("/customers");
  return { success: true as const };
}
