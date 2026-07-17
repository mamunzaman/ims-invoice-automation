"use client";

import {
  CheckCircleOutlinedIcon,
  ErrorOutlineOutlinedIcon,
  OpenInNewIcon,
} from "@/components/icons/muiIcons";
import { Box, Stack, Typography } from "@mui/material";
import { ImsCard } from "./ImsCard";
import { ImsStatusChip } from "./ImsStatusChip";
import { imsColors } from "@/theme/imsTheme";

export type ImsTimelineStepStatus = "pending" | "completed" | "failed";

export interface ImsTimelineStep {
  key: string;
  label: string;
  status: ImsTimelineStepStatus;
  timestamp?: string | null;
  href?: string | null;
  linkLabel?: string;
}

export interface ImsTimelineSummary {
  status: "success" | "failed";
  title: string;
  message?: string;
  timestamp?: string | null;
}

interface ImsTimelineProps {
  title?: string;
  steps: ImsTimelineStep[];
  completedLabel?: string;
  failedLabel?: string;
  summary?: ImsTimelineSummary;
  compact?: boolean;
}

export function ImsTimelineItem({
  step,
  completedLabel,
  failedLabel,
  compact = true,
}: {
  step: ImsTimelineStep;
  completedLabel?: string;
  failedLabel?: string;
  compact?: boolean;
}) {
  const completed = step.status === "completed";
  const failed = step.status === "failed";

  const indicator = (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        bgcolor: failed ? "#fee4e2" : completed ? imsColors.primaryLight : "#fff",
        border: `2px solid ${failed ? "#f04438" : completed ? imsColors.primary : imsColors.border}`,
        color: failed ? "#b42318" : imsColors.primary,
      }}
    >
      {completed ? (
        <CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />
      ) : failed ? (
        <ErrorOutlineOutlinedIcon sx={{ fontSize: 16 }} />
      ) : (
        <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: imsColors.border }} />
      )}
    </Box>
  );

  const content = (
    <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 13, color: imsColors.textDark, lineHeight: 1.35 }}>
          {step.label}
        </Typography>
        {completed && completedLabel ? (
          <ImsStatusChip tone="green" label={completedLabel} sx={{ height: 22, fontSize: 11 }} />
        ) : null}
        {failed && failedLabel ? (
          <Typography sx={{ fontSize: 11, color: "#b42318", fontWeight: 600 }}>{failedLabel}</Typography>
        ) : null}
      </Stack>
      {step.timestamp ? (
        <Typography sx={{ fontSize: 11, color: imsColors.textMuted }}>{step.timestamp}</Typography>
      ) : null}
      {step.href && step.linkLabel ? (
        <Box
          component="a"
          href={step.href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: 11,
            fontWeight: 600,
            color: imsColors.primary,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {step.linkLabel}
          <OpenInNewIcon sx={{ fontSize: 13 }} />
        </Box>
      ) : null}
    </Stack>
  );

  if (!compact) {
    return (
      <Stack direction="row" spacing={1.25} sx={{ py: 1, position: "relative", zIndex: 1 }}>
        {indicator}
        <Box
          sx={{
            flex: 1,
            border: `1px solid ${imsColors.border}`,
            borderRadius: "12px",
            bgcolor: completed ? "rgba(238, 248, 232, 0.45)" : "#fff",
            px: 1.75,
            py: 1.25,
          }}
        >
          {content}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.25} sx={{ py: 0.85, position: "relative", zIndex: 1 }}>
      {indicator}
      {content}
    </Stack>
  );
}

function TimelineSummaryCard({ summary }: { summary: ImsTimelineSummary }) {
  const failed = summary.status === "failed";

  return (
    <Box
      sx={{
        borderRadius: "16px",
        border: `1px solid ${failed ? "#fecaca" : imsColors.border}`,
        bgcolor: failed ? "#fef2f2" : imsColors.primaryLight,
        p: 2,
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          bgcolor: "#fff",
          border: `2px solid ${failed ? "#f04438" : imsColors.primary}`,
          display: "grid",
          placeItems: "center",
          mx: "auto",
          mb: 1,
          color: failed ? "#b42318" : imsColors.primary,
        }}
      >
        {failed ? <ErrorOutlineOutlinedIcon /> : <CheckCircleOutlinedIcon />}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: imsColors.textDark }}>
        {summary.title}
      </Typography>
      {summary.message ? (
        <Typography sx={{ fontSize: 12, color: failed ? "#b42318" : imsColors.textMuted, mt: 0.5 }}>
          {summary.message}
        </Typography>
      ) : null}
      {summary.timestamp ? (
        <Typography sx={{ fontSize: 11, color: imsColors.textMuted, mt: 0.5 }}>
          {summary.timestamp}
        </Typography>
      ) : null}
    </Box>
  );
}

export function ImsTimeline({
  title,
  steps,
  completedLabel,
  failedLabel,
  summary,
  compact = true,
}: ImsTimelineProps) {
  return (
    <Stack spacing={1.5}>
      <ImsCard title={title} padding="sm">
        <Stack spacing={0} sx={{ position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              left: 13,
              top: 10,
              bottom: 10,
              width: 2,
              bgcolor: imsColors.primaryLight,
            }}
          />
          {steps.map((step) => (
            <ImsTimelineItem
              key={step.key}
              step={step}
              completedLabel={completedLabel}
              failedLabel={failedLabel}
              compact={compact}
            />
          ))}
        </Stack>
      </ImsCard>
      {summary ? <TimelineSummaryCard summary={summary} /> : null}
    </Stack>
  );
}
