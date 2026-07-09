"use client";

import { OpenInNewIcon, DownloadIcon, DescriptionOutlinedIcon, PictureAsPdfOutlinedIcon } from "@/components/icons/muiIcons";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { ImsButton } from "@/components/forms/ims";
import { sanitizeExternalUrl } from "@/lib/urls";

interface DocumentActionCardProps {
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
}

export function DocumentActionCard({ googleDocUrl, pdfUrl }: DocumentActionCardProps) {
  const t = useTranslations("timeline");
  const tInvoice = useTranslations("invoice");
  const safeGoogleDocUrl = sanitizeExternalUrl(googleDocUrl);
  const safePdfUrl = sanitizeExternalUrl(pdfUrl);

  if (!safeGoogleDocUrl && !safePdfUrl) return null;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("documentsTitle")}
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {safeGoogleDocUrl ? (
          <Card sx={{ flex: 1, borderRadius: "20px" }}>
            <CardContent>
              <Stack spacing={1.5}>
                <DescriptionOutlinedIcon sx={{ color: "#2563eb", fontSize: 28 }} />
                <Typography sx={{ fontWeight: 700 }}>{t("googleDocInvoice")}</Typography>
                <Typography variant="body2">{t("googleDocDescription")}</Typography>
                <ImsButton
                  component="a"
                  href={safeGoogleDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  imsVariant="secondary"
                  endIcon={<OpenInNewIcon />}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {tInvoice("openGoogleDocs")}
                </ImsButton>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {safePdfUrl ? (
          <Card sx={{ flex: 1, borderRadius: "20px" }}>
            <CardContent>
              <Stack spacing={1.5}>
                <PictureAsPdfOutlinedIcon sx={{ color: "#dc2626", fontSize: 28 }} />
                <Typography sx={{ fontWeight: 700 }}>{t("pdfInvoice")}</Typography>
                <Typography variant="body2">{t("pdfDescription")}</Typography>
                <ImsButton
                  component="a"
                  href={safePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<DownloadIcon />}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {t("downloadPdf")}
                </ImsButton>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </Box>
  );
}
