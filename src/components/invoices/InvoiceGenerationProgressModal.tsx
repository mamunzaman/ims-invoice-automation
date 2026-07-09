"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlinedIcon,
  ErrorOutlineOutlinedIcon,
  RadioButtonUncheckedOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsButton } from "@/components/forms/ims";
import type { InvoiceGenerationStatusPayload } from "@/app/api/invoices/[id]/generation-status/route";
import {
  generationProgressSteps,
  isGenerationStatus,
  resolveActiveGenerationStep,
  type GenerationStatus,
} from "@/lib/generation-status";
import { sanitizeExternalUrl } from "@/lib/urls";
import { imsColors } from "@/theme/imsTheme";
import { useTranslations } from "next-intl";

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 90_000;

const STEP_STATUSES: GenerationStatus[] = [
  "PENDING",
  "VALIDATING",
  "COPYING_TEMPLATE",
  "REPLACING_PLACEHOLDERS",
  "EXPORTING_PDF",
  "UPLOADING_PDF",
];

const STEP_LABEL_KEYS: Record<GenerationStatus, string> = {
  PENDING: "step_PENDING",
  VALIDATING: "step_VALIDATING",
  COPYING_TEMPLATE: "step_COPYING_TEMPLATE",
  REPLACING_PLACEHOLDERS: "step_REPLACING_PLACEHOLDERS",
  EXPORTING_PDF: "step_EXPORTING_PDF",
  UPLOADING_PDF: "step_UPLOADING_PDF",
  COMPLETED: "step_COMPLETED",
  FAILED: "step_FAILED",
};

export type GenerationProgressPhase = "running" | "success" | "failed";

interface InvoiceGenerationProgressModalProps {
  open: boolean;
  invoiceId: string | null;
  initialStatus?: GenerationStatus | null;
  onCompleted: (result: InvoiceGenerationStatusPayload) => void;
  onFailed: (error: string) => void;
  onClose: () => void;
  onRetry?: () => void;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function InvoiceGenerationProgressModal({
  open,
  invoiceId,
  initialStatus,
  onCompleted,
  onFailed,
  onClose,
  onRetry,
}: InvoiceGenerationProgressModalProps) {
  const t = useTranslations("generationProgress");
  const [phase, setPhase] = useState<GenerationProgressPhase>("running");
  const [snapshot, setSnapshot] = useState<InvoiceGenerationStatusPayload | null>(null);
  const [activeStatus, setActiveStatus] = useState<GenerationStatus>(
    initialStatus && isGenerationStatus(initialStatus) ? initialStatus : "PENDING"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completedRef = useRef(false);
  const autoNavigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !invoiceId || phase !== "running") return;

    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      while (!cancelled && !completedRef.current) {
        if (Date.now() - startedAt > TIMEOUT_MS) {
          setPhase("failed");
          setErrorMessage(t("timeout"));
          onFailed(t("timeout"));
          return;
        }

        try {
          const response = await fetch(`/api/invoices/${invoiceId}/generation-status`);
          if (!response.ok) {
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

          const data = (await response.json()) as InvoiceGenerationStatusPayload;
          setSnapshot(data);

          const status = isGenerationStatus(data.generation_status)
            ? data.generation_status
            : "PENDING";
          const step = resolveActiveGenerationStep(
            status,
            data.generation_step
          );
          setActiveStatus(step);

          if (status === "COMPLETED") {
            completedRef.current = true;
            setPhase("success");
            autoNavigateTimer.current = setTimeout(() => {
              onCompleted(data);
            }, 1000);
            return;
          }

          if (status === "FAILED") {
            completedRef.current = true;
            const message = data.generation_error?.trim() || t("failedDefault");
            setPhase("failed");
            setErrorMessage(message);
            onFailed(message);
            return;
          }
        } catch {
          /* retry on next interval */
        }

        await sleep(POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (autoNavigateTimer.current) {
        clearTimeout(autoNavigateTimer.current);
      }
    };
  }, [open, invoiceId, phase, onCompleted, onFailed, t]);

  const progressSteps = generationProgressSteps(activeStatus, {
    failed: snapshot?.generation_status === "FAILED",
  });
  const completedCount = progressSteps.filter((s) => s.state === "completed").length;
  const progressPercent =
    activeStatus === "COMPLETED"
      ? 100
      : Math.round((completedCount / STEP_STATUSES.length) * 100);

  const googleUrl = sanitizeExternalUrl(snapshot?.google_doc_url);
  const pdfUrl = sanitizeExternalUrl(snapshot?.pdf_url);

  function handleClose() {
    if (phase === "running") return;
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "24px",
            overflow: "hidden",
            border: `1px solid ${imsColors.border}`,
            boxShadow: "0 24px 48px rgba(16, 24, 40, 0.12)",
          },
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(180deg, ${imsColors.primaryLight} 0%, #fff 55%)`,
          px: { xs: 2.5, sm: 3 },
          pt: 3,
          pb: 2.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 20, color: imsColors.textDark, mb: 0.5 }}>
          {phase === "success" ? t("successTitle") : phase === "failed" ? t("failedTitle") : t("title")}
        </Typography>
        <Typography sx={{ fontSize: 14, color: imsColors.textMuted, lineHeight: 1.5 }}>
          {phase === "success"
            ? t("successSubtitle")
            : phase === "failed"
              ? errorMessage || t("failedDefault")
              : t("subtitle")}
        </Typography>

