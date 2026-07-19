import type { InvoiceGenerationStatusPayload } from "@/app/api/invoices/[id]/generation-status/route";
import type { GenerationResultStep } from "@/lib/generation-status";
import { pickPreferredDropboxDocumentUrl } from "@/lib/dropbox-documents";
import { normalizeDocumentLink } from "@/lib/urls";

export const INVOICE_GENERATION_STEPS = [
  { key: "received", label: "Invoice data received" },
  { key: "validated", label: "Data validated" },
  { key: "copy_template", label: "Google Docs template copied" },
  { key: "replace_placeholders", label: "Placeholders replaced" },
  { key: "google_doc_created", label: "Google Docs invoice created" },
  { key: "export_pdf", label: "PDF exported" },
  { key: "export_docx", label: "DOCX exported" },
  { key: "dropbox_folders", label: "Dropbox archive folders prepared" },
  { key: "dropbox_pdf", label: "PDF archived in Dropbox" },
  { key: "dropbox_docx", label: "DOCX archived in Dropbox" },
  { key: "register_saved", label: "Yearly invoice register saved" },
  { key: "invoice_saved", label: "Invoice status saved" },
] as const;

export type CanonicalGenerationStepKey = (typeof INVOICE_GENERATION_STEPS)[number]["key"];

export const INVOICE_DETAIL_GENERATION_STEPS = [
  { key: "received", label: "Invoice data received" },
  { key: "validated", label: "Data validated" },
  { key: "copy_template", label: "Google Docs template copied" },
  { key: "replace_placeholders", label: "Placeholders replaced" },
  { key: "google_doc_created", label: "Google Docs invoice created" },
  { key: "export_pdf", label: "PDF exported" },
  { key: "export_docx", label: "DOCX exported" },
  { key: "dropbox_folders", label: "Dropbox archive folders prepared" },
  { key: "save_pdf", label: "PDF archived in Dropbox" },
  { key: "save_docx", label: "DOCX archived in Dropbox" },
  { key: "copy_pdf_all", label: "PDF copied to Alle_Rechnungen" },
  { key: "copy_docx_all", label: "DOCX copied to Alle_Rechnungen" },
  { key: "register_saved", label: "Yearly invoice register saved" },
  { key: "completed", label: "Invoice status saved" },
] as const;

export type DetailGenerationStepKey = (typeof INVOICE_DETAIL_GENERATION_STEPS)[number]["key"];

export const STEP_KEY_ALIASES: Record<string, string> = {
  pdf_drive_upload: "dropbox_pdf",
  docx_drive_upload: "dropbox_docx",
  dropbox_pdf_uploaded: "dropbox_pdf",
  dropbox_docx_uploaded: "dropbox_docx",
  copying_template: "copy_template",
  replacing_placeholders: "replace_placeholders",
  exporting_pdf: "export_pdf",
  exporting_docx: "export_docx",
  completed: "invoice_saved",
  upload_pdf: "dropbox_pdf",
  google_doc: "google_doc_created",
  status_saved: "invoice_saved",
};

export function normalizeStepKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  return STEP_KEY_ALIASES[normalized] ?? normalized;
}

export function normalizeDetailStepKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (normalized === "save_pdf" || normalized === "copy_pdf_all") return normalized;
  if (normalized === "save_docx" || normalized === "copy_docx_all") return normalized;
  if (normalized === "register_saved") return "register_saved";
  if (normalized === "completed") return "completed";

  const canonical = normalizeStepKey(normalized);
  if (canonical === "dropbox_pdf") return "save_pdf";
  if (canonical === "dropbox_docx") return "save_docx";
  if (canonical === "invoice_saved") return "completed";
  if (canonical === "register_saved") return "register_saved";
  return canonical;
}

export type GenerationStepStatus = "pending" | "running" | "completed" | "failed";

export type GenerationStep = {
  key: string;
  label: string;
  status: GenerationStepStatus;
  url?: string | null;
  completed_at?: string | null;
};

export const STATUS_PRIORITY = {
  pending: 0,
  running: 1,
  completed: 2,
  failed: 3,
} as const;

export function normalizeStepStatus(status: string): GenerationStepStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized === "completed" || normalized === "success" || normalized === "done") {
    return "completed";
  }
  if (normalized === "running" || normalized === "in_progress" || normalized === "active") {
    return "running";
  }
  return "pending";
}

