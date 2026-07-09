"use client";

import { useTranslations } from "next-intl";
import {
  generationProgressSteps,
  isCompletedStepStatus,
  isFailedStepStatus,
  isGenerationStatus,
  resolveActiveGenerationStep,
  resolveGenerationSteps,
  type GenerationResultStep,
  type GenerationStatus,
} from "@/lib/generation-status";
import { formatDate } from "@/lib/utils";
import { sanitizeExternalUrl } from "@/lib/urls";

export interface InvoiceGenerationStatusProps {
  status: GenerationStatus | string | null;
  generationStep?: string | null;
  generationError?: string | null;
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
  generatedAt?: string | null;
  steps?: GenerationResultStep[] | null;
}

const TIMELINE_STATUS_KEYS: Record<GenerationStatus, string> = {
  PENDING: "pending",
  VALIDATING: "validating",
  COPYING_TEMPLATE: "copyingTemplate",
  REPLACING_PLACEHOLDERS: "replacingPlaceholders",
  EXPORTING_PDF: "exportingPdf",
  UPLOADING_PDF: "uploadingPdf",
  COMPLETED: "completed",
  FAILED: "failed",
};

function StepIcon({ state }: { state: "completed" | "active" | "upcoming" | "failed" }) {
  if (state === "completed") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-white">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (state === "failed") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 ring-4 ring-white">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 ring-4 ring-white">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white ring-4 ring-white">
      <span className="h-2 w-2 rounded-full bg-slate-200" />
    </span>
  );
}

function ResultStepRow({
  step,
  tInvoice,
  tTimeline,
}: {
  step: GenerationResultStep;
  tInvoice: ReturnType<typeof useTranslations<"invoice">>;
  tTimeline: ReturnType<typeof useTranslations<"timeline">>;
}) {
  const completed = isCompletedStepStatus(step.status);
  const failed = isFailedStepStatus(step.status);
  const state = failed ? "failed" : completed ? "completed" : "active";
  const safeUrl = sanitizeExternalUrl(step.url);

  function stepActionLabel(): string {
    const url = step.url?.toLowerCase() ?? "";
    const key = step.key.toLowerCase();
    if (url.includes("drive.google.com") || key.includes("pdf")) {
      return tTimeline("view");
    }
    return tTimeline("open");
  }

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="relative z-10">
        <StepIcon state={state} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">{step.label}</p>
            {completed && (
              <span className="shrink-0 text-xs font-medium text-emerald-700">{tInvoice("stepCompleted")}</span>
            )}
            {failed && (
              <span className="shrink-0 text-xs font-medium text-red-700">{tInvoice("stepFailed")}</span>
            )}
            {!completed && !failed && (
              <span className="shrink-0 text-xs font-medium text-blue-700">{tInvoice("stepInProgress")}</span>
            )}
          </div>
          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {stepActionLabel()}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function GenerationStepsChecklist({
  steps,
  googleDocUrl,
  pdfUrl,
  tInvoice,
  tTimeline,
}: {
  steps: GenerationResultStep[];
  googleDocUrl?: string | null;
  pdfUrl?: string | null;
  tInvoice: ReturnType<typeof useTranslations<"invoice">>;
  tTimeline: ReturnType<typeof useTranslations<"timeline">>;
}) {
  const checklistSteps = resolveGenerationSteps(steps, { googleDocUrl, pdfUrl });

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4">
      <h4 className="text-sm font-semibold text-slate-900">{tTimeline("stepsTitle")}</h4>
      <ol className="relative mt-4">
        <span
          className="absolute left-3.5 top-2 bottom-2 w-px bg-emerald-100"
          aria-hidden="true"
        />
        {checklistSteps.map((step) => (
          <ResultStepRow key={step.key} step={step} tInvoice={tInvoice} tTimeline={tTimeline} />
        ))}
      </ol>
    </div>
  );
}

export function InvoiceGenerationStatus({
  status,
  generationStep,
  generationError,
  googleDocUrl,
  pdfUrl,
  generatedAt,
  steps,
}: InvoiceGenerationStatusProps) {
  const t = useTranslations("invoice");
  const tTimeline = useTranslations("timeline");

  if (!status || !isGenerationStatus(status)) {
    return null;
  }

  const activeStep = resolveActiveGenerationStep(status, generationStep);
  const progressSteps = generationProgressSteps(activeStep);
  const isCompleted = status === "COMPLETED";
  const isFailed = status === "FAILED";
  const errorMessage = generationError?.trim() || null;
  const safeGoogleDocUrl = sanitizeExternalUrl(googleDocUrl);
  const safePdfUrl = sanitizeExternalUrl(pdfUrl);

  function statusLabel(generationStatus: GenerationStatus): string {
    return tTimeline(TIMELINE_STATUS_KEYS[generationStatus] as Parameters<typeof tTimeline>[0]);
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{t("generationTitle")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{statusLabel(status)}</p>
        </div>
        {generatedAt && isCompleted && (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {formatDate(generatedAt)}
          </span>
        )}
      </div>

      {isCompleted ? (
        <GenerationStepsChecklist
          steps={steps ?? []}
          googleDocUrl={safeGoogleDocUrl}
          pdfUrl={safePdfUrl}
          tInvoice={t}
          tTimeline={tTimeline}
        />
      ) : isFailed ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800">
            <StepIcon state="failed" />
            <span className="font-medium">{statusLabel("FAILED")}</span>
          </div>
          {steps?.length ? (
            <GenerationStepsChecklist
              steps={steps}
              googleDocUrl={safeGoogleDocUrl}
              pdfUrl={safePdfUrl}
              tInvoice={t}
              tTimeline={tTimeline}
            />
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4">
          <h4 className="text-sm font-semibold text-slate-900">{tTimeline("stepsTitle")}</h4>
          <ol className="relative mt-4 space-y-3">
            {progressSteps.map(({ step, state }, index) => (
              <li key={step} className="relative flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <StepIcon state={state} />
                  {index < progressSteps.length - 1 && (
                    <span
                      className={`mt-1 h-5 w-px ${
                        state === "completed" ? "bg-emerald-200" : "bg-slate-200"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="pt-1 min-w-0">
                  <p
                    className={`text-sm ${
                      state === "active"
                        ? "font-semibold text-slate-900"
                        : state === "completed"
                          ? "text-slate-700"
                          : state === "failed"
                            ? "font-semibold text-red-700"
                            : "text-slate-400"
                    }`}
                  >
                    {statusLabel(step)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isFailed && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isCompleted && (safeGoogleDocUrl || safePdfUrl) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {safeGoogleDocUrl && (
            <a
              href={safeGoogleDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
            >
              {t("openGoogleDocs")}
            </a>
          )}
          {safePdfUrl && (
            <a
              href={safePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
            >
              {tTimeline("downloadPdf")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
