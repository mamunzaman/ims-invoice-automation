"use client";

import { Box, Grid, Stack, Typography } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import {
  CloudOutlinedIcon,
  DescriptionOutlinedIcon,
  DownloadIcon,
  FolderOutlinedIcon,
  OpenInNewIcon,
  PictureAsPdfOutlinedIcon,
  TableChartOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsCard, ImsDocumentCard, ImsStatusChip } from "@/components/forms/ims";
import type { InvoiceRegisterDisplayStatus } from "@/lib/invoice-generation-steps";
import {
  yearlyRegisterExcelBackupPath,
  yearlyRegisterSheetName,
} from "@/lib/invoice-generation-steps";
import { extractDropboxArchiveFolder, isLocalhostAbsoluteUrl, sanitizeExternalUrl } from "@/lib/urls";
import { formatDate } from "@/lib/utils";
import { type AppLocale } from "@/i18n/routing";
import { designTokens } from "@/theme/designTokens";
import { imsColors } from "@/theme/imsTheme";

interface InvoiceDetailDocumentsProps {
  googleDocUrl?: string | null;
  pdfDownloadHref?: string | null;
  docxDownloadHref?: string | null;
  pdfGenerated?: boolean;
  docxGenerated?: boolean;
  pdfSavedInDropbox?: boolean;
  docxSavedInDropbox?: boolean;
  generatedAt?: string | null;
  dropboxPdfPath?: string | null;
  dropboxDocxPath?: string | null;
  invoiceYear?: number;
  workflowComplete?: boolean;
  invoiceNumber?: string;
  registerStatus?: InvoiceRegisterDisplayStatus;
  registerErrorMessage?: string | null;
}

function buildDocumentSubtitle(
  generatedAt: string | null | undefined,
  savedInDropbox: boolean,
  locale: AppLocale,
  translate: (key: "createdAt" | "savedInDropbox" | "noDate", values?: { date?: string }) => string
) {
  const parts: string[] = [];
  if (generatedAt) {
    parts.push(translate("createdAt", { date: formatDate(generatedAt, locale) }));
  }
  if (savedInDropbox) {
    parts.push(translate("savedInDropbox"));
  }
  return parts.length ? parts.join(" · ") : translate("noDate");
}

function RegisterInfoPanel({
  invoiceNumber,
  year,
  status,
  errorMessage,
}: {
  invoiceNumber: string;
  year: number;
  status: InvoiceRegisterDisplayStatus;
  errorMessage?: string | null;
}) {
  const t = useTranslations("documents");
  const sheetName = yearlyRegisterSheetName(year);
  const backupPath = yearlyRegisterExcelBackupPath(year);

  const isRecorded = status === "recorded";
  const isFailed = status === "failed";

  const badgeLabel = isRecorded
    ? t("registerRecorded")
    : isFailed
      ? t("registerFailedBadge")
      : t("registerNotRecorded");

  const badgeTone = isRecorded ? "green" : isFailed ? "red" : "gray";

  const description = isRecorded
    ? t("registerRecordedDescription", { invoiceNumber, year })
    : isFailed
      ? t("registerFailedDescription")
      : t("registerPendingDescription", { year });

  const iconColor = isRecorded
    ? imsColors.primaryDark
    : isFailed
      ? "#b42318"
      : imsColors.textMuted;

  const surfaceBg = isRecorded
    ? designTokens.color.primaryLight
    : isFailed
      ? "#fef2f2"
      : designTokens.surface.cardSoft;

  const surfaceBorder = isRecorded
    ? "rgba(63,143,0,0.22)"
    : isFailed
      ? "#fecaca"
      : designTokens.border.default;

  return (
    <Box
      sx={{
        mt: 2,
        px: 2,
        py: 1.75,
        borderRadius: "12px",
        border: `1px solid ${surfaceBorder}`,
        bgcolor: surfaceBg,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: "10px",
            bgcolor: designTokens.surface.input,
            border: `1px solid ${designTokens.border.default}`,
            display: "grid",
            placeItems: "center",
            color: iconColor,
          }}
        >
          <TableChartOutlinedIcon sx={{ fontSize: 20 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 0.75 }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: imsColors.textDark }}>
              {t("registerTitle")}
            </Typography>
            <ImsStatusChip tone={badgeTone} label={badgeLabel} />
          </Stack>

          <Typography sx={{ mt: 0.75, fontSize: 13, color: imsColors.textDark, lineHeight: 1.45 }}>
            {description}
          </Typography>

          {isFailed && errorMessage ? (
            <Typography sx={{ mt: 0.5, fontSize: 12, color: "#b42318", lineHeight: 1.4 }}>
              {errorMessage}
            </Typography>
          ) : null}

          <Typography sx={{ mt: 0.75, fontSize: 13, color: imsColors.textMuted, lineHeight: 1.4 }}>
            {t("registerSheetLabel")}: {sheetName}
          </Typography>

          {isRecorded ? (
            <>
              <Typography sx={{ mt: 0.35, fontSize: 12, color: imsColors.textMuted, lineHeight: 1.4 }}>
                {t("registerBackupNote")}
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: 11,
                  color: imsColors.textMuted,
                  lineHeight: 1.4,
                  wordBreak: "break-all",
                  opacity: 0.85,
                }}
              >
                {backupPath}
              </Typography>
            </>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}

