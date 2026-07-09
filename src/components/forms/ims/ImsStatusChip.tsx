"use client";

import { Chip, type ChipProps } from "@mui/material";
import { imsColors } from "@/theme/imsTheme";

export type ImsStatusTone = "green" | "gray" | "amber" | "red" | "neutral";

const TONE_STYLES: Record<ImsStatusTone, { bg: string; color: string; border: string }> = {
  green: { bg: imsColors.primaryLight, color: imsColors.primaryDark, border: imsColors.border },
  gray: { bg: "#f2f4f7", color: imsColors.textMuted, border: "#eaecf0" },
  amber: { bg: "#fffaeb", color: "#b54708", border: "#fedf89" },
  red: { bg: "#fef2f2", color: "#b42318", border: "#fecaca" },
  neutral: { bg: "#f9fafb", color: imsColors.textDark, border: imsColors.border },
};

interface ImsStatusChipProps extends Omit<ChipProps, "color"> {
  tone?: ImsStatusTone;
}

export function ImsStatusChip({ tone = "neutral", label, sx, ...props }: ImsStatusChipProps) {
  const style = TONE_STYLES[tone];

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        fontSize: 12,
        fontWeight: 600,
        bgcolor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        ...sx,
      }}
      {...props}
    />
  );
}
