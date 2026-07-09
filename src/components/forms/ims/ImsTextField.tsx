"use client";

import { TextField, type TextFieldProps } from "@mui/material";

export function ImsTextField(props: TextFieldProps) {
  return <TextField fullWidth variant="outlined" {...props} />;
}
