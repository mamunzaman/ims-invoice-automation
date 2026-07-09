"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { imsStickyColumnSx } from "@/components/forms/ims/imsStyles";

interface FormSplitLayoutProps {
  form: ReactNode;
  preview: ReactNode;
}

export function FormSplitLayout({ form, preview }: FormSplitLayoutProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" },
        gap: { xs: 2.5, lg: 3 },
        alignItems: "start",
      }}
    >
      <Box sx={{ minWidth: 0 }}>{form}</Box>
      <Box sx={{ ...imsStickyColumnSx, minWidth: 0 }}>{preview}</Box>
    </Box>
  );
}
