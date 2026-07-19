import type { Invoice } from "@/lib/types/database";
import {
  createCanonicalPendingSteps,
  generationStepToResultStep,
  inferCompletedStepsFromUrls,
  mergeGenerationSteps,
  normalizeGenerationResultSteps,
} from "@/lib/invoice-generation-steps";

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

/** Initial DB-safe values for invoices that have not started generation. */
export const INITIAL_INVOICE_GENERATION_STATE = {
  generation_status: "PENDING",
  generation_step: "PENDING",
  generation_error: null,
} as const satisfies {
  generation_status: GenerationStatus;
  generation_step: GenerationStatus;
  generation_error: null;
};

/** In-flight generation: business status stays draft until documents exist. */
export const INVOICE_GENERATION_START_STATE = {
  generation_status: "VALIDATING",
  generation_step: "VALIDATING",
  generation_error: null,
  workflow_status: "processing",
} as const;

export const INVOICE_GENERATION_FAILED_STATE = {
  status: "draft" as const,
  workflow_status: "failed",
  generation_status: "FAILED" as const,
  generation_step: "VALIDATING" as const,
  google_doc_id: null,
  google_doc_url: null,
  pdf_file_id: null,
  pdf_url: null,
  generated_at: null,
};

export interface GenerationResultStep {
  key: string;
  label: string;
  status: string;
  url?: string;
  completed_at?: string | null;
}

export const DEFAULT_GENERATION_STEP_KEYS = [
  "received",
  "validated",
  "copy_template",
  "replace_placeholders",
  "google_doc_created",
  "export_pdf",
  "export_docx",
  "dropbox_folders",
  "dropbox_pdf",
  "dropbox_docx",
  "register_saved",
  "invoice_saved",
] as const;

export const DEFAULT_COMPLETED_GENERATION_STEPS: GenerationResultStep[] = [
  { key: "received", label: "Invoice data received", status: "completed" },
  { key: "validated", label: "Data validated", status: "completed" },
  { key: "copy_template", label: "Google Docs template copied", status: "completed" },
  { key: "replace_placeholders", label: "Placeholders replaced", status: "completed" },
  { key: "google_doc_created", label: "Google Docs invoice created", status: "completed" },
  { key: "export_pdf", label: "PDF exported", status: "completed" },
  { key: "export_docx", label: "DOCX exported", status: "completed" },
  { key: "dropbox_folders", label: "Dropbox archive folders prepared", status: "completed" },
  { key: "dropbox_pdf", label: "PDF archived in Dropbox", status: "completed" },
  { key: "dropbox_docx", label: "DOCX archived in Dropbox", status: "completed" },
  { key: "register_saved", label: "Yearly invoice register saved", status: "completed" },
  { key: "invoice_saved", label: "Invoice status saved", status: "completed" },
];

export function buildDefaultCompletedSteps(urls?: {
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
  docxUrl?: string | null;
  dropboxPdfUrl?: string | null;
  dropboxDocxUrl?: string | null;
}): GenerationResultStep[] {
  return inferCompletedStepsFromUrls(urls ?? {}).map(generationStepToResultStep);
}

export function resolveGenerationSteps(
  steps: GenerationResultStep[] | null | undefined,
  urls?: {
    googleDocUrl?: string | null;
    pdfUrl?: string | null;
    docxUrl?: string | null;
    dropboxPdfUrl?: string | null;
    dropboxDocxUrl?: string | null;
  }
): GenerationResultStep[] {
  const incoming = normalizeGenerationResultSteps(steps);
  let merged = mergeGenerationSteps(createCanonicalPendingSteps(), incoming);

  if (!steps?.length && urls) {
    const hasArchiveUrl =
      urls.dropboxPdfUrl ||
      urls.dropboxDocxUrl ||
      urls.pdfUrl ||
      urls.docxUrl ||
      urls.googleDocUrl;
    if (hasArchiveUrl) {
      merged = mergeGenerationSteps(merged, inferCompletedStepsFromUrls(urls));
    }
  }

  return merged.map(generationStepToResultStep);
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
  UPLOADING_PDF: "Dokumente werden in Dropbox archiviert",
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

const TERMINAL_GENERATION_STATUSES = new Set<GenerationStatus>([
  "PENDING",
  "FAILED",
  "COMPLETED",
]);

export function isGenerationActive(
  workflowStatus: string | null | undefined,
  generationStatus: string | null | undefined
): boolean {
  if (workflowStatus === "processing") {
    return true;
  }

  if (!generationStatus || !isGenerationStatus(generationStatus)) {
    return false;
  }

  return !TERMINAL_GENERATION_STATUSES.has(generationStatus);
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
