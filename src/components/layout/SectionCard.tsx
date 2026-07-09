"use client";

import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { imsCardSx } from "@/components/forms/ims";
import { imsColors } from "@/theme/imsTheme";

interface SectionCardProps {
  id?: string;
  step?: number;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ id, step, title, subtitle, action, children }: SectionCardProps) {
  return (
    <Card
      id={id}
      sx={{
        ...imsCardSx,
        boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
        scrollMarginTop: "120px",
      }}
    >
      <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2.25, gap: 2 }}
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
              <Typography variant="h6" sx={{ fontSize: "1rem", lineHeight: 1.3 }}>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
