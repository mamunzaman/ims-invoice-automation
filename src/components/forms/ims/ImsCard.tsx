"use client";

import { Card, CardContent, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import { ImsSectionHeader } from "./ImsSectionHeader";
import { imsCardSx } from "./imsStyles";
import { designTokens } from "@/theme/designTokens";

export type ImsCardVariant = "default" | "muted" | "highlight" | "flat";

const VARIANT_SX: Record<ImsCardVariant, SxProps<Theme>> = {
  default: { bgcolor: designTokens.surface.card },
  muted: {
    bgcolor: designTokens.surface.cardSoft,
    boxShadow: designTokens.shadow.soft,
  },
  highlight: { bgcolor: "rgba(238, 248, 232, 0.65)" },
  flat: {
    boxShadow: "none",
    bgcolor: designTokens.surface.cardSoft,
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
  },
};

interface ImsCardProps {
  id?: string;
  title?: string;
  subtitle?: string;
  step?: number;
  action?: ReactNode;
  variant?: ImsCardVariant;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
  sx?: SxProps<Theme>;
}

const PADDING = {
  sm: { xs: 2, md: 2.25 },
  md: { xs: 2.25, md: 2.75 },
  lg: { xs: 2.5, md: 3 },
} as const;

export function ImsCard({
  id,
  title,
  subtitle,
  step,
  action,
  variant = "default",
  padding = "md",
  children,
  sx,
}: ImsCardProps) {
  const hasHeader = Boolean(title || subtitle || action || step != null);

  return (
    <Card
      id={id}
      sx={[
        imsCardSx,
        VARIANT_SX[variant],
        { scrollMarginTop: "120px" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <CardContent sx={{ p: PADDING[padding], "&:last-child": { pb: PADDING[padding].md } }}>
        {hasHeader ? (
          <ImsSectionHeader
            title={title}
            subtitle={subtitle}
            step={step}
            action={action}
            sx={{ mb: 2.25 }}
          />
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
