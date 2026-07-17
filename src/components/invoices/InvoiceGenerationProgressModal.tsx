"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
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
  isGenerationStatus,
  resolveActiveGenerationStep,
  type GenerationStatus,
} from "@/lib/generation-status";
import {
  isGenerationStatusComplete,
  mergeGenerateResults,
} from "@/lib/invoice-generation-client";
import {
  createCanonicalPendingSteps,
  INVOICE_GENERATION_STEPS,
  mergeGenerationSteps,
  normalizeGenerationResultSteps,
  pickHigherStatus,
  type GenerationStep,
} from "@/lib/invoice-generation-steps";
import { sanitizeExternalUrl, toRelativeInvoiceSecureDownloadHref } from "@/lib/urls";
import { imsColors } from "@/theme/imsTheme";
import { useTranslations } from "next-intl";
import { getFriendlyGenerationErrorContent } from "@/lib/invoice-errors";

const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 90_000;

const CANONICAL_STEP_LABEL_KEYS: Record<string, string> = {
  received: "received",
  validated: "validated",
  copy_template: "copyTemplate",
  replace_placeholders: "replacePlaceholders",
  google_doc_created: "googleDocCreated",
  export_pdf: "exportPdf",
  export_docx: "exportDocx",
  dropbox_folders: "dropboxFolders",
  dropbox_pdf: "dropboxPdf",
  dropbox_docx: "dropboxDocx",
  invoice_saved: "invoiceSaved",
};

const COARSE_STATUS_TO_STEP_KEY: Partial<Record<GenerationStatus, string>> = {
  PENDING: "received",
  VALIDATING: "validated",
  COPYING_TEMPLATE: "copy_template",
  REPLACING_PLACEHOLDERS: "replace_placeholders",
  EXPORTING_PDF: "export_pdf",
  UPLOADING_PDF: "export_docx",
  COMPLETED: "invoice_saved",
};

export type GenerationProgressPhase = "running" | "success" | "failed";

interface InvoiceGenerationProgressModalProps {
  open: boolean;
  invoiceId: string | null;
  initialStatus?: GenerationStatus | null;
  externalCompletion?: InvoiceGenerationStatusPayload | null;
  onCompleted: (result: InvoiceGenerationStatusPayload) => void;
  onFailed: (error: string) => void;
  onClose: () => void;
  onRetry?: () => void;
}

function applyCoarseStatusToSteps(
  steps: GenerationStep[],
  status: GenerationStatus
): GenerationStep[] {
  const targetKey = COARSE_STATUS_TO_STEP_KEY[status];
  if (!targetKey) return steps;

  const targetIndex = INVOICE_GENERATION_STEPS.findIndex((step) => step.key === targetKey);
  if (targetIndex < 0) return steps;

  return steps.map((step, index) => {
    if (index < targetIndex) {
      return { ...step, status: pickHigherStatus(step.status, "completed") };
    }
    if (index === targetIndex && status !== "COMPLETED") {
      return { ...step, status: pickHigherStatus(step.status, "running") };
    }
    if (status === "COMPLETED") {
      return { ...step, status: pickHigherStatus(step.status, "completed") };
    }
    return step;
  });
}

function mergePayloadIntoSteps(
  currentSteps: GenerationStep[],
  payload: InvoiceGenerationStatusPayload,
  coarseStatus?: GenerationStatus
): GenerationStep[] {
  const incoming = normalizeGenerationResultSteps(payload.steps);
  let merged = mergeGenerationSteps(currentSteps, incoming);
  if (!incoming.length && coarseStatus) {
    merged = applyCoarseStatusToSteps(merged, coarseStatus);
  }
  return merged;
}

function isExternalCompletionReady(payload: InvoiceGenerationStatusPayload): boolean {
  return (
    payload.generation_status === "COMPLETED" ||
    payload.workflow_status === "completed" ||
    isGenerationStatusComplete(payload)
  );
}

