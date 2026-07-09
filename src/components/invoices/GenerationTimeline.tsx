"use client";

import { OpenInNewIcon, CheckCircleIcon } from "@/components/icons/muiIcons";
import { Box, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import {
  isCompletedStepStatus,
  isFailedStepStatus,
  resolveGenerationSteps,
  type GenerationResultStep,
} from "@/lib/generation-status";
import { sanitizeExternalUrl } from "@/lib/urls";
import { imsColors } from "@/theme/imsTheme";

interface GenerationTimelineProps {
  steps?: GenerationResultStep[] | null;
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
}

const STEP_LABEL_KEYS: Record<string, "received" | "copyTemplate" | "replacePlaceholders" | "exportPdf" | "uploadPdf"> = {
  received: "received",
  copy_template: "copyTemplate",
  replace_placeholders: "replacePlaceholders",
  export_pdf: "exportPdf",
  upload_pdf: "uploadPdf",
};

function resolveStepLabel(step: GenerationResultStep, t: ReturnType<typeof useTranslations<"timeline">>) {
  const key = STEP_LABEL_KEYS[step.key];
  return key ? t(key) : step.label;
}

function resolveStepActionLabel(step: GenerationResultStep, t: ReturnType<typeof useTranslations<"timeline">>) {
  const url = step.url?.toLowerCase() ?? "";
  const key = step.key.toLowerCase();

  if (url.includes("drive.google.com") || key.includes("pdf")) {
    return t("view");
  }

  return t("open");
}

export function GenerationTimeline({ steps, googleDocUrl, pdfUrl }: GenerationTimelineProps) {
  const t = useTranslations("timeline");
  const checklistSteps = resolveGenerationSteps(steps, { googleDocUrl, pdfUrl });

  return (
    <Box
      sx={{
        border: `1px solid ${imsColors.border}`,
        borderRadius: "20px",
        bgcolor: "#fff",
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("stepsTitle")}
      </Typography>

      <Stack spacing={0} sx={{ position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            left: 15,
            top: 12,
            bottom: 12,
            width: 2,
            bgcolor: imsColors.primaryLight,
          }}
        />
        {checklistSteps.map((step, index) => (
          <TimelineRow key={`${step.key}-${index}`} step={step} t={t} />
        ))}
      </Stack>
    </Box>
  );
}

function TimelineRow({
  step,
  t,
}: {
  step: GenerationResultStep;
  t: ReturnType<typeof useTranslations<"timeline">>;
}) {
  const completed = isCompletedStepStatus(step.status);
  const failed = isFailedStepStatus(step.status);
  const safeUrl = sanitizeExternalUrl(step.url);

  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1.25, position: "relative", zIndex: 1 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: failed ? "#fee4e2" : completed ? imsColors.primaryLight : "#fff",
          border: `2px solid ${failed ? "#f04438" : completed ? imsColors.primary : imsColors.border}`,
          color: failed ? "#b42318" : imsColors.primary,
          flexShrink: 0,
        }}
      >
        {completed ? (
          <CheckCircleIcon sx={{ fontSize: 18 }} />
        ) : (
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>•</Typography>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          border: `1px solid ${imsColors.border}`,
          borderRadius: 2.5,
          bgcolor: completed ? "rgba(238, 248, 232, 0.45)" : "#fff",
          px: 2,
          py: 1.5,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{resolveStepLabel(step, t)}</Typography>
          {completed ? (
            <Typography sx={{ fontSize: 12, color: imsColors.primaryDark, fontWeight: 600 }}>
              {t("completed")}
            </Typography>
          ) : failed ? (
            <Typography sx={{ fontSize: 12, color: "#b42318", fontWeight: 600 }}>
              {t("failed")}
            </Typography>
          ) : null}
        </Stack>

        {safeUrl ? (
          <Box
            component="a"
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              mt: 0.75,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              fontSize: 12,
              fontWeight: 600,
              color: imsColors.primary,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {resolveStepActionLabel(step, t)}
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
}
