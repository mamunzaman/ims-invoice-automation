"use client";

import { useTranslations } from "next-intl";
import {
  isCompletedStepStatus,
  isFailedStepStatus,
  resolveGenerationSteps,
  type GenerationResultStep,
} from "@/lib/generation-status";
import { normalizeStepKey } from "@/lib/invoice-generation-steps";
import { sanitizeExternalUrl } from "@/lib/urls";
import { ImsTimeline, type ImsTimelineStep } from "@/components/forms/ims";

interface GenerationTimelineProps {
  steps?: GenerationResultStep[] | null;
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
  docxUrl?: string | null;
  dropboxPdfUrl?: string | null;
  dropboxDocxUrl?: string | null;
}

const STEP_LABEL_KEYS: Record<
  string,
  | "received"
  | "validated"
  | "copyTemplate"
  | "replacePlaceholders"
  | "googleDocCreated"
  | "exportPdf"
  | "exportDocx"
  | "dropboxFolders"
  | "dropboxPdf"
  | "dropboxDocx"
  | "registerSaved"
  | "invoiceSaved"
> = {
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

function resolveStepActionLabel(step: GenerationResultStep, t: ReturnType<typeof useTranslations<"timeline">>) {
  const url = step.url?.toLowerCase() ?? "";
  const key = normalizeStepKey(step.key);

  if (url.includes("dropbox.com") || key.includes("dropbox")) {
    return t("openInDropbox");
  }
  if (url.includes("drive.google.com") || key === "google_doc_created") {
    return t("openInGoogleDocs");
  }

  return t("openInDropbox");
}

function mapGenerationSteps(
  steps: GenerationResultStep[],
  t: ReturnType<typeof useTranslations<"timeline">>
): ImsTimelineStep[] {
  return steps.map((step, index) => {
    const completed = isCompletedStepStatus(step.status);
    const failed = isFailedStepStatus(step.status);
    const canonicalKey = normalizeStepKey(step.key);
    const labelKey = STEP_LABEL_KEYS[canonicalKey];
    return {
      key: `${canonicalKey}-${index}`,
      label: labelKey ? t(labelKey) : step.label,
      status: failed ? "failed" : completed ? "completed" : "pending",
      href: sanitizeExternalUrl(step.url),
      linkLabel: step.url ? resolveStepActionLabel(step, t) : undefined,
    };
  });
}

export function GenerationTimeline({
  steps,
  googleDocUrl,
  pdfUrl,
  docxUrl,
  dropboxPdfUrl,
  dropboxDocxUrl,
}: GenerationTimelineProps) {
  const t = useTranslations("timeline");
  const checklistSteps = resolveGenerationSteps(steps, {
    googleDocUrl,
    pdfUrl,
    docxUrl,
    dropboxPdfUrl,
    dropboxDocxUrl,
  });

  return (
    <ImsTimeline
      title={t("stepsTitle")}
      steps={mapGenerationSteps(checklistSteps, t)}
      completedLabel={t("completed")}
      failedLabel={t("failed")}
      compact={false}
    />
  );
}
