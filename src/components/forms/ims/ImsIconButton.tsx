"use client";

import { IconButton, type IconButtonProps } from "@mui/material";
import { imsColors } from "@/theme/imsTheme";

export interface ImsIconButtonProps extends IconButtonProps {
  label: string;
}

export function ImsIconButton({ label, sx, children, ...props }: ImsIconButtonProps) {
  return (
    <IconButton
      aria-label={label}
      size="small"
      sx={{
        width: 36,
        height: 36,
        borderRadius: "10px",
        border: `1px solid ${imsColors.border}`,
        bgcolor: "#fff",
        color: imsColors.textMuted,
        "&:hover": {
          bgcolor: imsColors.primaryLight,
          color: imsColors.primaryDark,
          borderColor: imsColors.border,
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </IconButton>
  );
}
