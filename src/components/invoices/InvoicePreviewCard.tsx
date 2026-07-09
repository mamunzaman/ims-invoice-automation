"use client";

import { Divider, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { PreviewCardShell } from "@/components/forms/ims";
import { imsColors } from "@/theme/imsTheme";

interface InvoicePreviewCardProps {
  invoiceNumber: string;
  invoiceDate: string;
  servicePeriod?: string | null;
  customerName: string;
  customerAddress?: string;
  serviceDescription?: string;
  netAmount?: string | null;
  totalAmount?: string | null;
  taxAmount?: string | null;
  showTax?: boolean;
  paymentDeadline?: string;
}

export function InvoicePreviewCard({
  invoiceNumber,
  invoiceDate,
  servicePeriod,
  customerName,
  customerAddress,
  serviceDescription,
  netAmount,
  totalAmount,
  taxAmount,
  showTax,
  paymentDeadline,
}: InvoicePreviewCardProps) {
  const t = useTranslations("invoice");
  const empty = "—";
  const hasTotal = totalAmount && totalAmount !== empty;

  return (
    <PreviewCardShell title={t("preview")} subtitle={t("previewSubtitle")}>
      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography
            sx={{
              fontWeight: 800,
              letterSpacing: 1.4,
              fontSize: 11,
              color: imsColors.textDark,
            }}
          >
            {t("invoiceHeader")}
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1.5, alignItems: "flex-start" }}>
            <Stack spacing={0.15}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: imsColors.textDark }}>
                {t("numberPrefix")} {invoiceNumber}
              </Typography>
              {servicePeriod ? (
                <Typography sx={{ fontSize: 11.5, color: imsColors.textMuted }}>
                  {t("periodLabel")}: {servicePeriod}
                </Typography>
              ) : null}
            </Stack>
            <Typography sx={{ fontSize: 12, color: imsColors.textMuted, textAlign: "right" }}>
              {invoiceDate}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: imsColors.border }} />

        <Stack spacing={0.35}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: imsColors.textMuted }}>
            {t("customerSection")}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: imsColors.textDark }}>
            {customerName || empty}
          </Typography>
          {customerAddress ? (
            <Typography
              sx={{
                fontSize: 12,
                color: imsColors.textMuted,
                whiteSpace: "pre-line",
                lineHeight: 1.45,
              }}
            >
              {customerAddress}
            </Typography>
          ) : null}
        </Stack>

        <Stack spacing={0.35}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: imsColors.textMuted }}>
            {t("serviceSection")}
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: serviceDescription ? imsColors.textDark : imsColors.textMuted,
              fontStyle: serviceDescription ? "normal" : "italic",
              whiteSpace: "pre-line",
              lineHeight: 1.45,
              display: serviceDescription ? "-webkit-box" : "block",
              WebkitLineClamp: serviceDescription ? 4 : undefined,
              WebkitBoxOrient: serviceDescription ? "vertical" : undefined,
              overflow: serviceDescription ? "hidden" : "visible",
            }}
          >
            {serviceDescription?.trim() || t("noServiceYet")}
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: imsColors.border }} />

        <Stack spacing={0.65}>
          <Row label={t("netTotal")} value={netAmount || empty} muted={!netAmount || netAmount === empty} />
          {showTax && taxAmount ? <Row label={t("vatTotal")} value={taxAmount} /> : null}
          <Row label={t("totalAmount")} value={totalAmount || empty} primary muted={!hasTotal} />
          <Typography sx={{ fontSize: 11.5, color: imsColors.textMuted, textAlign: "right" }}>
            {t("dueLabel")}: {paymentDeadline || empty}
          </Typography>
        </Stack>
      </Stack>
    </PreviewCardShell>
  );
}

function Row({
  label,
  value,
  primary,
  muted,
}: {
  label: string;
  value: string;
  primary?: boolean;
  muted?: boolean;
}) {
  const empty = "—";

  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>{label}</Typography>
      <Typography
        sx={{
          fontWeight: primary ? 700 : 500,
          fontSize: primary ? 18 : 12.5,
          color: primary
            ? muted
              ? imsColors.textMuted
              : imsColors.primary
            : muted
              ? imsColors.textMuted
              : imsColors.textDark,
          lineHeight: 1.1,
          fontStyle: muted && value === empty ? "italic" : "normal",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
