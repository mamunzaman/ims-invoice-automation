"use client";

import { Stack, Typography } from "@mui/material";
import {
  CheckCircleOutlinedIcon,
  ErrorOutlineOutlinedIcon,
  InfoOutlinedIcon,
} from "@/components/icons/muiIcons";
import { imsColors } from "@/theme/imsTheme";

type ImsAlertTone = "success" | "error" | "info" | "warning";

const TONE_STYLES: Record<
  ImsAlertTone,
  { border: string; bg: string; color: string; icon: typeof InfoOutlinedIcon }
> = {
  success: {
    border: "#abefc6",
    bg: imsColors.primaryLight,
    color: imsColors.primaryDark,
    icon: CheckCircleOutlinedIcon,
  },
  error: {
    border: "#fecaca",
    bg: "#fef2f2",
    color: "#912018",
    icon: ErrorOutlineOutlinedIcon,
  },
  info: {
    border: imsColors.border,
    bg: "#f9fbf8",
    color: imsColors.textDark,
    icon: InfoOutlinedIcon,
  },
  warning: {
    border: "#fedf89",
    bg: "#fffaeb",
    color: "#93370d",
    icon: InfoOutlinedIcon,
  },
};

interface ImsAlertProps {
  tone?: ImsAlertTone;
  title?: string;
  children: React.ReactNode;
}

export function ImsAlert({ tone = "info", title, children }: ImsAlertProps) {
  const style = TONE_STYLES[tone];
  const Icon = style.icon;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: "flex-start",
        borderRadius: "16px",
        border: `1px solid ${style.border}`,
        bgcolor: style.bg,
        px: 2,
        py: 1.5,
      }}
    >
      <Icon sx={{ fontSize: 18, color: style.color, mt: 0.2, flexShrink: 0 }} />
      <Stack sx={{ minWidth: 0 }}>
        {title ? (
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: style.color, mb: 0.35 }}>
            {title}
          </Typography>
        ) : null}
        <Typography
          component="div"
          sx={{ fontSize: 12.5, color: style.color, lineHeight: 1.45 }}
        >
          {children}
        </Typography>
      </Stack>
    </Stack>
  );
}
