"use client";

import Link from "next/link";
import { Box, Button, CircularProgress, type ButtonProps } from "@mui/material";
import { designTokens } from "@/theme/designTokens";
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
        boxShadow: designTokens.shadow.primaryButton,
        transition: `transform ${designTokens.transition.fast}, box-shadow ${designTokens.transition.fast}`,
        "&:hover:not(:disabled)": {
          transform: "translateY(-1px)",
          boxShadow: designTokens.shadow.primaryButton,
        },
        "&:active:not(:disabled)": {
          transform: "translateY(0)",
        },
      };
    case "secondary":
      return {
        ...base,
        borderColor: designTokens.border.default,
        color: imsColors.textDark,
        bgcolor: designTokens.surface.card,
        boxShadow: designTokens.shadow.soft,
        backdropFilter: designTokens.blur.surface,
        "&:hover": {
          borderColor: imsColors.primary,
          bgcolor: imsColors.primaryLight,
          transform: "translateY(-1px)",
        },
        "&:active": {
          transform: "translateY(0)",
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
  href,
  component,
  ...props
}: ImsButtonProps) {
  const muiVariant = variantProps(imsVariant);
  const isInternalLink =
    typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
  const linkProps = component
    ? { component, href }
    : isInternalLink && href
      ? { component: Link, href }
      : href
        ? { href }
        : {};

  return (
    <Box sx={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <Button
        {...props}
        {...muiVariant}
        {...linkProps}
        disabled={disabled || loading}
        startIcon={startIcon}
        sx={[
          variantSx(imsVariant),
          loading ? { opacity: 0.45 } : null,
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        {children}
      </Button>
      {loading ? (
        <CircularProgress
          size={18}
          sx={{
            position: "absolute",
            inset: 0,
            m: "auto",
            color: imsVariant === "primary" ? imsColors.primaryDark : imsColors.primary,
          }}
        />
      ) : null}
    </Box>
  );
}
