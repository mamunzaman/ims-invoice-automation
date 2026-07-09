"use client";

import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import {
  CheckCircleOutlinedIcon,
  DescriptionOutlinedIcon,
  ListAltOutlinedIcon,
  PictureAsPdfOutlinedIcon,
  RadioButtonUncheckedOutlinedIcon,
} from "@/components/icons/muiIcons";
import { imsCardSx } from "@/components/forms/ims";
import { imsColors } from "@/theme/imsTheme";

interface ReadinessItem {
  label: string;
  complete: boolean;
  hint?: string;
}

interface InvoiceFormSidebarProps {
  ready: boolean;
  items: ReadinessItem[];
}

export function InvoiceFormSidebar({ ready, items }: InvoiceFormSidebarProps) {
  const t = useTranslations("invoice");
  const tTimeline = useTranslations("timeline");

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          borderRadius: "16px",
          border: `1px solid ${imsColors.border}`,
          bgcolor: ready ? imsColors.primaryLight : "#fafbfc",
          px: 2,
          py: 1.35,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CheckCircleOutlinedIcon
            sx={{ fontSize: 18, color: ready ? imsColors.primary : imsColors.textMuted }}
          />
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: ready ? imsColors.primaryDark : imsColors.textDark,
            }}
          >
            {ready ? t("readyToGenerate") : t("fillRequiredFields")}
          </Typography>
        </Stack>
      </Box>

      <Card sx={{ ...imsCardSx, boxShadow: "0 1px 2px rgba(16, 24, 40, 0.03)" }}>
        <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.25, color: imsColors.textDark }}>
            {t("progress")}
          </Typography>
          <Stack spacing={0.85}>
            {items.map((item) => (
              <Stack
                key={item.label}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                  {item.complete ? (
                    <CheckCircleOutlinedIcon sx={{ color: imsColors.primary, fontSize: 17 }} />
                  ) : (
                    <RadioButtonUncheckedOutlinedIcon sx={{ color: imsColors.textMuted, fontSize: 17 }} />
                  )}
                  <Typography sx={{ fontSize: 13, color: imsColors.textDark }} noWrap>
                    {item.label}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: item.complete ? imsColors.primaryDark : imsColors.textMuted,
                    flexShrink: 0,
                  }}
                >
                  {item.complete ? t("statusOk") : item.hint || t("incomplete")}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ ...imsCardSx, bgcolor: imsColors.primaryLight, boxShadow: "none" }}>
        <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1.15, color: imsColors.textDark }}>
            {t("afterGenerationYouGet")}
          </Typography>
          <Stack spacing={0.75}>
            <InfoLine icon={<DescriptionOutlinedIcon sx={{ fontSize: 16 }} />} text={tTimeline("googleDocInvoice")} />
            <InfoLine icon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />} text={t("pdfFile")} />
            <InfoLine icon={<ListAltOutlinedIcon sx={{ fontSize: 16 }} />} text={t("overviewAndDownloads")} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box sx={{ color: imsColors.primary, display: "grid", placeItems: "center" }}>{icon}</Box>
      <Typography sx={{ fontSize: 12.5, color: imsColors.textDark }}>{text}</Typography>
    </Stack>
  );
}
