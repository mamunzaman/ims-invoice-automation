import type { InvoiceGenerationStatusPayload } from "@/app/api/invoices/[id]/generation-status/route";
import {
  normalizeStepKey,
  normalizeStepStatus,
  type GenerationStep,
} from "@/lib/invoice-generation-steps";
import type { GenerationResultStep } from "@/lib/generation-status";

export const GENERATION_SESSION_PHASES = [
  "idle",
  "running",
  "finalizing",
  "succeeded",
  "failed",
] as const;

export type GenerationSessionPhase = (typeof GENERATION_SESSION_PHASES)[number];

export const REQUIRED_TERMINAL_STEP_KEYS = ["register_saved", "invoice_saved"] as const;

type StepLike = Pick<GenerationStep, "key" | "status"> | Pick<GenerationResultStep, "key" | "status">;

export function isGenerationSessionVisible(phase: GenerationSessionPhase): boolean {
  return phase !== "idle";
}

export function canDismissGenerationSession(phase: GenerationSessionPhase): boolean {
  return phase === "succeeded" || phase === "failed";
}

export function isProcessingGenerationSession(phase: GenerationSessionPhase): boolean {
  return phase === "running" || phase === "finalizing";
}

export function areRequiredFinalStepsCompleted(
  steps: StepLike[] | null | undefined
): boolean {
  if (!steps?.length) return false;

  const byKey = new Map(
    steps.map((step) => [normalizeStepKey(step.key), normalizeStepStatus(String(step.status))])
  );

  return REQUIRED_TERMINAL_STEP_KEYS.every((key) => byKey.get(key) === "completed");
}

export function isTerminalGenerationSuccess(
  payload: Pick<
    InvoiceGenerationStatusPayload,
    "workflow_status" | "generation_status" | "steps"
  >
): boolean {
  return (
    payload.workflow_status === "completed" &&
    payload.generation_status === "COMPLETED" &&
    areRequiredFinalStepsCompleted(payload.steps)
  );
}

export function isGenerationFailureStatus(
  payload: Pick<InvoiceGenerationStatusPayload, "generation_status">
): boolean {
  return payload.generation_status === "FAILED";
}

/**
 * Derive the next session phase from a status payload without auto-closing.
 * Terminal success requires workflow + generation COMPLETED and final steps.
 */
export function deriveGenerationSessionPhase(args: {
  previous: GenerationSessionPhase;
  payload: Pick<
    InvoiceGenerationStatusPayload,
    "workflow_status" | "generation_status" | "steps"
  >;
}): GenerationSessionPhase {
  const { previous, payload } = args;

  if (previous === "idle") {
    return "idle";
  }

  if (isGenerationFailureStatus(payload)) {
    return "failed";
  }

  if (isTerminalGenerationSuccess(payload)) {
    return "succeeded";
  }

  if (
    payload.generation_status === "COMPLETED" ||
    payload.workflow_status === "completed" ||
    previous === "finalizing"
  ) {
    return "finalizing";
  }

  if (previous === "succeeded" || previous === "failed") {
    return previous;
  }

  return "running";
}

export function shouldIgnoreStaleGenerationSession(
  activeSessionKey: string,
  responseSessionKey: string
): boolean {
  return Boolean(activeSessionKey) && activeSessionKey !== responseSessionKey;
}

/** Prefer keeping the last good snapshot when a poll fails transiently. */
export function preserveGenerationSnapshot<T>(
  previous: T | null,
  next: T | null | undefined
): T | null {
  if (next == null) return previous;
  return next;
}