function completeGeneration(
  data: InvoiceGenerationStatusPayload,
  completedRef: MutableRefObject<boolean>,
  setSnapshot: (value: InvoiceGenerationStatusPayload) => void,
  setCanonicalSteps: (value: GenerationStep[]) => void,
  setPhase: (value: GenerationProgressPhase) => void,
  onCompleted: (result: InvoiceGenerationStatusPayload) => void,
  autoNavigateTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  snapshotRef?: MutableRefObject<InvoiceGenerationStatusPayload | null>
) {
  if (completedRef.current) return;
  completedRef.current = true;

  const finalized =
    mergeGenerateResults(null, data, { preferSecondForCompletion: true }) ?? data;
  const finalizedSteps = normalizeGenerationResultSteps(finalized.steps);

  setSnapshot(finalized);
  if (snapshotRef) snapshotRef.current = finalized;
  setCanonicalSteps(
    mergeGenerationSteps(createCanonicalPendingSteps(), finalizedSteps)
  );
  setPhase("success");

  if (process.env.NODE_ENV === "development") {
    console.debug("[generation-modal] completed", {
      generation_status: finalized.generation_status,
      workflow_status: finalized.workflow_status,
      pdf_url: finalized.pdf_url,
      docx_url: finalized.docx_url,
    });
  }

  autoNavigateTimer.current = setTimeout(() => {
    onCompleted(finalized);
  }, 1000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function InvoiceGenerationProgressModal({
  open,
  invoiceId,
  initialStatus,
  externalCompletion,
  onCompleted,
  onFailed,
  onClose,
  onRetry,
}: InvoiceGenerationProgressModalProps) {
  const t = useTranslations("generationProgress");
  const tTimeline = useTranslations("timeline");
  const tInvoiceErrors = useTranslations("invoiceErrors");
  const [phase, setPhase] = useState<GenerationProgressPhase>("running");
  const [snapshot, setSnapshot] = useState<InvoiceGenerationStatusPayload | null>(null);
  const [canonicalSteps, setCanonicalSteps] = useState<GenerationStep[]>(() =>
    applyCoarseStatusToSteps(
      createCanonicalPendingSteps(),
      initialStatus && isGenerationStatus(initialStatus) ? initialStatus : "VALIDATING"
    )
  );
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const completedRef = useRef(false);
  const snapshotRef = useRef<InvoiceGenerationStatusPayload | null>(null);
  const autoNavigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  });

  useEffect(() => {
    if (!open || !externalCompletion || completedRef.current) return;
    if (!isExternalCompletionReady(externalCompletion)) return;

    if (process.env.NODE_ENV === "development") {
      console.debug("[generation-modal] external completion received", {
        generation_status: externalCompletion.generation_status,
        workflow_status: externalCompletion.workflow_status,
        pdf_url: externalCompletion.pdf_url,
        docx_url: externalCompletion.docx_url,
      });
    }

    completeGeneration(
      externalCompletion,
      completedRef,
      setSnapshot,
      setCanonicalSteps,
      setPhase,
      (data) => onCompletedRef.current(data),
      autoNavigateTimer,
      snapshotRef
    );
  }, [open, externalCompletion]);

  useEffect(() => {
    if (!open || !invoiceId || phase !== "running") return;

    let cancelled = false;
    const startedAt = Date.now();
    const autoNavigateTimerRef = autoNavigateTimer;

    async function poll() {
      while (!cancelled && !completedRef.current) {
        if (Date.now() - startedAt > TIMEOUT_MS) {
          const technical = `Generation timed out after ${TIMEOUT_MS / 1000} seconds`;
          const friendly = getFriendlyGenerationErrorContent(technical, tInvoiceErrors, {
            forceCategory: "DOCUMENT_TIMEOUT",
          });
          setPhase("failed");
          setErrorTitle(friendly.title);
          setErrorMessage(friendly.message);
          onFailedRef.current(technical);
          return;
        }

        try {
          const response = await fetch(`/api/invoices/${invoiceId}/generation-status`);
          if (!response.ok) {
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

          const data = (await response.json()) as InvoiceGenerationStatusPayload;
          if (completedRef.current) return;

          const mergedSnapshot =
            mergeGenerateResults(snapshotRef.current, data) ?? data;
          const status = isGenerationStatus(mergedSnapshot.generation_status)
            ? mergedSnapshot.generation_status
            : "PENDING";
          const step = resolveActiveGenerationStep(status, mergedSnapshot.generation_step);

          snapshotRef.current = mergedSnapshot;
          setSnapshot(mergedSnapshot);
          setCanonicalSteps((current) =>
            mergePayloadIntoSteps(current, mergedSnapshot, step)
          );

          if (isGenerationStatusComplete(mergedSnapshot)) {
            completeGeneration(
              { ...mergedSnapshot, generation_status: "COMPLETED", generation_step: "COMPLETED" },
              completedRef,
              setSnapshot,
              setCanonicalSteps,
              setPhase,
              (result) => onCompletedRef.current(result),
              autoNavigateTimer,
              snapshotRef
            );
            return;
          }

          if (status === "FAILED") {
            completedRef.current = true;
            const technical = mergedSnapshot.generation_error?.trim() || "UNKNOWN_GENERATION_ERROR";
            const friendly = getFriendlyGenerationErrorContent(technical, tInvoiceErrors);
            setPhase("failed");
            setErrorTitle(friendly.title);
            setErrorMessage(friendly.message);
            onFailedRef.current(technical);
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
      const timer = autoNavigateTimerRef.current;
      if (timer) {
        clearTimeout(timer);
        autoNavigateTimerRef.current = null;
      }
    };
  }, [open, invoiceId, phase, tInvoiceErrors]);

  const completedCount = canonicalSteps.filter((step) => step.status === "completed").length;
  const runningStep = canonicalSteps.find((step) => step.status === "running");
  const progressPercent =
    phase === "success"
      ? 100
      : Math.round((completedCount / INVOICE_GENERATION_STEPS.length) * 100);

  const googleUrl = sanitizeExternalUrl(snapshot?.google_doc_url);
  const pdfDownloadHref = invoiceId
    ? toRelativeInvoiceSecureDownloadHref(invoiceId, "pdf")
    : null;
  const docxDownloadHref = invoiceId
    ? toRelativeInvoiceSecureDownloadHref(invoiceId, "docx")
    : null;

  function handleClose() {
    if (phase === "running") return;
    if (phase === "success" && snapshot) {
      onCompletedRef.current(snapshot);
      return;
    }
    onClose();
  }

  function resolveStepLabel(step: GenerationStep) {
    const labelKey = CANONICAL_STEP_LABEL_KEYS[step.key];
    return labelKey
      ? tTimeline(labelKey as Parameters<typeof tTimeline>[0])
      : step.label;
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
            maxHeight: { xs: "92vh", sm: "90vh" },
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          background: `linear-gradient(180deg, ${imsColors.primaryLight} 0%, #fff 55%)`,
          px: { xs: 2.5, sm: 3 },
          pt: 3,
          pb: 2.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 20, color: imsColors.textDark, mb: 0.5 }}>
          {phase === "success"
            ? t("successTitle")
            : phase === "failed"
              ? errorTitle || t("failedTitle")
              : t("title")}
        </Typography>
        <Typography sx={{ fontSize: 14, color: imsColors.textMuted, lineHeight: 1.5 }}>
          {phase === "success"
            ? t("successSubtitle")
            : phase === "failed"
              ? errorMessage || tInvoiceErrors("unknownGenerationError.message")
              : t("subtitle")}
        </Typography>

        {phase === "running" ? (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
              <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>
                {t("currentStep", {
                  step: runningStep
                    ? resolveStepLabel(runningStep)
                    : tTimeline("pending"),
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

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: { xs: 2.5, sm: 3 },
          py: 2.5,
          WebkitOverflowScrolling: "touch",
        }}
      >
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
          {canonicalSteps.map((step) => {
            const state =
              step.status === "failed"
                ? "failed"
                : step.status === "completed"
                  ? "completed"
                  : step.status === "running"
                    ? "active"
                    : "upcoming";

            return (
              <Stack
                key={step.key}
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
                    {resolveStepLabel(step)}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      {phase === "success" || phase === "failed" ? (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2.5, sm: 3 },
            py: 2,
            borderTop: `1px solid ${imsColors.border}`,
            bgcolor: "#fff",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
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
                {pdfDownloadHref ? (
                  <ImsButton
                    component="a"
                    href={pdfDownloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    imsVariant="secondary"
                  >
                    {t("downloadPdf")}
                  </ImsButton>
                ) : null}
                {docxDownloadHref ? (
                  <ImsButton
                    component="a"
                    href={docxDownloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    imsVariant="secondary"
                  >
                    {t("downloadDocx")}
                  </ImsButton>
                ) : null}
                <ImsButton onClick={() => snapshot && onCompletedRef.current(snapshot)}>
                  {t("viewResult")}
                </ImsButton>
              </>
            ) : null}

            {phase === "failed" ? (
              <>
                {onRetry ? (
                  <ImsButton onClick={onRetry}>{t("retryDocumentGeneration")}</ImsButton>
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
      ) : null}
    </Dialog>
  );
}
