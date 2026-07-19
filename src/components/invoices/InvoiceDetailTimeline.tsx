"use client";

import { useLocale, useTranslations } from "next-intl";
import { ImsTimeline, type ImsTimelineStep, imsStickyColumnSx } from "@/components/forms/ims";
import { Box } from "@mui/material";
import { resolveGenerationStatus } from "@/lib/generation-status";
import type { InvoiceDocumentUrls } from "@/lib/invoice-form";
import { invoiceNotesMeta } from "@/lib/invoice-form";
import { resolveDetailStepsFromStored } from "@/lib/invoice-generation-steps";
import { getFriendlyGenerationErrorContent } from "@/lib/invoice-errors";
import { sanitizeExternalUrl, isLocalhostAbsoluteUrl } from "@/lib/urls";
import { formatDate } from "@/lib/utils";
import type { Invoice } from "@/lib/types/database";
import { type AppLocale } from "@/i18n/routing";

interface InvoiceDetailTimelineProps {
  invoice: Invoice;
  documents: InvoiceDocumentUrls;
}

const DETAIL_STEP_LABEL_KEYS: Record<string, string> = {
  received: "timeline.received",
  validated: "timeline.validated",
  copy_template: "timeline.copyTemplate",
  replace_placeholders: "timeline.replacePlaceholders",
  google_doc_created: "timeline.googleDocCreated",
  export_pdf: "timeline.exportPdf",
  export_docx: "timeline.exportDocx",
  dropbox_folders: "timeline.dropboxFolders",
  save_pdf: "timeline.savePdf",
  save_docx: "timeline.saveDocx",
  copy_pdf_all: "timeline.copyPdfAll",
  copy_docx_all: "timeline.copyDocxAll",
  register_saved: "timeline.registerSaved",
  completed: "timeline.statusSaved",
};

function formatStepTimestamp(value: string | null | undefined, locale: AppLocale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${formatDate(value, locale)}, ${date.toLocaleTimeString(locale === "de" ? "de-DE" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function resolveStepHref(
  key: string,
  stepUrl: string | null | undefined,
  documents: InvoiceDocumentUrls
): string | null {
  if (key === "google_doc_created") {
    if (documents.googleDocUrl) return documents.googleDocUrl;
    const fromStep = sanitizeExternalUrl(stepUrl);
    if (fromStep && !isLocalhostAbsoluteUrl(fromStep)) return fromStep;
    return null;
  }

  // Archive + Alle_Rechnungen: secure app-domain downloads only (no Dropbox public links/paths)
  if (key === "save_pdf" || key === "copy_pdf_all") {
    return documents.pdfDownloadHref;
  }
  if (key === "save_docx" || key === "copy_docx_all") {
    return documents.docxDownloadHref;
  }

  return null;
}

function resolveStepLinkLabel(
  key: string,
  href: string | null,
  translate: (key: string) => string
): string | undefined {
  if (!href) return undefined;
  if (key === "google_doc_created") return translate("timeline.openInGoogleDocs");
  if (key === "save_pdf" || key === "copy_pdf_all") return translate("timeline.downloadPdf");
  if (key === "save_docx" || key === "copy_docx_all") return translate("timeline.downloadDocx");
  return undefined;
}

export function InvoiceDetailTimeline({ invoice, documents }: InvoiceDetailTimelineProps) {
  const t = useTranslations("invoiceDetail");
  const tTimeline = useTranslations("timeline");
  const tInvoiceErrors = useTranslations("invoiceErrors");
  const locale = useLocale() as AppLocale;

  const meta = invoiceNotesMeta(invoice);
  const generationStatus = resolveGenerationStatus(invoice);
  const isFailed =
    generationStatus === "FAILED" ||
    invoice.workflow_status === "failed" ||
    invoice.generation_status === "FAILED";
  const isComplete =
    generationStatus === "COMPLETED" ||
    invoice.workflow_status === "completed" ||
    invoice.generation_status === "COMPLETED" ||
    (invoice.status !== "draft" && !isFailed);

  const resolvedSteps = resolveDetailStepsFromStored(meta.generation_steps, {
    workflowComplete: isComplete && !isFailed,
  });

  const createdTs = formatStepTimestamp(invoice.created_at, locale);
  const finalTimestamp = formatStepTimestamp(invoice.generated_at || invoice.updated_at, locale);

  const steps: ImsTimelineStep[] = resolvedSteps.map((step) => {
    const labelKey = DETAIL_STEP_LABEL_KEYS[step.key];
    const isCompleted = step.status === "completed";
    const isStepFailed = step.status === "failed";
    const href = isCompleted ? resolveStepHref(step.key, step.url, documents) : null;

    let timestamp: string | null = null;
    if (isCompleted && step.key === "received") timestamp = createdTs;
    if (isCompleted && step.key === "register_saved") {
      timestamp = formatStepTimestamp(step.completed_at, locale);
    }
    if (isCompleted && step.key === "completed") timestamp = finalTimestamp;

    return {
      key: step.key,
      label: labelKey ? t(labelKey) : step.label,
      status: isStepFailed ? "failed" : isCompleted ? "completed" : "pending",
      timestamp,
      href: href ?? undefined,
      linkLabel: resolveStepLinkLabel(step.key, href, t),
    };
  });

  const failedSummaryMessage =
    isFailed && invoice.generation_error
      ? getFriendlyGenerationErrorContent(invoice.generation_error, tInvoiceErrors, {
          draftFailure: invoice.status === "draft",
        }).message
      : undefined;

  return (
    <Box sx={imsStickyColumnSx}>
      <ImsTimeline
        title={t("timeline.title")}
        steps={steps}
        completedLabel={tTimeline("completed")}
        failedLabel={tTimeline("failed")}
        compact={false}
        summary={
          isFailed || isComplete
            ? {
                status: isFailed ? "failed" : "success",
                title: isFailed ? t("finalStatus.failedTitle") : t("finalStatus.successTitle"),
                message: isFailed ? failedSummaryMessage : undefined,
                timestamp: isComplete && !isFailed ? finalTimestamp : undefined,
              }
            : undefined
        }
      />
    </Box>
  );
}
