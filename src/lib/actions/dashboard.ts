import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/types/database";

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalInvoices: 0,
      paidInvoices: 0,
      openInvoices: 0,
      draftInvoices: 0,
      totalAmountThisMonth: 0,
    };
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("status, payment_status, net_amount, invoice_date");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const all = invoices ?? [];

  return {
    totalInvoices: all.length,
    paidInvoices: all.filter((i) => i.status === "paid" || i.payment_status === "paid").length,
    openInvoices: all.filter((i) =>
      ["generated", "sent"].includes(i.status)
    ).length,
    draftInvoices: all.filter((i) => i.status === "draft").length,
    totalAmountThisMonth: all
      .filter((i) => i.invoice_date >= monthStart && i.status !== "cancelled")
      .reduce((sum, i) => sum + Number(i.net_amount), 0),
  };
}