export function pickHigherStatus(
  a: GenerationStepStatus,
  b: GenerationStepStatus
): GenerationStepStatus {
  return STATUS_PRIORITY[a] >= STATUS_PRIORITY[b] ? a : b;
}

export function resultStepToGenerationStep(step: GenerationResultStep): GenerationStep {
  const extended = step as GenerationResultStep & { completed_at?: string | null };
  return {
    key: normalizeStepKey(step.key),
    label: step.label,
    status: normalizeStepStatus(step.status),
    url: step.url ?? null,
    completed_at: extended.completed_at ?? null,
  };
}

export function generationStepToResultStep(step: GenerationStep): GenerationResultStep {
  const result: GenerationResultStep & { completed_at?: string | null } = {
    key: step.key,
    label: step.label,
    status: step.status,
  };
  if (step.url) result.url = step.url;
  if (step.completed_at) result.completed_at = step.completed_at;
  return result;
}

export function createCanonicalPendingSteps(): GenerationStep[] {
  return INVOICE_GENERATION_STEPS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    status: "pending" as const,
    url: null,
    completed_at: null,
  }));
}

export function mergeGenerationSteps(
  currentSteps: GenerationStep[],
  incomingSteps: GenerationStep[]
): GenerationStep[] {
  const currentMap = new Map(
    currentSteps.map((step) => [normalizeStepKey(step.key), step])
  );

  const incomingMap = new Map(
    incomingSteps.map((step) => [
      normalizeStepKey(step.key),
      {
        ...step,
        key: normalizeStepKey(step.key),
      },
    ])
  );

  return INVOICE_GENERATION_STEPS.map((definition) => {
    const current = currentMap.get(definition.key);
    const incoming = incomingMap.get(definition.key);

    const status =
      incoming && current
        ? pickHigherStatus(incoming.status, current.status)
        : incoming?.status || current?.status || "pending";

    return {
      key: definition.key,
      label: incoming?.label || current?.label || definition.label,
      status,
      url: incoming?.url ?? current?.url ?? null,
      completed_at: incoming?.completed_at ?? current?.completed_at ?? null,
    };
  });
}

export function normalizeGenerationResultSteps(
  steps: GenerationResultStep[] | null | undefined
): GenerationStep[] {
  if (!steps?.length) return [];
  return steps.map(resultStepToGenerationStep);
}

export function normalizeDetailGenerationResultSteps(
  steps: GenerationResultStep[] | null | undefined
): GenerationStep[] {
  if (!steps?.length) return [];
  return steps.map((step) => {
    const extended = step as GenerationResultStep & { completed_at?: string | null };
    return {
      key: normalizeDetailStepKey(step.key),
      label: step.label,
      status: normalizeStepStatus(step.status),
      url: step.url ?? null,
      completed_at: extended.completed_at ?? null,
    };
  });
}

export function createDetailPendingSteps(): GenerationStep[] {
  return INVOICE_DETAIL_GENERATION_STEPS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    status: "pending" as const,
    url: null,
    completed_at: null,
  }));
}

export function mergeDetailGenerationSteps(
  currentSteps: GenerationStep[],
  incomingSteps: GenerationStep[]
): GenerationStep[] {
  const currentMap = new Map(
    currentSteps.map((step) => [normalizeDetailStepKey(step.key), step])
  );

  const incomingMap = new Map(
    incomingSteps.map((step) => [
      normalizeDetailStepKey(step.key),
      {
        ...step,
        key: normalizeDetailStepKey(step.key),
      },
    ])
  );

  return INVOICE_DETAIL_GENERATION_STEPS.map((definition) => {
    const current = currentMap.get(definition.key);
    const incoming = incomingMap.get(definition.key);

    const status =
      incoming && current
        ? pickHigherStatus(incoming.status, current.status)
        : incoming?.status || current?.status || "pending";

    return {
      key: definition.key,
      label: incoming?.label || current?.label || definition.label,
      status,
      url: incoming?.url ?? current?.url ?? null,
      completed_at: incoming?.completed_at ?? current?.completed_at ?? null,
    };
  });
}

function isCompletedGenerationStepStatus(status: GenerationStepStatus): boolean {
  return status === "completed";
}

export function finalizeDetailStepsForCompletedInvoice(steps: GenerationStep[]): GenerationStep[] {
  return steps.map((step) => {
    if (step.status === "failed") return step;
    if (isCompletedGenerationStepStatus(step.status)) return step;
    // Never invent register_saved completion from overall workflow success.
    if (step.key === "register_saved") return step;
    return { ...step, status: "completed" as const };
  });
}

