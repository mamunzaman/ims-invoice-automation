"use client";

import { Box, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { imsColors } from "@/theme/imsTheme";
import { imsLabelSx, imsSectionTitleSx } from "./imsStyles";

interface ImsSectionHeaderProps {
  title?: string;
  subtitle?: string;
  step?: number;
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

export function ImsSectionHeader({ title, subtitle, step, action, sx }: ImsSectionHeaderProps) {
  if (!title && !subtitle && !action && step == null) return null;

  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 2, ...sx }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", minWidth: 0 }}>
        {step != null ? (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: imsColors.primaryLight,
              color: imsColors.primaryDark,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              mt: 0.15,
            }}
          >
            {step}
          </Box>
        ) : null}
        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
          {title ? (
            <Typography sx={imsSectionTitleSx}>{title}</Typography>
          ) : null}
          {subtitle ? (
            <Typography variant="body2" sx={{ lineHeight: 1.45, color: imsColors.textMuted }}>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
      {action}
    </Stack>
  );
}

export function ImsFieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography sx={imsLabelSx} component="span">
      {children}
    </Typography>
  );
}