export function InvoiceDetailDocuments({
  googleDocUrl,
  pdfDownloadHref,
  docxDownloadHref,
  pdfGenerated = false,
  docxGenerated = false,
  pdfSavedInDropbox = false,
  docxSavedInDropbox = false,
  generatedAt,
  dropboxPdfPath,
  dropboxDocxPath,
  invoiceYear,
  workflowComplete = false,
  invoiceNumber,
  registerStatus = "pending",
  registerErrorMessage,
}: InvoiceDetailDocumentsProps) {
  const t = useTranslations("documents");
  const locale = useLocale() as AppLocale;
  const safeGoogleUrl = sanitizeExternalUrl(googleDocUrl);
  const safePdfHref =
    pdfDownloadHref && !isLocalhostAbsoluteUrl(pdfDownloadHref) ? pdfDownloadHref : null;
  const safeDocxHref =
    docxDownloadHref && !isLocalhostAbsoluteUrl(docxDownloadHref) ? docxDownloadHref : null;
  const pdfSubtitle = buildDocumentSubtitle(generatedAt, pdfSavedInDropbox, locale, t);
  const docxSubtitle = buildDocumentSubtitle(generatedAt, docxSavedInDropbox, locale, t);
  const googleSubtitle = generatedAt
    ? t("createdAt", { date: formatDate(generatedAt, locale) })
    : t("noDate");
  const archiveFolder = extractDropboxArchiveFolder(dropboxPdfPath, dropboxDocxPath, invoiceYear);
  const hasDropboxArchive = Boolean(dropboxPdfPath || dropboxDocxPath || workflowComplete);
  const year = invoiceYear ?? new Date().getFullYear();

  return (
    <ImsCard title={t("title")}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ImsDocumentCard
            icon={<DescriptionOutlinedIcon />}
            iconColor="#2563eb"
            title={t("googleDoc")}
            subtitle={googleSubtitle}
            actionLabel={t("open")}
            href={safeGoogleUrl}
            endIcon={<OpenInNewIcon />}
            emptyLabel={t("notCreated")}
            isGenerated={Boolean(safeGoogleUrl)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ImsDocumentCard
            icon={<PictureAsPdfOutlinedIcon />}
            iconColor="#dc2626"
            title={t("pdf")}
            subtitle={pdfSubtitle}
            actionLabel={t("download")}
            href={safePdfHref}
            endIcon={<DownloadIcon />}
            emptyLabel={t("notCreated")}
            isGenerated={pdfGenerated}
            generatedLabel={t("savedInDropbox")}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ImsDocumentCard
            icon={<DescriptionOutlinedIcon />}
            iconColor="#0f766e"
            title={t("docx")}
            subtitle={docxSubtitle}
            actionLabel={t("download")}
            href={safeDocxHref}
            endIcon={<DownloadIcon />}
            emptyLabel={t("notCreated")}
            isGenerated={docxGenerated}
            generatedLabel={t("savedInDropbox")}
          />
        </Grid>
      </Grid>

      {invoiceNumber ? (
        <RegisterInfoPanel
          invoiceNumber={invoiceNumber}
          year={year}
          status={registerStatus}
          errorMessage={registerErrorMessage}
        />
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 3 }}
        sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${imsColors.border}` }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CloudOutlinedIcon sx={{ fontSize: 18, color: imsColors.textMuted }} />
          <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
            {t("storage")}:{" "}
            <Typography component="span" sx={{ color: imsColors.textDark, fontWeight: 600 }}>
              {t("dropbox")}
            </Typography>
          </Typography>
        </Stack>
        {archiveFolder ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <FolderOutlinedIcon sx={{ fontSize: 18, color: imsColors.textMuted }} />
            <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
              {t("archiveFolder")}:{" "}
              <Typography component="span" sx={{ color: imsColors.textDark, fontWeight: 600 }}>
                {archiveFolder}
              </Typography>
            </Typography>
          </Stack>
        ) : null}
      </Stack>
      {hasDropboxArchive ? (
        <Typography sx={{ mt: 1.5, fontSize: 13, color: imsColors.textMuted }}>
          {t("alleRechnungenNote")}
        </Typography>
      ) : null}
    </ImsCard>
  );
}
