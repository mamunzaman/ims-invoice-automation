"use client";

import { Button, CircularProgress, type ButtonProps } from "@mui/material";
import { imsColors } from "@/theme/imsTheme";

export type ImsButtonVariant = "primary" | "secondary" | "ghost" | "danger";

function variantSx(imsVariant: ImsButtonVariant) {
  const base = {
    minHeight: 44,
    borderRadius: "12px",
    fontWeight: 700,
    fontSize: 14,
    px: 2,
    textTransform: "none" as const,
  };

  switch (imsVariant) {
    case "primary":
      return {
        ...base,
        boxShadow: "0 1px 2px rgba(63, 143, 0, 0.18)",
      };
    case "secondary":
      return {
        ...base,
        borderColor: imsColors.border,
        color: imsColors.textDark,
        bgcolor: "#fff",
        boxShadow: "none",
        "&:hover": {
          borderColor: imsColors.primary,
          bgcolor: imsColors.primaryLight,
        },
      };
    case "ghost":
      return {
        ...base,
        boxShadow: "none",
        color: imsColors.primaryDark,
        "&:hover": { bgcolor: imsColors.primaryLight },
      };
    case "danger":
      return {
        ...base,
        boxShadow: "none",
        borderColor: "#fecaca",
        color: "#b42318",
        bgcolor: "#fff",
        "&:hover": {
          borderColor: "#f87171",
          bgcolor: "#fef2f2",
        },
      };
  }
}

function variantProps(imsVariant: ImsButtonVariant): Pick<ButtonProps, "variant" | "color"> {
  switch (imsVariant) {
    case "primary":
      return { variant: "contained", color: "primary" };
    case "secondary":
      return { variant: "outlined", color: "inherit" };
    case "ghost":
      return { variant: "text", color: "primary" };
    case "danger":
      return { variant: "outlined", color: "error" };
  }
}

export interface ImsButtonProps extends ButtonProps {
  imsVariant?: ImsButtonVariant;
  loading?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

export function ImsButton({
  imsVariant = "primary",
  loading = false,
  disabled,
  children,
  sx,
  startIcon,
  ...props
}: ImsButtonProps) {
  const muiVariant = variantProps(imsVariant);

  return (
    <Button
      {...props}
      {...muiVariant}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      sx={[variantSx(imsVariant), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children}
    </Button>
  );
}
