"use client";

import { Stack, Typography } from "@mui/material";
import { ErrorOutlineOutlinedIcon } from "@/components/icons/muiIcons";

interface FormValidationAlertProps {
  title?: string;
  messages: string[];
}

export function FormValidationAlert({
  title = "Bitte Pflichtfelder prüfen",
  messages,
}: FormValidationAlertProps) {
  if (messages.length === 0) return null;

  return (
    <Stack
      sx={{
        borderRadius: "16px",
        border: "1px solid #fecaca",
        bgcolor: "#fef2f2",
        px: 2,
        py: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
        <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: "#b42318", mt: 0.25 }} />
        <Stack sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#912018", mb: 0.5 }}>
            {title}
          </Typography>
          <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2 }}>
            {messages.map((message) => (
              <Typography
                key={message}
                component="li"
                sx={{ fontSize: 12.5, color: "#b42318", lineHeight: 1.45 }}
              >
                {message}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