export function resolveDetailStepsFromStored(
  storedSteps: GenerationResultStep[] | null | undefined,
  options: { workflowComplete: boolean }
): GenerationStep[] {
  const incoming = normalizeDetailGenerationResultSteps(storedSteps);
  let merged = mergeDetailGenerationSteps(createDetailPendingSteps(), incoming);

  if (options.workflowComplete) {
    merged = finalizeDetailStepsForCompletedInvoice(merged);
  }

  return merged;
}

export type InvoiceRegisterDisplayStatus = "recorded" | "pending" | "failed";

export type InvoiceRegisterDisplay = {
  status: InvoiceRegisterDisplayStatus;
  completedAt?: string | null;
};

/** Resolve yearly register UI state from persisted `register_saved` only. */
export function resolveInvoiceRegisterDisplay(
  storedSteps: GenerationResultStep[] | null | undefined
): InvoiceRegisterDisplay {
  if (!storedSteps?.length) return { status: "pending" };

  const match = storedSteps.find((step) => {
    const detailKey = normalizeDetailStepKey(step.key);
    const canonicalKey = normalizeStepKey(step.key);
    return detailKey === "register_saved" || canonicalKey === "register_saved";
  });

  if (!match) return { status: "pending" };

  const status = normalizeStepStatus(match.status);
  if (status === "failed") {
    return { status: "failed", completedAt: match.completed_at ?? null };
  }
  if (status === "completed") {
    return { status: "recorded", completedAt: match.completed_at ?? null };
  }
  return { status: "pending", completedAt: match.completed_at ?? null };
}

export function yearlyRegisterSheetName(year: number): string {
  return `IMS Invoice_Register_${year}`;
}

export function yearlyRegisterExcelBackupPath(year: number): string {
  return `/ItConsultingMamun/Rechnungen/Register/${year}/IMS_Invoice_Register_${year}.xlsx`;
}

export interface GenerationUrlContext {
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
  docxUrl?: string | null;
  dropboxPdfUrl?: string | null;
  dropboxDocxUrl?: string | null;
}

export function inferCompletedStepsFromUrls(urls: GenerationUrlContext): GenerationStep[] {
  const googleDocUrl = normalizeDocumentLink(urls.googleDocUrl);
  const dropboxPdfUrl =
    normalizeDocumentLink(urls.dropboxPdfUrl) ?? normalizeDocumentLink(urls.pdfUrl);
  const dropboxDocxUrl =
    normalizeDocumentLink(urls.dropboxDocxUrl) ?? normalizeDocumentLink(urls.docxUrl);

  return INVOICE_GENERATION_STEPS.map((definition) => {
    let url: string | null = null;
    if (definition.key === "google_doc_created" && googleDocUrl) url = googleDocUrl;
    if (definition.key === "dropbox_pdf" && dropboxPdfUrl) url = dropboxPdfUrl;
    if (definition.key === "dropbox_docx" && dropboxDocxUrl) url = dropboxDocxUrl;

    return {
      key: definition.key,
      label: definition.label,
      status: "completed" as const,
      url,
      completed_at: null,
    };
  });
}

export function isPayloadGenerationSuccess(
  data: Pick<
    InvoiceGenerationStatusPayload,
    | "generation_status"
    | "workflow_status"
    | "pdf_url"
    | "docx_url"
    | "dropbox_pdf_url"
    | "dropbox_docx_url"
  >
): boolean {
  if (data.generation_status === "COMPLETED") return true;
  if (data.workflow_status === "completed") return true;

  const hasPdf =
    normalizeDocumentLink(data.dropbox_pdf_url) ?? normalizeDocumentLink(data.pdf_url);
  const hasDocx =
    normalizeDocumentLink(data.dropbox_docx_url) ?? normalizeDocumentLink(data.docx_url);

  return Boolean(hasPdf && hasDocx);
}

function pickPreferredScalar<T>(preferSecond: boolean, second: T | null | undefined, first: T | null | undefined): T | null | undefined {
  if (preferSecond) return second ?? first;
  return first ?? second;
}

function pickPreferredUrl(
  preferSecond: boolean,
  second?: string | null,
  first?: string | null,
  secondAlt?: string | null,
  firstAlt?: string | null
): string | null {
  const secondValue = normalizeDocumentLink(second) ?? normalizeDocumentLink(secondAlt);
  const firstValue = normalizeDocumentLink(first) ?? normalizeDocumentLink(firstAlt);
  if (preferSecond) return secondValue ?? firstValue;
  return firstValue ?? secondValue;
}

