"use client";

import { useRouter } from "next/navigation";
import { updateInvoiceStatus, duplicateInvoice } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/Button";
import type { InvoiceStatus } from "@/lib/types/database";

export function InvoiceStatusActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: InvoiceStatus;
}) {
  const router = useRouter();

  async function changeStatus(status: InvoiceStatus) {
    await updateInvoiceStatus(id, status);
    router.refresh();
  }

  async function handleDuplicate() {
    const result = await duplicateInvoice(id);
    if (!result.success) {
      alert(result.errors?.[0] || "Duplizieren fehlgeschlagen.");
      return;
    }
    if (result.data) {
      router.replace(`/invoices/${result.data.id}`);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === "generated" && (
        <Button size="sm" variant="secondary" onClick={() => changeStatus("sent")}>
          Als versendet markieren
        </Button>
      )}
      {currentStatus === "sent" && (
        <Button size="sm" variant="secondary" onClick={() => changeStatus("paid")}>
          Als bezahlt markieren
        </Button>
      )}
      {["draft", "generated", "sent"].includes(currentStatus) && (
        <Button size="sm" variant="danger" onClick={() => changeStatus("cancelled")}>
          Stornieren
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={handleDuplicate}>
        Duplizieren
      </Button>
    </div>
  );
}
