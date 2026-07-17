import type { ImsStatusTone } from "@/components/forms/ims";
import { isInvoiceArchived } from "@/lib/invoice-lifecycle";
import type { Invoice, InvoiceStatus } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (!invoice.payment_deadline) return false;
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") {
    return false;
  }
  const deadline = new Date(invoice.payment_deadline);
  deadline.setHours(23, 59, 59, 999);
  return deadline < new Date();
}

export function getInvoiceDisplayStatus(
  invoice: Invoice,
  labels: {
    archived: string;
    overdue: string;
    cancelled: string;
    draft: string;
    generated: string;
    sent: string;
    paid: string;
  }
): { label: string; tone: ImsStatusTone } {
  if (isInvoiceArchived(invoice)) {
    return { label: labels.archived, tone: "gray" };
  }
  if (isInvoiceOverdue(invoice)) {
    return { label: labels.overdue, tone: "red" };
  }
  if (invoice.status === "cancelled") {
    return { label: labels.cancelled, tone: "red" };
  }

  const map: Record<InvoiceStatus, { label: string; tone: ImsStatusTone }> = {
    draft: { label: labels.draft, tone: "gray" },
    generated: { label: labels.generated, tone: "green" },
    sent: { label: labels.sent, tone: "amber" },
    paid: { label: labels.paid, tone: "green" },
    cancelled: { label: labels.cancelled, tone: "red" },
  };

  return map[invoice.status];
}

export function getPaymentStatusChip(
  paymentStatus: string | null | undefined,
  labels: { unpaid: string; paid: string; pending: string }
): { label: string; tone: ImsStatusTone } | null {
  const normalized = paymentStatus?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "paid" || normalized === "bezahlt") {
    return { label: labels.paid, tone: "green" };
  }
  if (normalized === "unpaid" || normalized === "unbezahlt" || normalized === "open") {
    return { label: labels.unpaid, tone: "amber" };
  }
  if (normalized === "pending" || normalized === "ausstehend") {
    return { label: labels.pending, tone: "gray" };
  }
  return { label: paymentStatus!, tone: "neutral" };
}

export function formatPaymentDeadlineLabel(
  deadline: string,
  locale: AppLocale,
  inDaysLabel: (days: number) => string
) {
  const formatted = formatDate(deadline, locale);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays > 0) {
    return `${formatted} · ${inDaysLabel(diffDays)}`;
  }
  return formatted;
}
