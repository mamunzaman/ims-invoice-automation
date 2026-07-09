import type { Invoice } from "@/lib/types/database";

export const GENERATION_STATUSES = [
  "PENDING",
  "VALIDATING",
  "COPYING_TEMPLATE",
  "REPLACING_PLACEHOLDERS",
  "EXPORTING_PDF",
  "UPLOADING_PDF",
  "COMPLETED",
  "FAILED",
] as const;

export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export interface GenerationResultStep {
  key: string;
  label: string;
  status: string;
  url?: string;
}

export const DEFAULT_COMPLETED_GENERATION_STEPS: GenerationResultStep[] = [
  { key: "received", label: "Rechnungsdaten empfangen", status: "completed" },
  { key: "copy_template", label: "Google Docs Vorlage kopiert", status: "completed" },
  { key: "replace_placeholders", label: "Platzhalter ersetzt", status: "completed" },
  { key: "export_pdf", label: "PDF exportiert", status: "completed" },
  { key: "upload_pdf", label: "PDF gespeichert", status: "completed" },
];

export function buildDefaultCompletedSteps(urls?: {
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
}): GenerationResultStep[] {
  const googleDocUrl = urls?.googleDocUrl ?? null;
  const pdfUrl = urls?.pdfUrl ?? null;

  return DEFAULT_COMPLETED_GENERATION_STEPS.map((step) => {
    if (step.key === "copy_template" && googleDocUrl) {
      return { ...step, url: googleDocUrl };
    }
    if (step.key === "upload_pdf" && pdfUrl) {
      return { ...step, url: pdfUrl };
    }
    return { ...step };
  });
}

export function resolveGenerationSteps(
  steps: GenerationResultStep[] | null | undefined,
  urls?: { googleDocUrl?: string | null; pdfUrl?: string | null }
): GenerationResultStep[] {
  if (steps?.length) {
    return steps;
  }
  return buildDefaultCompletedSteps(urls);
}

export function generationStepActionLabel(step: GenerationResultStep): string {
  const url = step.url?.toLowerCase() ?? "";
  const key = step.key.toLowerCase();

  if (url.includes("drive.google.com") || key.includes("pdf")) {
    return "Ansehen";
  }

  return "Öffnen";
}

export function isCompletedStepStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "completed" || normalized === "success" || normalized === "done";
}

export function isFailedStepStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "failed" || normalized === "error";
}

export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  PENDING: "Warte auf Start",
  VALIDATING: "Rechnungsanfrage wird geprüft",
  COPYING_TEMPLATE: "Google-Docs-Rechnung wird erstellt",
  REPLACING_PLACEHOLDERS: "Rechnungsdetails werden eingetragen",
  EXPORTING_PDF: "PDF wird erstellt",
  UPLOADING_PDF: "PDF wird in Google Drive gespeichert",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
};

const PROGRESS_STATUSES: GenerationStatus[] = [
  "PENDING",
  "VALIDATING",
  "COPYING_TEMPLATE",
  "REPLACING_PLACEHOLDERS",
  "EXPORTING_PDF",
  "UPLOADING_PDF",
];

export function isGenerationStatus(value: string | null | undefined): value is GenerationStatus {
  return GENERATION_STATUSES.includes(value as GenerationStatus);
}

export function resolveGenerationStatus(invoice: Invoice): GenerationStatus | null {
  if (invoice.generation_status && isGenerationStatus(invoice.generation_status)) {
    return invoice.generation_status;
  }

  if (invoice.workflow_status === "completed") return "COMPLETED";
  if (invoice.workflow_status === "failed") return "FAILED";
  if (invoice.workflow_status === "processing") return "VALIDATING";
  if (invoice.status !== "draft") return "PENDING";

  return null;
}

export function resolveActiveGenerationStep(
  status: GenerationStatus,
  generationStep?: string | null
): GenerationStatus {
  if (status === "FAILED" && generationStep && isGenerationStatus(generationStep)) {
    return generationStep;
  }
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "FAILED") return "VALIDATING";
  return status;
}

export function generationStepIndex(step: GenerationStatus): number {
  if (step === "COMPLETED") return PROGRESS_STATUSES.length;
  if (step === "FAILED") return -1;
  const index = PROGRESS_STATUSES.indexOf(step);
  return index >= 0 ? index : 0;
}

export function generationProgressSteps(
  activeStep: GenerationStatus,
  options?: { failed?: boolean }
) {
  const activeIndex = generationStepIndex(activeStep);
  const isFailed = options?.failed === true;

  return PROGRESS_STATUSES.map((step, index) => {
    if (isFailed && index === activeIndex) {
      return { step, state: "failed" as const };
    }
    if (activeStep === "COMPLETED" || index < activeIndex) {
      return { step, state: "completed" as const };
    }
    if (index === activeIndex) {
      return { step, state: "active" as const };
    }
    return { step, state: "upcoming" as const };
  });
}
