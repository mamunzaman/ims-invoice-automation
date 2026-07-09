"use client";

import { Box, Checkbox, Stack, Typography } from "@mui/material";
import { imsColors } from "@/theme/imsTheme";

interface ImsCheckboxCardProps {
  id: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  disabled?: boolean;
}

export function ImsCheckboxCard({
  id,
  name,
  checked,
  onChange,
  title,
  description,
  disabled,
}: ImsCheckboxCardProps) {
  return (
    <Box
      component="label"
      htmlFor={id}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        p: 2,
        borderRadius: "12px",
        border: `1px solid ${checked ? imsColors.primary : imsColors.border}`,
        bgcolor: checked ? imsColors.primaryLight : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
      }}
    >
      <Checkbox
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        sx={{ p: 0, mt: 0.15 }}
      />
      <Stack spacing={0.35} sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: imsColors.textDark, lineHeight: 1.35 }}>
          {title}
        </Typography>
        {description ? (
          <Typography sx={{ fontSize: 12.5, color: imsColors.textMuted, lineHeight: 1.45 }}>
            {description}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
