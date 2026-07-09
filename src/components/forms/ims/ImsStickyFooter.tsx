"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { imsColors } from "@/theme/imsTheme";

interface ImsStickyFooterProps {
  hint?: string;
  children: ReactNode;
}

export function ImsStickyFooter({ hint, children }: ImsStickyFooterProps) {
  return (
    <Box sx={{ position: "sticky", bottom: 12, zIndex: 5, mt: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "14px",
          border: `1px solid ${imsColors.border}`,
          bgcolor: "rgba(252, 253, 251, 0.98)",
          backdropFilter: "blur(8px)",
          px: { xs: 2, md: 2.25 },
          py: { xs: 1.25, md: 1.35 },
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", gap: 1.25 }}
        >
          {hint ? (
            <Typography sx={{ fontSize: 13, color: imsColors.textMuted, lineHeight: 1.4 }}>
              {hint}
            </Typography>
          ) : (
            <Box />
          )}
          <Stack direction="row" spacing={1} sx={{ justifyContent: { xs: "stretch", sm: "flex-end" }, width: { xs: "100%", sm: "auto" } }}>
            {children}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
