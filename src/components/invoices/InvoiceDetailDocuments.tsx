"use client";

import { Grid, Stack, Typography } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import {
  CloudOutlinedIcon,
  DescriptionOutlinedIcon,
  DownloadIcon,
  FolderOutlinedIcon,
  OpenInNewIcon,
  PictureAsPdfOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsCard, ImsDocumentCard } from "@/components/forms/ims";
import { extractDropboxArchiveFolder, isLocalhostAbsoluteUrl, sanitizeExternalUrl } from "@/lib/urls";
import { formatDate } from "@/lib/utils";
import { type AppLocale } from "@/i18n/routing";
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
