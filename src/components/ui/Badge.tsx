import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        INVOICE_STATUS_COLORS[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {INVOICE_STATUS_LABELS[status] || status}
    </span>
  );
}
