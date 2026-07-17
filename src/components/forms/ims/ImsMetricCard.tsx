"use client";

import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { ImsStatusChip, type ImsStatusTone } from "./ImsStatusChip";
import { imsCardSx, imsLabelSx } from "./imsStyles";
import { designTokens } from "@/theme/designTokens";
import { imsColors } from "@/theme/imsTheme";

export type ImsMetricTone = "default" | "primary" | "success";

interface ImsMetricCardProps {
  label: string;
  value: ReactNode;
  tone?: ImsMetricTone;
  size?: "sm" | "md" | "lg";
  hint?: string;
  footer?: ReactNode;
  statusChip?: { label: string; tone: ImsStatusTone };
}

const TONE_BG: Record<ImsMetricTone, string> = {
  default: designTokens.surface.cardSoft,
  primary: imsColors.primaryLight,
  success: imsColors.primaryLight,
};

export function ImsMetricCard({
  label,
  value,
  tone = "default",
  size = "md",
  hint,
  footer,
  statusChip,
}: ImsMetricCardProps) {
  const valueSize = size === "lg" ? 30 : size === "sm" ? 18 : 22;

  return (
    <Box
      sx={{
        ...imsCardSx,
        bgcolor: TONE_BG[tone],
        p: size === "lg" ? 2.25 : 2,
        height: "100%",
      }}
    >
      <Stack spacing={1.25}>
        <Typography sx={imsLabelSx}>{label}</Typography>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: valueSize,
            color: tone === "default" ? imsColors.textDark : imsColors.primary,
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
        {hint ? (
          <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>{hint}</Typography>
        ) : null}
        {statusChip ? (
          <Box sx={{ pt: 0.5 }}>
            <ImsStatusChip tone={statusChip.tone} label={statusChip.label} />
          </Box>
        ) : null}
        {footer ? (
          <Box sx={{ pt: 1, borderTop: `1px solid ${imsColors.border}` }}>{footer}</Box>
        ) : null}
      </Stack>
    </Box>
  );
}
