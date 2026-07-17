"use client";

import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { ImsButton } from "./ImsButton";
import { imsCardSx } from "./imsStyles";
import { designTokens } from "@/theme/designTokens";
import { imsColors } from "@/theme/imsTheme";

interface ImsDocumentCardProps {
  icon: ReactNode;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actionLabel: string;
  href?: string | null;
  endIcon?: ReactNode;
  emptyLabel: string;
  isGenerated?: boolean;
  generatedLabel?: string;
}

export function ImsDocumentCard({
  icon,
  iconColor = imsColors.primary,
  title,
  subtitle,
  actionLabel,
  href,
  endIcon,
  emptyLabel,
  isGenerated = false,
  generatedLabel,
}: ImsDocumentCardProps) {
  const showAction = Boolean(href);
  const showGeneratedState = isGenerated && !showAction;

  return (
    <Box
      sx={{
        ...imsCardSx,
        bgcolor: designTokens.surface.cardSoft,
        p: 2,
        height: "100%",
      }}
    >
      <Stack spacing={1.25}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "12px",
            bgcolor: designTokens.surface.input,
            border: `1px solid ${designTokens.border.default}`,
            display: "grid",
            placeItems: "center",
            color: iconColor,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: imsColors.textDark }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 13, color: imsColors.textMuted, lineHeight: 1.45 }}>
            {subtitle}
          </Typography>
        ) : null}
        {showAction ? (
          <ImsButton
            component="a"
            href={href!}
            target="_blank"
            rel="noopener noreferrer"
            imsVariant="secondary"
            endIcon={endIcon}
            sx={{ alignSelf: "flex-start" }}
          >
            {actionLabel}
          </ImsButton>
        ) : showGeneratedState ? (
          <Typography sx={{ fontSize: 13, color: imsColors.primary, fontWeight: 600 }}>
            {generatedLabel || subtitle}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 13, color: imsColors.textMuted, fontStyle: "italic" }}>
            {emptyLabel}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
