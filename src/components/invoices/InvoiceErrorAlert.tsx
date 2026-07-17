"use client";

import { useState } from "react";
import { Collapse, Stack, Typography } from "@mui/material";
import { ErrorOutlineOutlinedIcon, InfoOutlinedIcon } from "@/components/icons/muiIcons";
import { shouldShowTechnicalErrorDetails } from "@/lib/invoice-errors";

interface InvoiceErrorAlertProps {
  title: string;
  messages: string[];
  technicalDetails?: string | null;
  technicalDetailsLabel?: string;
  technicalErrorsDisplay?: import("@/lib/types/database").TechnicalErrorsDisplay | null;
  tone?: "error" | "info";
}

export function InvoiceErrorAlert({
  title,
  messages,
  technicalDetails,
  technicalDetailsLabel = "Technical details",
  technicalErrorsDisplay,
  tone = "error",
}: InvoiceErrorAlertProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const canShowTechnical =
    shouldShowTechnicalErrorDetails(technicalErrorsDisplay) &&
    Boolean(technicalDetails?.trim());

  if (messages.length === 0) return null;

  const isInfo = tone === "info";
  const borderColor = isInfo ? "#bfdbfe" : "#fecaca";
  const backgroundColor = isInfo ? "#eff6ff" : "#fef2f2";
  const titleColor = isInfo ? "#1d4ed8" : "#912018";
  const textColor = isInfo ? "#1e40af" : "#b42318";
  const iconColor = isInfo ? "#2563eb" : "#b42318";
  const Icon = isInfo ? InfoOutlinedIcon : ErrorOutlineOutlinedIcon;

  return (
    <Stack
      sx={{
        borderRadius: "16px",
        border: `1px solid ${borderColor}`,
        bgcolor: backgroundColor,
        px: 2,
        py: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
        <Icon sx={{ fontSize: 18, color: iconColor, mt: 0.25 }} />
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: titleColor, mb: 0.5 }}>
            {title}
          </Typography>
          <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2 }}>
            {messages.map((message) => (
              <Typography
                key={message}
                component="li"
                sx={{ fontSize: 12.5, color: textColor, lineHeight: 1.45 }}
              >
                {message}
              </Typography>
            ))}
          </Stack>
          {canShowTechnical ? (
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              <Typography
                component="button"
                type="button"
                onClick={() => setShowTechnical((open) => !open)}
                sx={{
                  alignSelf: "flex-start",
                  border: 0,
                  bgcolor: "transparent",
                  p: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: textColor,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {technicalDetailsLabel}
              </Typography>
              <Collapse in={showTechnical}>
                <Typography
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1,
                    borderRadius: "10px",
                    bgcolor: "rgba(0,0,0,0.04)",
                    fontSize: 11,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#344054",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {technicalDetails}
                </Typography>
              </Collapse>
            </Stack>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
}
