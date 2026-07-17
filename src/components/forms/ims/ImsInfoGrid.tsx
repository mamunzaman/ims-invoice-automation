"use client";

import type { ReactNode } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { imsLabelSx, imsValueSx } from "./imsStyles";

export interface ImsInfoItem {
  label: string;
  value: string;
  icon?: ReactNode;
  emphasize?: boolean;
  multiline?: boolean;
}

interface ImsInfoGridProps {
  items: ImsInfoItem[];
  columns?: { xs?: number; sm?: number; md?: number };
  spacing?: number;
}

export function ImsInfoField({
  label,
  value,
  icon,
  emphasize,
  multiline = true,
}: ImsInfoItem) {
  return (
    <Stack spacing={0.6}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        {icon}
        <Typography sx={imsLabelSx}>{label}</Typography>
      </Stack>
      <Typography
        sx={{
          ...imsValueSx,
          fontSize: emphasize ? "0.9375rem" : imsValueSx.fontSize,
          fontWeight: emphasize ? 700 : imsValueSx.fontWeight,
          whiteSpace: multiline ? "pre-line" : "nowrap",
          pl: icon ? 3 : 0,
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export function ImsInfoGrid({ items, columns = { xs: 12, sm: 6, md: 3 }, spacing = 2.5 }: ImsInfoGridProps) {
  return (
    <Grid container spacing={spacing}>
      {items.map((item) => (
        <Grid key={item.label} size={{ xs: columns.xs ?? 12, sm: columns.sm, md: columns.md }}>
          <ImsInfoField {...item} />
        </Grid>
      ))}
    </Grid>
  );
}
