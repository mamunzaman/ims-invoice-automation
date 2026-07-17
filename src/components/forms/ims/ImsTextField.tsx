"use client";

import { TextField, type TextFieldProps } from "@mui/material";

const extensionSafeInputSlotProps = {
  autoComplete: "off",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
} as const;

export function ImsTextField({ slotProps, ...props }: TextFieldProps) {
  return (
    <TextField
      fullWidth
      variant="outlined"
      {...props}
      slotProps={{
        ...slotProps,
        htmlInput: {
          ...extensionSafeInputSlotProps,
          ...slotProps?.htmlInput,
        },
      }}
    />
  );
}
