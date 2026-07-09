"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { CheckCircleOutlinedIcon } from "@/components/icons/muiIcons";
import { imsColors } from "@/theme/imsTheme";

export const FORM_STEPS = [
  { id: 1, sectionId: "invoice-section-rechnungsdaten" },
  { id: 2, sectionId: "invoice-section-kunde" },
  { id: 3, sectionId: "invoice-section-leistungen" },
  { id: 4, sectionId: "invoice-section-zahlung" },
  { id: 5, sectionId: "invoice-section-pruefung" },
] as const;

const STEP_LABEL_KEYS = [
  "invoiceData",
  "customer",
  "services",
  "payment",
  "review",
] as const;

interface StepIndicatorProps {
  activeStep?: number;
  completedSteps?: number[];
  onStepClick?: (stepId: number, sectionId: string) => void;
}

export function StepIndicator({
  activeStep = 1,
  completedSteps = [],
  onStepClick,
}: StepIndicatorProps) {
  const t = useTranslations("invoice");
  const tAuth = useTranslations("auth");
  const completedSet = new Set(completedSteps);

  return (
    <Box
      sx={{
        border: `1px solid ${imsColors.border}`,
        borderRadius: "14px",
        bgcolor: "#fff",
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.03)",
        overflowX: { xs: "auto", md: "hidden" },
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Stack
        direction="row"
        sx={{
          minWidth: { xs: 520, md: "100%" },
        }}
      >
        {FORM_STEPS.map((step, index) => {
          const isActive = step.id === activeStep;
          const isDone = completedSet.has(step.id) && !isActive;
          const label = t(STEP_LABEL_KEYS[index]);

          return (
            <Box
              key={step.id}
              component="button"
              type="button"
              aria-current={isActive ? "step" : undefined}
              aria-label={tAuth("stepLabel", { step: step.id, label })}
              onClick={() => onStepClick?.(step.id, step.sectionId)}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 0.85,
                px: { xs: 1.35, md: 1.5 },
                py: { xs: 0.95, md: 1 },
                border: "none",
                borderRight: {
                  md: index < FORM_STEPS.length - 1 ? `1px solid ${imsColors.border}` : "none",
                },
                bgcolor: isActive
                  ? imsColors.primaryLight
                  : isDone
                    ? "rgba(238, 248, 232, 0.35)"
                    : "transparent",
                cursor: "pointer",
                textAlign: "left",
                font: "inherit",
                transition: "background-color 0.15s ease",
                "&:hover": {
                  bgcolor: isActive ? imsColors.primaryLight : "rgba(238, 248, 232, 0.55)",
                },
                "&:focus-visible": {
                  outline: `2px solid ${imsColors.primary}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  bgcolor: isActive || isDone ? imsColors.primary : "#fff",
                  color: isActive || isDone ? "#fff" : imsColors.textMuted,
                  border: `1.5px solid ${isActive || isDone ? imsColors.primary : imsColors.border}`,
                }}
              >
                {isDone ? <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} /> : step.id}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: 12.5, md: 12 },
                  fontWeight: isActive ? 700 : isDone ? 600 : 500,
                  color: isActive
                    ? imsColors.primaryDark
                    : isDone
                      ? imsColors.textDark
                      : imsColors.textMuted,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