function resolveIncomingSteps(payload: InvoiceGenerationStatusPayload): GenerationStep[] {
  const normalized = normalizeGenerationResultSteps(payload.steps);
  if (normalized.length) return normalized;
  if (isPayloadGenerationSuccess(payload)) {
    return inferCompletedStepsFromUrls({
      googleDocUrl: payload.google_doc_url,
      pdfUrl: payload.pdf_url,
      docxUrl: payload.docx_url,
      dropboxPdfUrl: payload.dropbox_pdf_url,
      dropboxDocxUrl: payload.dropbox_docx_url,
    });
  }
  return [];
}

export function mergeGenerateResults(
  primary: InvoiceGenerationStatusPayload | null,
  secondary: InvoiceGenerationStatusPayload | null,
  options?: { preferSecondForCompletion?: boolean }
): InvoiceGenerationStatusPayload | null {
  if (!primary && !secondary) return null;

  const preferSecond = options?.preferSecondForCompletion ?? false;

  if (!primary) {
    const steps = resolveIncomingSteps(secondary!);
    return {
      ...secondary!,
      steps: mergeGenerationSteps(createCanonicalPendingSteps(), steps).map(generationStepToResultStep),
    };
  }

  if (!secondary) {
    const steps = resolveIncomingSteps(primary);
    return {
      ...primary,
      steps: mergeGenerationSteps(createCanonicalPendingSteps(), steps).map(generationStepToResultStep),
    };
  }

  const secondaryComplete = isPayloadGenerationSuccess(secondary);
  const incomingSteps = resolveIncomingSteps(secondary);
  const mergedSteps = mergeGenerationSteps(
    mergeGenerationSteps(createCanonicalPendingSteps(), normalizeGenerationResultSteps(primary.steps)),
    incomingSteps
  );

  return {
    id: secondary.id || primary.id,
    generation_status:
      preferSecond && secondaryComplete
        ? "COMPLETED"
        : pickPreferredScalar(preferSecond, secondary.generation_status, primary.generation_status) ?? null,
    generation_step:
      preferSecond && secondaryComplete
        ? "COMPLETED"
        : pickPreferredScalar(preferSecond, secondary.generation_step, primary.generation_step) ?? null,
    generation_error:
      pickPreferredScalar(false, primary.generation_error, secondary.generation_error) ?? null,
    google_doc_url: pickPreferredUrl(
      preferSecond,
      secondary.google_doc_url,
      primary.google_doc_url
    ),
    pdf_url: pickPreferredUrl(
      preferSecond,
      secondary.pdf_url,
      primary.pdf_url,
      secondary.dropbox_pdf_url,
      primary.dropbox_pdf_url
    ),
    pdf_file_id:
      pickPreferredScalar(preferSecond, secondary.pdf_file_id, primary.pdf_file_id) ?? null,
    google_doc_id:
      pickPreferredScalar(preferSecond, secondary.google_doc_id, primary.google_doc_id) ?? null,
    docx_file_id:
      pickPreferredScalar(preferSecond, secondary.docx_file_id, primary.docx_file_id) ?? null,
    invoice_number:
      pickPreferredScalar(preferSecond, secondary.invoice_number, primary.invoice_number) ?? null,
    docx_url: pickPreferredUrl(
      preferSecond,
      secondary.docx_url,
      primary.docx_url,
      secondary.dropbox_docx_url,
      primary.dropbox_docx_url
    ),
    dropbox_pdf_url: pickPreferredDropboxDocumentUrl(
      preferSecond ? secondary.dropbox_pdf_url : primary.dropbox_pdf_url,
      preferSecond ? primary.dropbox_pdf_url : secondary.dropbox_pdf_url
    ),
    dropbox_docx_url: pickPreferredDropboxDocumentUrl(
      preferSecond ? secondary.dropbox_docx_url : primary.dropbox_docx_url,
      preferSecond ? primary.dropbox_docx_url : secondary.dropbox_docx_url
    ),
    workflow_status:
      preferSecond && secondaryComplete
        ? secondary.workflow_status ?? "completed"
        : pickPreferredScalar(preferSecond, secondary.workflow_status, primary.workflow_status) ?? null,
    invoice_status:
      pickPreferredScalar(preferSecond, secondary.invoice_status, primary.invoice_status) ?? null,
    steps: mergedSteps.map(generationStepToResultStep),
  };
}
