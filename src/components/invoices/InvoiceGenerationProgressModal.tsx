"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  CheckIcon,
  ErrorOutlineOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsButton } from "@/components/forms/ims";
import type { InvoiceGenerationStatusPayload } from "@/app/api/invoices/[id]/generation-status/route";
import {
  isGenerationStatus,
  resolveActiveGenerationStep,
  type GenerationStatus,
} from "@/lib/generation-status";
import { mergeGenerateResults } from "@/lib/invoice-generation-client";
import {
  deriveGenerationSessionPhase,
  isGenerationFailureStatus,
  isProcessingGenerationSession,
  isTerminalGenerationSuccess,
  preserveGenerationSnapshot,
  shouldIgnoreStaleGenerationSession,
  type GenerationSessionPhase,
} from "@/lib/generation-session";
import {
  createCanonicalPendingSteps,
  INVOICE_GENERATION_STEPS,
  mergeGenerationSteps,
  normalizeGenerationResultSteps,
  pickHigherStatus,
  type GenerationStep,
} from "@/lib/invoice-generation-steps";
import {
  generationModalBackdropSx,
  generationModalPaperSx,
  generationModalSurface,
  generationTimelineGeometry,
  generationTimelineGridTemplate,
  getGenerationStepVisualState,
  getRunningSpinnerSx,
  resolveGenerationInvoiceContext,
  shouldRenderTimelineConnector,
} from "@/components/invoices/generation-progress-presentation";
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
  register_saved: "registerSaved",
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

