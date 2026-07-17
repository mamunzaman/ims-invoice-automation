export type InvoiceGenerationErrorCategory =
  | "VALIDATION_ERROR"
  | "DOCUMENT_SERVICE_UNAVAILABLE"
  | "DOCUMENT_TIMEOUT"
  | "TEMPLATE_MISSING"
  | "DRIVE_UPLOAD_FAILED"
  | "ARCHIVE_UPLOAD_FAILED"
  | "UNKNOWN_GENERATION_ERROR";

export const INVOICE_GENERATION_ERROR_I18N_KEYS: Record<
  InvoiceGenerationErrorCategory,
  { title: string; message: string }
> = {
  VALIDATION_ERROR: {
    title: "validation.title",
    message: "validation.message",
  },
  DOCUMENT_SERVICE_UNAVAILABLE: {
    title: "documentServiceUnavailable.title",
    message: "documentServiceUnavailable.message",
  },
  DOCUMENT_TIMEOUT: {
    title: "documentTimeout.title",
    message: "documentTimeout.message",
  },
  TEMPLATE_MISSING: {
    title: "templateMissing.title",
    message: "templateMissing.message",
  },
  DRIVE_UPLOAD_FAILED: {
    title: "driveUploadFailed.title",
    message: "driveUploadFailed.message",
  },
  ARCHIVE_UPLOAD_FAILED: {
    title: "archiveUploadFailed.title",
    message: "archiveUploadFailed.message",
  },
  UNKNOWN_GENERATION_ERROR: {
    title: "unknownGenerationError.title",
    message: "unknownGenerationError.message",
  },
};

export const INVOICE_DRAFT_SAVED_FAILURE_I18N_KEYS = {
  title: "draftSaved.title",
  message: "draftSaved.message",
} as const;

export function classifyGenerationError(
  technicalError: string | null | undefined
): InvoiceGenerationErrorCategory {
  const normalized = (technicalError ?? "").toLowerCase();

  if (!normalized.trim()) {
    return "UNKNOWN_GENERATION_ERROR";
  }

  if (
    /webhook|n8n\b|not registered|execute workflow|http\s*404|\b404\b|document service|service unavailable/.test(
      normalized
    )
  ) {
    return "DOCUMENT_SERVICE_UNAVAILABLE";
  }

  if (/timeout|timed out|aborted|econnreset|etimedout|zeitüberschreitung/.test(normalized)) {
    return "DOCUMENT_TIMEOUT";
  }

  if (/template_id|google docs template|invoice template|vorlage|template missing|template unavailable/.test(
    normalized
  )) {
    return "TEMPLATE_MISSING";
  }

  if (/dropbox|archive copy|archive upload|archiv/.test(normalized)) {
    return "ARCHIVE_UPLOAD_FAILED";
  }

  if (/google drive|drive\.google|upload failed|permission denied|storage failed|speicher/.test(
    normalized
  )) {
    return "DRIVE_UPLOAD_FAILED";
  }

  return "UNKNOWN_GENERATION_ERROR";
}

export function shouldShowTechnicalErrorDetails(
  displayMode?: import("@/lib/types/database").TechnicalErrorsDisplay | null
): boolean {
  if (displayMode === "never") return false;
  if (displayMode === "admin_only") {
    return process.env.NEXT_PUBLIC_SHOW_TECHNICAL_ERRORS === "true";
  }
  if (displayMode === "development") {
    return process.env.NODE_ENV === "development";
  }
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_SHOW_TECHNICAL_ERRORS === "true";
}

export function resolveGenerationErrorI18nKeys(
  technicalError: string | null | undefined,
  options?: { draftFailure?: boolean }
) {
  if (options?.draftFailure) {
    return INVOICE_DRAFT_SAVED_FAILURE_I18N_KEYS;
  }

  const category = classifyGenerationError(technicalError);
  return INVOICE_GENERATION_ERROR_I18N_KEYS[category];
}

export function getFriendlyGenerationErrorContent(
  technicalError: string | null | undefined,
  translate: (key: string) => string,
  options?: {
    draftFailure?: boolean;
    forceCategory?: InvoiceGenerationErrorCategory;
  }
) {
  const keys = options?.forceCategory
    ? INVOICE_GENERATION_ERROR_I18N_KEYS[options.forceCategory]
    : resolveGenerationErrorI18nKeys(technicalError, options);

  return {
    title: translate(keys.title),
    message: translate(keys.message),
    technicalDetails: technicalError?.trim() || null,
  };
}