        {phase === "running" ? (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
              <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>
                {t("currentStep", {
                  step: t(STEP_LABEL_KEYS[activeStatus] as Parameters<typeof t>[0]),
                })}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: imsColors.primaryDark }}>
                {t("progress", { percent: progressPercent })}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 6,
                borderRadius: 99,
                bgcolor: "rgba(45, 106, 30, 0.12)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 99,
                  bgcolor: imsColors.primary,
                },
              }}
            />
          </Box>
        ) : null}
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
        <Stack spacing={0} sx={{ position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                left: 15,
                top: 14,
                bottom: 14,
                width: 2,
                bgcolor: imsColors.primaryLight,
              }}
            />
            {progressSteps.map(({ step, state }) => (
              <Stack
                key={step}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "flex-start",
                  py: 1,
                  opacity: state === "upcoming" ? 0.45 : 1,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    bgcolor:
                      state === "completed"
                        ? imsColors.primaryLight
                        : state === "active"
                          ? "#fff"
                          : "#f9fafb",
                    border: `1px solid ${
                      state === "active" ? imsColors.primary : imsColors.border
                    }`,
                    zIndex: 1,
                  }}
                >
                  {state === "completed" ? (
                    <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: imsColors.primary }} />
                  ) : state === "active" ? (
                    <CircularProgress size={16} sx={{ color: imsColors.primary }} />
                  ) : state === "failed" ? (
                    <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: "#d92d20" }} />
                  ) : (
                    <RadioButtonUncheckedOutlinedIcon
                      sx={{ fontSize: 16, color: imsColors.textMuted }}
                    />
                  )}
                </Box>
                <Box sx={{ pt: 0.5, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: state === "active" ? 600 : 500,
                      color:
                        state === "failed"
                          ? "#d92d20"
                          : state === "active"
                            ? imsColors.textDark
                            : imsColors.textMuted,
                    }}
                  >
                    {t(STEP_LABEL_KEYS[step] as Parameters<typeof t>[0])}
                  </Typography>
                </Box>
              </Stack>
            ))}

            {phase === "success" ? (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "flex-start", py: 1, opacity: 1 }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: imsColors.primaryLight,
                    border: `1px solid ${imsColors.border}`,
                    zIndex: 1,
                  }}
                >
                  <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: imsColors.primary }} />
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: imsColors.primaryDark, pt: 0.5 }}>
                  {t("step_COMPLETED")}
                </Typography>
              </Stack>
            ) : null}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.5, flexWrap: "wrap" }}>
          {phase === "success" ? (
            <>
              {googleUrl ? (
                <ImsButton
                  imsVariant="secondary"
                  onClick={() => window.open(googleUrl, "_blank", "noopener,noreferrer")}
                >
                  {t("openGoogleDocs")}
                </ImsButton>
              ) : null}
              {pdfUrl ? (
                <ImsButton
                  imsVariant="secondary"
                  onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                >
                  {t("downloadPdf")}
                </ImsButton>
              ) : null}
              <ImsButton
                onClick={() => snapshot && onCompleted(snapshot)}
              >
                {t("viewResult")}
              </ImsButton>
            </>
          ) : null}

          {phase === "failed" ? (
            <>
              {onRetry ? (
                <ImsButton onClick={onRetry}>{t("retry")}</ImsButton>
              ) : null}
              {invoiceId ? (
                <ImsButton
                  imsVariant="secondary"
                  onClick={() => {
                    window.location.href = `/invoices/${invoiceId}`;
                  }}
                >
                  {t("goToInvoice")}
                </ImsButton>
              ) : null}
              <ImsButton imsVariant="ghost" onClick={onClose}>
                {t("close")}
              </ImsButton>
            </>
          ) : null}
        </Stack>
      </Box>
    </Dialog>
  );
}
