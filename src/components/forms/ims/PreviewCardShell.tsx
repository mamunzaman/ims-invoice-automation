"use client";

import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { imsColors } from "@/theme/imsTheme";
import { imsCardSx } from "@/components/forms/ims/imsStyles";

interface PreviewCardShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function PreviewCardShell({ title, subtitle, children }: PreviewCardShellProps) {
  return (
    <Card sx={{ ...imsCardSx, boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)" }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={0.35} sx={{ mb: 1.75, userSelect: "none" }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 15,
              color: imsColors.textDark,
              lineHeight: 1.3,
              userSelect: "none",
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              sx={{
                fontSize: 12.5,
                color: imsColors.textMuted,
                lineHeight: 1.45,
                userSelect: "none",
              }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
