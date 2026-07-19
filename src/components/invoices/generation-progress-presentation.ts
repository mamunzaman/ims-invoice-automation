import { keyframes } from "@mui/material/styles";
import type { GenerationStepStatus } from "@/lib/invoice-generation-steps";
import { designTokens } from "@/theme/designTokens";

export type GenerationStepVisualState = "completed" | "running" | "pending" | "failed";

export function resolveGenerationInvoiceContext(
  invoiceNumber?: string | null,
  customerName?: string | null
): { invoiceNumber: string | null; customerName: string | null } {
  const number = invoiceNumber?.trim() || null;
  const customer = customerName?.trim() || null;
  return { invoiceNumber: number, customerName: customer };
}

export function getGenerationStepVisualState(
  status: GenerationStepStatus | string
): GenerationStepVisualState {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized === "completed" || normalized === "success" || normalized === "done") {
    return "completed";
  }
  if (normalized === "running" || normalized === "in_progress" || normalized === "active") {
    return "running";
  }
  return "pending";
}

/** Strict timeline geometry used by the progress modal. */
export const generationTimelineGeometry = {
  markerColumnWidth: 40,
  markerSize: 34,
  columnGap: 14,
  rowMinHeight: 58,
  connectorWidth: 2,
  checkIconSize: 18,
  pendingDotSize: 7,
  spinnerBorderWidth: 3,
  spinnerDurationMs: 800,
} as const;

export const generationTimelineGridTemplate = `${generationTimelineGeometry.markerColumnWidth}px minmax(0, 1fr)`;

export function shouldRenderTimelineConnector(isLastStep: boolean): boolean {
  return !isLastStep;
}

export const generationRunningSpinKeyframes = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

/**
 * CSS-border spinner for the running marker.
 * Never uses determinate CircularProgress — animation is always infinite unless reduced-motion.
 */
export function getRunningSpinnerSx(prefersReducedMotion: boolean) {
  return {
    width: generationTimelineGeometry.markerSize,
    height: generationTimelineGeometry.markerSize,
    borderRadius: "50%",
    borderStyle: "solid",
    borderWidth: generationTimelineGeometry.spinnerBorderWidth,
    borderColor: "rgba(47, 143, 0, 0.18)",
    borderTopColor: designTokens.color.primary,
    flexShrink: 0,
    boxSizing: "border-box" as const,
    animation: prefersReducedMotion
      ? "none"
      : `${generationRunningSpinKeyframes} ${generationTimelineGeometry.spinnerDurationMs}ms linear infinite`,
  };
}

/** Shared opaque overlay paper styles for Dialog / Modal surfaces. */
export const generationModalPaperSx = {
  backgroundColor: `${designTokens.surface.overlay} !important`,
  backgroundImage: "none",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  opacity: 1,
  border: `1px solid ${designTokens.border.overlay}`,
  borderRadius: "24px",
  boxShadow: "0 24px 48px rgba(16, 24, 40, 0.18)",
  maxWidth: 700,
  width: "100%",
  maxHeight: { xs: "92vh", sm: "90vh" },
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
} as const;

export const generationModalBackdropSx = {
  backgroundColor: designTokens.overlay.backdrop,
} as const;

export const generationModalSurface = {
  paper: designTokens.surface.overlay,
  header: designTokens.surface.overlay,
  body: designTokens.surface.overlayMuted,
  footer: designTokens.surface.overlay,
  border: designTokens.border.overlay,
  contextPanel: "#F4F8F1",
  contextBorder: "rgba(90, 120, 80, 0.16)",
  track: "#E8EDE6",
  completed: designTokens.color.primary,
  completedBorder: designTokens.color.primaryDark,
  completedSoft: designTokens.color.primaryLight,
  failed: "#D92D20",
  pending: "#98A2B3",
  pendingLabel: "#475467",
  connectorPending: "#D0D5DD",
  runningAccent: designTokens.color.primary,
} as const;
