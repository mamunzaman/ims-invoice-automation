"use client";

import Grid from "@mui/material/Grid";
import type { ReactNode } from "react";

interface ImsFormGridProps {
  children: ReactNode;
}

export function ImsFormGrid({ children }: ImsFormGridProps) {
  return (
    <Grid container spacing={2.25}>
      {children}
    </Grid>
  );
}
