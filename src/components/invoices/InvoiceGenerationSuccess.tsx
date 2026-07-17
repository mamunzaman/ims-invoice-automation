"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Alert,
  Box,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  AddIcon,
  ArrowBackIcon,
  CalendarMonthOutlinedIcon,
  CheckCircleOutlinedIcon,
  ContentCopyIcon,
  ListAltOutlinedIcon,
  PersonOutlineOutlinedIcon,
} from "@/components/icons/muiIcons";
import { GenerationTimeline } from "@/components/invoices/GenerationTimeline";
import { DocumentActionCard } from "@/components/invoices/DocumentActionCard";
import { PageShell } from "@/components/layout/PageShell";
import { ImsButton, ImsCard } from "@/components/forms/ims";
import type { GenerationResultStep } from "@/lib/generation-status";
import { formatCurrency, formatGermanDate } from "@/lib/utils";
import { resolveStoredDropboxSharedUrl } from "@/lib/dropbox-documents";
import { sanitizeExternalUrl } from "@/lib/urls";
import { imsColors } from "@/theme/imsTheme";

export interface InvoiceGenerationSuccessData {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  amount_net: number;
  invoice_date: string;
  currency?: string;
  google_doc_url?: string;
  pdf_url?: string;
  docx_url?: string;
  dropbox_pdf_url?: string;
  dropbox_docx_url?: string;
  generation_status: string;
  generation_error?: string;
  generated_at?: string;
  steps?: GenerationResultStep[];
}

interface InvoiceGenerationSuccessProps {
  data: InvoiceGenerationSuccessData;
}

export function InvoiceGenerationSuccess({ data }: InvoiceGenerationSuccessProps) {
  const router = useRouter();
  const t = useTranslations("invoice");
  const tNav = useTranslations("navigation");
  const [copied, setCopied] = useState(false);
  const currency = data.currency || "EUR";
  const safeGoogleDocUrl = sanitizeExternalUrl(data.google_doc_url);
  const safePdfUrl = resolveStoredDropboxSharedUrl(data.dropbox_pdf_url, data.steps, "pdf");
  const safeDocxUrl = resolveStoredDropboxSharedUrl(data.dropbox_docx_url, data.steps, "docx");

  async function copyInvoiceNumber() {
    await navigator.clipboard.writeText(data.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PageShell
      breadcrumbs={[
        { label: tNav("invoices"), href: "/invoices" },
        { label: t("newInvoice") },
      ]}
      title={t("newInvoice")}
      topActions={
        <ImsButton imsVariant="secondary" startIcon={<ArrowBackIcon />} onClick={() => router.push("/invoices")}>
          {t("backToOverview")}
        </ImsButton>
      }
    >
      <Stack spacing={3}>
        <Alert
          icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
          severity="success"
          sx={{ bgcolor: imsColors.primaryLight, color: imsColors.primaryDark }}
        >
          {t("generationSuccessAlert")}
        </Alert>

        <ImsCard
          variant="highlight"
          padding="lg"
          sx={{
            background: `linear-gradient(135deg, ${imsColors.primaryDark} 0%, ${imsColors.primary} 100%)`,
            color: "#fff",
            border: "none",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 2 }}
          >
            <Stack spacing={0.5}>
              <Typography sx={{ opacity: 0.9, fontSize: 14 }}>{t("totalAmountLabel")}</Typography>
              <Typography sx={{ fontSize: { xs: 32, md: 40 }, fontWeight: 800 }}>
                {formatCurrency(data.amount_net, currency)}
              </Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.85 }}>{currency}</Typography>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box>
                <Typography sx={{ opacity: 0.9, fontSize: 13 }}>{t("invoiceNumber")}</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{data.invoice_number}</Typography>
              </Box>
              <IconButton onClick={copyInvoiceNumber} sx={{ color: "#fff" }} aria-label={t("copyInvoiceNumber")}>
                <ContentCopyIcon />
              </IconButton>
            </Stack>
          </Stack>
          {copied ? (
            <Typography sx={{ mt: 1, fontSize: 12, opacity: 0.9 }}>{t("copied")}</Typography>
          ) : null}
        </ImsCard>

        <ImsCard>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ flex: 1, p: 1 }}>
                <PersonOutlineOutlinedIcon sx={{ color: imsColors.primary }} />
                <Box>
                  <Typography variant="body2">{t("customer")}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{data.customer_name}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ flex: 1, p: 1 }}>
                <CalendarMonthOutlinedIcon sx={{ color: imsColors.primary }} />
                <Box>
                  <Typography variant="body2">{t("invoiceDate")}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{formatGermanDate(data.invoice_date)}</Typography>
                </Box>
              </Stack>
            </Stack>
        </ImsCard>

        <GenerationTimeline
          steps={data.steps}
          googleDocUrl={safeGoogleDocUrl}
          pdfUrl={safePdfUrl}
          docxUrl={safeDocxUrl}
          dropboxPdfUrl={safePdfUrl}
          dropboxDocxUrl={safeDocxUrl}
        />
        <DocumentActionCard googleDocUrl={safeGoogleDocUrl} pdfUrl={safePdfUrl} />

        <ImsCard variant="highlight">
            <Stack
              direction={{ xs: "column", md: "row" }}
              sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 2 }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t("whatNext")}</Typography>
                <Typography variant="body2">{t("whatNextHint")}</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <ImsButton
                  imsVariant="secondary"
                  startIcon={<ListAltOutlinedIcon />}
                  onClick={() => router.push(`/invoices/${data.invoice_id}`)}
                  sx={{ bgcolor: "#fff" }}
                >
                  {t("openInvoice")}
                </ImsButton>
                <ImsButton startIcon={<AddIcon />} onClick={() => router.push("/invoices/new")}>
                  {t("createAnother")}
                </ImsButton>
              </Stack>
            </Stack>
        </ImsCard>
      </Stack>
    </PageShell>
  );
}