interface InvoiceGenerationProgressModalProps {
  open: boolean;
  sessionKey: string;
  sessionPhase: GenerationSessionPhase;
  invoiceId: string | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  initialStatus?: GenerationStatus | null;
  externalCompletion?: InvoiceGenerationStatusPayload | null;
  onSessionPhaseChange: (phase: GenerationSessionPhase) => void;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function InvoiceGenerationProgressModal({
  open,
  sessionKey,
  sessionPhase,
  invoiceId,
  invoiceNumber,
  customerName,
  initialStatus,
  externalCompletion,
  onSessionPhaseChange,
  onCompleted,
  onFailed,
  onClose,
  onRetry,
}: InvoiceGenerationProgressModalProps) {
  const t = useTranslations("generationProgress");
  const tTimeline = useTranslations("timeline");
  const tInvoiceErrors = useTranslations("invoiceErrors");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", {
    defaultMatches: false,
    noSsr: true,
  });
  const invoiceContext = resolveGenerationInvoiceContext(invoiceNumber, customerName);
  const [snapshot, setSnapshot] = useState<InvoiceGenerationStatusPayload | null>(null);
  const [canonicalSteps, setCanonicalSteps] = useState<GenerationStep[]>(() =>
    applyCoarseStatusToSteps(
      createCanonicalPendingSteps(),
      initialStatus && isGenerationStatus(initialStatus) ? initialStatus : "VALIDATING"
    )
  );
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const snapshotRef = useRef<InvoiceGenerationStatusPayload | null>(null);
  const sessionKeyRef = useRef(sessionKey);
  const sessionPhaseRef = useRef(sessionPhase);
  const terminalHandledRef = useRef(false);
  const onSessionPhaseChangeRef = useRef(onSessionPhaseChange);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    sessionKeyRef.current = sessionKey;
    sessionPhaseRef.current = sessionPhase;
    onSessionPhaseChangeRef.current = onSessionPhaseChange;
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
  });

  useEffect(() => {
    terminalHandledRef.current = false;
    snapshotRef.current = null;
    setSnapshot(null);
    setErrorTitle(null);
    setErrorMessage(null);
    setCanonicalSteps(
      applyCoarseStatusToSteps(
        createCanonicalPendingSteps(),
        initialStatus && isGenerationStatus(initialStatus) ? initialStatus : "VALIDATING"
      )
    );
  }, [sessionKey, initialStatus]);

  function applyPayload(
    data: InvoiceGenerationStatusPayload,
    options?: { preferComplete?: boolean; expectedSessionKey?: string }
  ) {
    const expected = options?.expectedSessionKey ?? sessionKeyRef.current;
    if (shouldIgnoreStaleGenerationSession(sessionKeyRef.current, expected)) {
      return;
    }

    const mergedSnapshot =
      mergeGenerateResults(snapshotRef.current, data, {
        preferSecondForCompletion: options?.preferComplete ?? false,
      }) ?? data;

    const status = isGenerationStatus(mergedSnapshot.generation_status)
      ? mergedSnapshot.generation_status
      : "PENDING";
    const step = resolveActiveGenerationStep(status, mergedSnapshot.generation_step);
    const baseSteps = snapshotRef.current
      ? mergeGenerationSteps(
          createCanonicalPendingSteps(),
          normalizeGenerationResultSteps(snapshotRef.current.steps)
        )
      : createCanonicalPendingSteps();
    const mergedSteps = mergePayloadIntoSteps(baseSteps, mergedSnapshot, step);

    const nextSnapshot: InvoiceGenerationStatusPayload = {
      ...mergedSnapshot,
      steps: mergedSteps.map((s) => ({
        key: s.key,
        label: s.label,
        status: s.status,
        url: s.url ?? undefined,
        completed_at: s.completed_at ?? undefined,
      })),
    };

    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    setCanonicalSteps(mergedSteps);

    if (isGenerationFailureStatus(mergedSnapshot)) {
      if (terminalHandledRef.current && sessionPhaseRef.current === "failed") return;
      terminalHandledRef.current = true;
      const technical = mergedSnapshot.generation_error?.trim() || "UNKNOWN_GENERATION_ERROR";
      const friendly = getFriendlyGenerationErrorContent(technical, tInvoiceErrors);
      setErrorTitle(friendly.title);
      setErrorMessage(friendly.message);
      onSessionPhaseChangeRef.current("failed");
      onFailedRef.current(technical);
      return;
    }

    const nextPhase = deriveGenerationSessionPhase({
      previous: sessionPhaseRef.current === "idle" ? "running" : sessionPhaseRef.current,
      payload: nextSnapshot,
    });

    if (nextPhase !== sessionPhaseRef.current) {
      onSessionPhaseChangeRef.current(nextPhase);
    }

    if (nextPhase === "succeeded") {
      terminalHandledRef.current = true;
      if (process.env.NODE_ENV === "development") {
        console.debug("[generation-modal] terminal success (modal stays open)", {
          generation_status: nextSnapshot.generation_status,
          workflow_status: nextSnapshot.workflow_status,
        });
      }
    }
  }

  useEffect(() => {
    if (!open || !externalCompletion) return;
    if (sessionPhase === "succeeded" || sessionPhase === "failed") return;

    applyPayload(externalCompletion, { preferComplete: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply on external snapshot only
  }, [open, externalCompletion, sessionPhase, sessionKey]);

  useEffect(() => {
    if (!open || !invoiceId) return;
    if (!isProcessingGenerationSession(sessionPhase)) return;

    let cancelled = false;
    const startedAt = Date.now();
    const pollSessionKey = sessionKey;

    async function poll() {
      while (!cancelled && sessionKeyRef.current === pollSessionKey) {
        const phaseNow = sessionPhaseRef.current;
        if (!isProcessingGenerationSession(phaseNow)) {
          return;
        }

        if (Date.now() - startedAt > TIMEOUT_MS) {
          if (shouldIgnoreStaleGenerationSession(sessionKeyRef.current, pollSessionKey)) {
            return;
          }
          const technical = `Generation timed out after ${TIMEOUT_MS / 1000} seconds`;
          const friendly = getFriendlyGenerationErrorContent(technical, tInvoiceErrors, {
            forceCategory: "DOCUMENT_TIMEOUT",
          });
          setErrorTitle(friendly.title);
          setErrorMessage(friendly.message);
          onSessionPhaseChangeRef.current("failed");
          onFailedRef.current(technical);
          return;
        }

        try {
          const response = await fetch(`/api/invoices/${invoiceId}/generation-status`);
          if (shouldIgnoreStaleGenerationSession(sessionKeyRef.current, pollSessionKey)) {
            return;
          }

          if (!response.ok) {
            // Preserve last valid snapshot; keep modal open and retry.
            setSnapshot((current) => preserveGenerationSnapshot(current, current));
            await sleep(POLL_INTERVAL_MS);
            continue;
          }

          const data = (await response.json()) as InvoiceGenerationStatusPayload;
          if (shouldIgnoreStaleGenerationSession(sessionKeyRef.current, pollSessionKey)) {
            return;
          }

          applyPayload(data, { expectedSessionKey: pollSessionKey });

          if (
            isTerminalGenerationSuccess(snapshotRef.current ?? data) ||
            isGenerationFailureStatus(data)
          ) {
            return;
          }
        } catch {
          // Transient network error — keep last snapshot and continue polling.
        }

        await sleep(POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [open, invoiceId, sessionPhase, sessionKey, tInvoiceErrors]);

  const completedCount = canonicalSteps.filter((step) => step.status === "completed").length;
  const runningStep = canonicalSteps.find((step) => step.status === "running");
  const progressPercent =
    sessionPhase === "succeeded"
      ? 100
      : Math.round((completedCount / INVOICE_GENERATION_STEPS.length) * 100);

  const googleUrl = sanitizeExternalUrl(snapshot?.google_doc_url);
  const pdfDownloadHref = invoiceId
    ? toRelativeInvoiceSecureDownloadHref(invoiceId, "pdf")
    : null;
  const docxDownloadHref = invoiceId
    ? toRelativeInvoiceSecureDownloadHref(invoiceId, "docx")
    : null;

  const processing = isProcessingGenerationSession(sessionPhase);
  const uiPhase =
    sessionPhase === "succeeded"
      ? "success"
      : sessionPhase === "failed"
        ? "failed"
        : "running";

  function handleDialogClose(_event: unknown, reason?: string) {
    // Never close from Escape/backdrop; only explicit footer actions.
    if (reason === "backdropClick" || reason === "escapeKeyDown") return;
    if (processing || sessionPhase === "succeeded") return;
    if (sessionPhase === "failed") {
      onClose();
    }
  }

  function handleViewResult() {
    if (!snapshot) return;
    onCompletedRef.current(snapshot);
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
      onClose={handleDialogClose}
      maxWidth={false}
      fullWidth
      slotProps={{
        backdrop: {
          sx: generationModalBackdropSx,
        },
        paper: {
          sx: generationModalPaperSx,
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: generationModalSurface.header,
          px: { xs: 2.5, sm: 3.5 },
          pt: { xs: 2.5, sm: 3.25 },
          pb: { xs: 2.25, sm: 2.75 },
          borderBottom: `1px solid ${generationModalSurface.border}`,
        }}
      >
        <Typography
          component="h2"
          sx={{ fontWeight: 700, fontSize: { xs: 19, sm: 20 }, color: imsColors.textDark, mb: 1.5 }}
        >
          {uiPhase === "success"
            ? t("successTitle")
            : uiPhase === "failed"
              ? errorTitle || t("failedTitle")
              : t("title")}
        </Typography>

        {(uiPhase === "running" || uiPhase === "success") && (
          <Box
            data-testid="generation-context-panel"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "35% 65%" },
              gap: { xs: 1.5, sm: 2 },
              bgcolor: generationModalSurface.contextPanel,
              border: `1px solid ${generationModalSurface.contextBorder}`,
              borderRadius: "12px",
              px: { xs: 1.75, sm: 2 },
              py: { xs: 1.75, sm: 2 },
              mb: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: imsColors.textMuted,
                  mb: 0.5,
                }}
              >
                {t("contextLabelInvoice")}
              </Typography>
              <Typography
                data-testid="generation-context-invoice"
                sx={{
                  fontSize: { xs: 15, sm: 16 },
                  fontWeight: 700,
                  color: imsColors.textDark,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {invoiceContext.invoiceNumber ?? t("contextInvoiceFallback")}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: imsColors.textMuted,
                  mb: 0.5,
                }}
              >
                {t("contextLabelCustomer")}
              </Typography>
              <Typography
                data-testid="generation-context-customer"
                sx={{
                  fontSize: { xs: 15, sm: 16 },
                  fontWeight: 600,
                  color: imsColors.textDark,
                  lineHeight: 1.35,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {invoiceContext.customerName ?? t("contextCustomerFallback")}
              </Typography>
            </Box>
          </Box>
        )}

        <Typography sx={{ fontSize: 14, color: imsColors.textMuted, lineHeight: 1.5 }}>
          {uiPhase === "success"
            ? t("successSubtitle")
            : uiPhase === "failed"
              ? errorMessage || tInvoiceErrors("unknownGenerationError.message")
              : t("subtitle")}
        </Typography>

        {uiPhase === "running" ? (
          <Box sx={{ mt: 1.5 }}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: imsColors.textDark,
                  lineHeight: 1.35,
                  minWidth: 0,
                  pr: 1,
                }}
              >
                {t("currentStep", {
                  step: runningStep ? resolveStepLabel(runningStep) : tTimeline("pending"),
                })}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: imsColors.primaryDark,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t("progress", { percent: progressPercent })}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: generationModalSurface.track,
                "& .MuiLinearProgress-bar": {
                  borderRadius: 99,
                  bgcolor: imsColors.primary,
                  transition: prefersReducedMotion ? "none" : "transform 0.35s ease",
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
          px: { xs: 2.5, sm: 3.25 },
          py: { xs: 2, sm: 2.75 },
          bgcolor: generationModalSurface.body,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Box>
          {canonicalSteps.map((step, index) => {
            const state = getGenerationStepVisualState(step.status);
            const isLast = index === canonicalSteps.length - 1;
            const showConnector = shouldRenderTimelineConnector(isLast);
            const ariaLabel =
              state === "completed"
                ? t("stepCompletedAria")
                : state === "running"
                  ? t("stepRunningAria")
                  : state === "failed"
                    ? t("stepFailedAria")
                    : t("stepPendingAria");
            const halfMarker = generationTimelineGeometry.markerSize / 2;

            return (
              <Box
                key={step.key}
                data-testid={`generation-step-${state}`}
                data-step-state={state}
                sx={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: generationTimelineGridTemplate,
                  columnGap: `${generationTimelineGeometry.columnGap}px`,
                  alignItems: "center",
                  minHeight: generationTimelineGeometry.rowMinHeight,
                  boxSizing: "border-box",
                }}
              >
                {showConnector ? (
                  <Box
                    aria-hidden
                    data-testid="generation-step-connector"
                    sx={{
                      position: "absolute",
                      left: generationTimelineGeometry.markerColumnWidth / 2,
                      transform: "translateX(-50%)",
                      top: `calc(50% + ${halfMarker}px)`,
                      bottom: `calc(-50% + ${halfMarker}px)`,
                      width: generationTimelineGeometry.connectorWidth,
                      bgcolor:
                        state === "completed"
                          ? generationModalSurface.completed
                          : generationModalSurface.connectorPending,
                      zIndex: 0,
                    }}
                  />
                ) : null}

                <Box
                  data-testid="generation-marker-column"
                  sx={{
                    width: generationTimelineGeometry.markerColumnWidth,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    zIndex: 1,
                    alignSelf: "center",
                  }}
                >
                  {state === "running" ? (
                    <Box
                      role="img"
                      aria-label={ariaLabel}
                      data-testid="generation-marker-running"
                      data-spinner="css-keyframes"
                      sx={getRunningSpinnerSx(prefersReducedMotion)}
                    />
                  ) : (
                    <Box
                      role="img"
                      aria-label={ariaLabel}
                      data-testid={`generation-marker-${state}`}
                      sx={{
                        width: generationTimelineGeometry.markerSize,
                        height: generationTimelineGeometry.markerSize,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                        flexShrink: 0,
                        bgcolor:
                          state === "completed"
                            ? generationModalSurface.completed
                            : state === "failed"
                              ? generationModalSurface.failed
                              : generationModalSurface.paper,
                        border:
                          state === "completed"
                            ? `1px solid ${generationModalSurface.completedBorder}`
                            : state === "failed"
                              ? `1px solid ${generationModalSurface.failed}`
                              : `2px solid ${generationModalSurface.pending}`,
                        boxShadow:
                          state === "completed" ? "0 1px 3px rgba(31, 122, 0, 0.28)" : "none",
                      }}
                    >
                      {state === "completed" ? (
                        <CheckIcon
                          sx={{
                            fontSize: generationTimelineGeometry.checkIconSize,
                            color: "#FFFFFF",
                            display: "block",
                          }}
                        />
                      ) : state === "failed" ? (
                        <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: "#FFFFFF" }} />
                      ) : (
                        <Box
                          aria-hidden
                          sx={{
                            width: generationTimelineGeometry.pendingDotSize,
                            height: generationTimelineGeometry.pendingDotSize,
                            borderRadius: "50%",
                            bgcolor: generationModalSurface.pending,
                          }}
                        />
                      )}
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    minWidth: 0,
                    py: 0.5,
                    display: "flex",
                    alignItems: "stretch",
                    gap: 1,
                  }}
                >
                  {state === "running" ? (
                    <Box
                      aria-hidden
                      sx={{
                        width: 3,
                        flexShrink: 0,
                        alignSelf: "stretch",
                        borderRadius: 99,
                        bgcolor: generationModalSurface.runningAccent,
                        my: 0.25,
                      }}
                    />
                  ) : null}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: state === "running" ? 700 : state === "completed" ? 600 : 500,
                        color:
                          state === "failed"
                            ? generationModalSurface.failed
                            : state === "pending"
                              ? generationModalSurface.pendingLabel
                              : imsColors.textDark,
                        lineHeight: 1.35,
                      }}
                    >
                      {resolveStepLabel(step)}
                    </Typography>
                    {state === "running" ? (
                      <Typography
                        sx={{
                          mt: 0.25,
                          fontSize: 12,
                          fontWeight: 600,
                          color: imsColors.primaryDark,
                        }}
                      >
                        {t("inProgress")}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {uiPhase === "success" || uiPhase === "failed" ? (
        <Box
          sx={{
            flexShrink: 0,
            px: { xs: 2.5, sm: 3.5 },
            py: 2,
            borderTop: `1px solid ${generationModalSurface.border}`,
            bgcolor: generationModalSurface.footer,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
            {uiPhase === "success" ? (
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
                <ImsButton onClick={handleViewResult}>{t("viewResult")}</ImsButton>
              </>
            ) : null}

            {uiPhase === "failed" ? (
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

export type { GenerationSessionPhase };
