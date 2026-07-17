"use client";

import { Grid } from "@mui/material";
import { useTranslations } from "next-intl";
import {
  DescriptionOutlinedIcon,
  DownloadIcon,
  OpenInNewIcon,
  PictureAsPdfOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsCard, ImsDocumentCard } from "@/components/forms/ims";
import { sanitizeExternalUrl } from "@/lib/urls";

interface DocumentActionCardProps {
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
}

export function DocumentActionCard({ googleDocUrl, pdfUrl }: DocumentActionCardProps) {
  const t = useTranslations("documents");
  const safeGoogleDocUrl = sanitizeExternalUrl(googleDocUrl);
  const safePdfUrl = sanitizeExternalUrl(pdfUrl);

  if (!safeGoogleDocUrl && !safePdfUrl) return null;

  return (
    <ImsCard title={t("title")}>
      <Grid container spacing={2}>
        {safeGoogleDocUrl ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsDocumentCard
              icon={<DescriptionOutlinedIcon />}
              iconColor="#2563eb"
              title={t("googleDoc")}
              subtitle={t("googleDocHint")}
              actionLabel={t("open")}
              href={safeGoogleDocUrl}
              endIcon={<OpenInNewIcon />}
              emptyLabel={t("notCreated")}
            />
          </Grid>
        ) : null}
        {safePdfUrl ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsDocumentCard
              icon={<PictureAsPdfOutlinedIcon />}
              iconColor="#dc2626"
              title={t("pdf")}
              subtitle={t("pdfHint")}
              actionLabel={t("download")}
              href={safePdfUrl}
              endIcon={<DownloadIcon />}
              emptyLabel={t("notCreated")}
            />
          </Grid>
        ) : null}
      </Grid>
    </ImsCard>
  );
}
