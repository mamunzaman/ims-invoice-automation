"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";
import {
  DeleteOutlinedIcon,
  DescriptionOutlinedIcon,
  EditOutlinedIcon,
  VisibilityOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsIconButton } from "@/components/forms/ims";
import { updateInvoiceStatus } from "@/lib/actions/invoices";
import { invoicePdfUrl, invoiceGoogleDocUrl } from "@/lib/invoice-form";
import type { Invoice, InvoiceStatus } from "@/lib/types/database";
import { imsColors } from "@/theme/imsTheme";

export function InvoiceListActions({
  invoice,
  stayOnPage = false,
}: {
  invoice: Invoice;
  stayOnPage?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canEdit = invoice.status === "draft";
  const canCancel = ["draft", "generated", "sent"].includes(invoice.status);
  const docUrl = invoicePdfUrl(invoice) || invoiceGoogleDocUrl(invoice);

  async function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Rechnung wirklich stornieren?")) return;
    setLoading(true);
    await updateInvoiceStatus(invoice.id, "cancelled" as InvoiceStatus);
    if (!stayOnPage) {
      router.push("/invoices");
    }
    router.refresh();
    setLoading(false);
  }

  function openDocument(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (docUrl) {
      window.open(docUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
        <ImsIconButton
          label="Rechnung anzeigen"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/invoices/${invoice.id}`);
          }}
        >
          <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
        </ImsIconButton>
        {canEdit ? (
          <ImsIconButton
            label="Rechnung bearbeiten"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/invoices/${invoice.id}`);
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </ImsIconButton>
        ) : null}
        {docUrl ? (
          <ImsIconButton
            label={invoicePdfUrl(invoice) ? "PDF öffnen" : "Google Docs öffnen"}
            onClick={openDocument}
            sx={{
              "&:hover": { bgcolor: imsColors.primaryLight, color: imsColors.primaryDark },
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
          </ImsIconButton>
        ) : null}
        {canCancel ? (
          <ImsIconButton
            label="Rechnung stornieren"
            disabled={loading}
            onClick={handleCancel}
            sx={{
              "&:hover": { bgcolor: "#fef2f2", color: "#b42318", borderColor: "#fecaca" },
            }}
          >
            <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
          </ImsIconButton>
        ) : null}
      </Stack>
    </div>
  );
}
