"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Stack } from "@mui/material";
import {
  ContentCopyOutlinedIcon,
  KeyboardArrowDownOutlinedIcon,
  SendOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsButton } from "@/components/forms/ims";
import { InvoiceRowActionsMenu } from "@/components/invoices/InvoiceRowActionsMenu";
import { updateInvoiceStatus, duplicateInvoice } from "@/lib/actions/invoices";
import { canDuplicateInvoice } from "@/lib/invoice-lifecycle";
import type { Invoice, InvoiceStatus } from "@/lib/types/database";

interface InvoiceDetailActionsProps {
  invoice: Invoice;
}

export function InvoiceDetailActions({ invoice }: InvoiceDetailActionsProps) {
  const router = useRouter();
  const t = useTranslations("invoiceDetail");
  const tInvoice = useTranslations("invoice");
  const tValidation = useTranslations("validation");

  async function changeStatus(status: InvoiceStatus) {
    await updateInvoiceStatus(invoice.id, status);
    router.refresh();
  }

  async function handleDuplicate() {
    const result = await duplicateInvoice(invoice.id);
    if (!result.success) {
      alert(result.errors?.[0] || tValidation("duplicateFailed"));
      return;
    }
    if (result.data) {
      router.replace(`/invoices/${result.data.id}`);
      router.refresh();
    }
  }

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexShrink: 0 }}>
      {invoice.status === "generated" ? (
        <ImsButton
          imsVariant="secondary"
          startIcon={<SendOutlinedIcon />}
          onClick={() => changeStatus("sent")}
        >
          {t("markAsSent")}
        </ImsButton>
      ) : null}
      {invoice.status === "sent" ? (
        <ImsButton imsVariant="secondary" onClick={() => changeStatus("paid")}>
          {t("markAsPaid")}
        </ImsButton>
      ) : null}

      <InvoiceRowActionsMenu
        invoice={invoice}
        hideOpenInvoice
        hideDuplicate
        trigger={({ onClick, disabled }) => (
          <ImsButton
            imsVariant="secondary"
            endIcon={<KeyboardArrowDownOutlinedIcon />}
            onClick={onClick}
            disabled={disabled}
          >
            {t("actions")}
          </ImsButton>
        )}
      />

      {canDuplicateInvoice(invoice) ? (
        <ImsButton startIcon={<ContentCopyOutlinedIcon />} onClick={handleDuplicate}>
          {tInvoice("duplicate")}
        </ImsButton>
      ) : null}
    </Stack>
  );
}
