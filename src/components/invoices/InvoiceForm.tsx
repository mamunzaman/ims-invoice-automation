"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AddIcon, ArrowForwardIcon } from "@/components/icons/muiIcons";
import { PageShell } from "@/components/layout/PageShell";
import { SectionCard } from "@/components/layout/SectionCard";
import { StepIndicator, FORM_STEPS } from "@/components/invoices/StepIndicator";
import { InvoicePreviewCard } from "@/components/invoices/InvoicePreviewCard";
import { InvoiceFormSidebar } from "@/components/invoices/InvoiceFormSidebar";
import { InvoiceGenerationProgressModal } from "@/components/invoices/InvoiceGenerationProgressModal";
import { FormValidationAlert } from "@/components/invoices/FormValidationAlert";
import { InvoiceErrorAlert } from "@/components/invoices/InvoiceErrorAlert";
import { ImsButton, ImsSelect } from "@/components/forms/ims";
import { imsSelectMenuProps } from "@/components/forms/ims/imsStyles";
import { ClientOnly } from "@/components/ui/ClientOnly";
import {
  customerDisplayName,
  paymentDeadlineFromCustomer,
  paymentTermsFromCustomer,
  formatCurrency,
  formatGermanCurrencyDisplay,
  formatGermanDate,
  resolveInvoiceCurrency,
} from "@/lib/utils";
import { getInvoiceFieldErrors, type InvoiceFieldErrors } from "@/lib/n8n";
import { CURRENCY_OPTIONS } from "@/lib/settings-constants";
import {
  invoiceToFormData,
  customerToInvoiceAddressFields,
  calculateInvoiceAmounts,
  DEFAULT_INVOICE_TITLE,
  composeInvoiceCustomerAddress,
  invoiceNotesMeta,
  mergeSavedInvoiceIntoFormPayload,
  normalizeInvoiceFormData,
  formatServicePeriod,
} from "@/lib/invoice-form";
import {
  isGenerationActive,
  isGenerationStatus,
  resolveGenerationStatus,
  type GenerationStatus,
} from "@/lib/generation-status";
import type { InvoiceGenerationStatusPayload } from "@/app/api/invoices/[id]/generation-status/route";
import {
  fetchInvoiceGenerationStatus,
  isGenerateApiSuccess,
  isGenerationStatusComplete,
  mergeGenerateResults,
  normalizeGenerateApiResult,
  type InvoiceGenerateApiResponse,
} from "@/lib/invoice-generation-client";
import {
  isGenerationSessionVisible,
  isTerminalGenerationSuccess,
  type GenerationSessionPhase,
} from "@/lib/generation-session";
import { imsColors, imsInputHeight } from "@/theme/imsTheme";
import type {
  InvoiceFormData,
  Invoice,
  Customer,
  ProfileBankAccount,
  TechnicalErrorsDisplay,
} from "@/lib/types/database";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { getFriendlyGenerationErrorContent } from "@/lib/invoice-errors";

const VALIDATION_MESSAGE_KEYS = new Set([
  "invoiceDateRequired",
  "customerRequired",
  "serviceDescriptionRequired",
  "amountNetRequired",
  "currencyRequired",
  "paymentDeadlineRequired",
  "servicePeriodStartRequired",
  "servicePeriodEndRequired",
  "servicePeriodEndAfterStart",
  "saveFailed",
  "notAuthenticated",
  "invoiceNotFound",
  "genericError",
]);

const GENERATION_STATUS_VERIFY_FAILED_MESSAGE =
  "Could not verify the current generation status. Please try again.";

const BACKGROUND_STATUS_INTERVAL_MS = 5000;

function resolveProgressInitialStatus(
  source:
    | Pick<InvoiceGenerationStatusPayload, "generation_status" | "generation_step">
    | Invoice
    | null
    | undefined
): GenerationStatus {
  if (!source) {
    return "VALIDATING";
  }

  if ("generation_step" in source) {
    const step = source.generation_step;
    if (
      step &&
      isGenerationStatus(step) &&
      step !== "PENDING" &&
      step !== "FAILED" &&
      step !== "COMPLETED"
    ) {
      return step;
    }

    const status = source.generation_status;
    if (
      status &&
      isGenerationStatus(status) &&
      status !== "PENDING" &&
      status !== "FAILED" &&
      status !== "COMPLETED"
    ) {
      return status;
    }
  }

  if ("workflow_status" in source && "status" in source) {
    return resolveGenerationStatus(source) ?? "VALIDATING";
  }

  return "VALIDATING";
}

function isInitialGenerationActive(initialData?: Invoice): boolean {
  return Boolean(
    initialData?.id &&
      isGenerationActive(initialData.workflow_status, initialData.generation_status)
  );
}

const VALIDATION_ERROR_TO_FIELD: Partial<Record<string, keyof InvoiceFormData>> = {
  invoiceDateRequired: "invoice_date",
  customerRequired: "customer_name",
  serviceDescriptionRequired: "service_description",
  amountNetRequired: "amount_net",
  currencyRequired: "currency",
  paymentDeadlineRequired: "payment_deadline",
  servicePeriodStartRequired: "service_period_start",
  servicePeriodEndRequired: "service_period_end",
  servicePeriodEndAfterStart: "service_period_end",
};

const FIELD_FOCUS_ORDER: (keyof InvoiceFormData)[] = [
  "invoice_date",
  "service_period_start",
  "service_period_end",
  "customer_name",
  "service_description",
  "amount_net",
  "payment_deadline",
  "iban",
];

function focusFirstInvalidField(errors: InvoiceFieldErrors) {
  for (const field of FIELD_FOCUS_ORDER) {
    if (!errors[field]) continue;
    const el = document.querySelector<HTMLElement>(`[name="${field}"]`);
    if (!el) continue;
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    break;
  }
}

interface InvoiceFormProps {
  initialData?: Invoice;
  defaults?: Partial<InvoiceFormData> & { default_bank_account_id?: string };
  customers: Customer[];
  bankAccounts: ProfileBankAccount[];
  invoiceId?: string;
  mode: "create" | "edit";
  technicalErrorsDisplay?: TechnicalErrorsDisplay;
  onSave?: (data: InvoiceFormData) => Promise<{
    success: boolean;
    errors?: string[];
    data?: Invoice | { invoice_number: string };
  }>;
}

function matchBankAccountId(
  bankAccounts: ProfileBankAccount[],
  bank_name: string,
  iban: string,
  bic: string
): string {
  return (
    bankAccounts.find(
      (account) =>
        account.bank_name === bank_name &&
        account.iban === iban &&
        (account.bic || "") === (bic || "")
    )?.id || ""
  );
}

function resolveInitialBankState(
  bankAccounts: ProfileBankAccount[],
  initialData?: Invoice,
  defaults?: Partial<InvoiceFormData> & { default_bank_account_id?: string }
) {
  if (initialData) {
    const meta = invoiceNotesMeta(initialData);
    const bank_name = meta.bank_name || "";
    const iban = meta.iban || "";
    const bic = meta.bic || "";
    const selectedId = matchBankAccountId(bankAccounts, bank_name, iban, bic);
    const account = bankAccounts.find((item) => item.id === selectedId);
    return {
      bank_name,
      iban,
      bic,
      account_holder: account?.account_holder || meta.account_holder || "",
      selectedId,
    };
  }

  const defaultAccount =
    (defaults?.default_bank_account_id
      ? bankAccounts.find((account) => account.id === defaults.default_bank_account_id)
      : undefined) ??
    bankAccounts.find((account) => account.is_default) ??
    bankAccounts[0];

  if (defaultAccount) {
    return {
      bank_name: defaultAccount.bank_name,
      iban: defaultAccount.iban,
      bic: defaultAccount.bic || "",
      account_holder: defaultAccount.account_holder || "",
      selectedId: defaultAccount.id,
    };
  }

  return {
    bank_name: defaults?.bank_name || "",
    iban: defaults?.iban || "",
    bic: defaults?.bic || "",
    account_holder: defaults?.account_holder || "",
    selectedId: "",
  };
}

function buildInitialForm(
  initialData: Invoice | undefined,
  defaults: Partial<InvoiceFormData> & { default_bank_account_id?: string } | undefined,
  initialBank: ReturnType<typeof resolveInitialBankState>
): InvoiceFormData {
  if (initialData) {
    const data = invoiceToFormData(initialData, defaults);
    return {
      ...data,
      bank_name: initialBank.bank_name,
      iban: initialBank.iban,
      bic: initialBank.bic,
      account_holder: initialBank.account_holder || data.account_holder,
    };
  }

  return {
    invoice_number: "",
    invoice_date: defaults?.invoice_date || "",
    service_period_start: defaults?.service_period_start || "",
    service_period_end: defaults?.service_period_end || "",
    invoice_title: defaults?.invoice_title || DEFAULT_INVOICE_TITLE,
    customer_id: defaults?.customer_id || "",
    customer_name: defaults?.customer_name || "",
    customer_salutation: defaults?.customer_salutation || "",
    customer_address: defaults?.customer_address || "",
    customer_zip: defaults?.customer_zip || "",
    customer_city: defaults?.customer_city || "",
    customer_country: defaults?.customer_country || "",
    service_description: defaults?.service_description || "",
    amount_net: defaults?.amount_net || "",
    currency: defaults?.currency || "EUR",
    payment_deadline: defaults?.payment_deadline || "",
    payment_terms: defaults?.payment_terms || "",
    optional_notes: defaults?.optional_notes || "",
    small_business_rule: defaults?.small_business_rule ?? false,
    bank_name: initialBank.bank_name,
    account_holder: initialBank.account_holder || defaults?.account_holder || "",
    iban: initialBank.iban,
    bic: initialBank.bic,
    tax_number: defaults?.tax_number || "",
    invoice_language: defaults?.invoice_language || "en",
  };
}

export function InvoiceForm({
  initialData,
  defaults,
  customers,
  bankAccounts,
  invoiceId,
  mode,
  technicalErrorsDisplay,
  onSave,
}: InvoiceFormProps) {
  const router = useRouter();
  const routeParams = useParams<{ id?: string }>();
  const routeInvoiceId = typeof routeParams?.id === "string" ? routeParams.id : undefined;
  const t = useTranslations("invoice");
  const tValidation = useTranslations("validation");
  const tButtons = useTranslations("buttons");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("navigation");
  const tAddress = useTranslations("address");
  const tBank = useTranslations("bankAccounts");
  const tSettings = useTranslations("settings");
  const tInvoiceErrors = useTranslations("invoiceErrors");
  const tCurrency = useTranslations("currency");
  const tCustomers = useTranslations("customers");

  const translateValidationMessage = useCallback(
    (message: string) => {
      if (VALIDATION_MESSAGE_KEYS.has(message)) {
        return tValidation(message as Parameters<typeof tValidation>[0]);
      }
      return message;
    },
    [tValidation]
  );

  const translateFieldError = useCallback(
    (message?: string) => (message ? translateValidationMessage(message) : undefined),
    [translateValidationMessage]
  );

  const resolveEditInvoiceId = useCallback(() => {
    return invoiceId ?? routeInvoiceId ?? initialData?.id;
  }, [invoiceId, routeInvoiceId, initialData?.id]);

  const persistInvoice = useCallback(
    async (payload: InvoiceFormData) => {
      if (mode === "edit") {
        const editId = resolveEditInvoiceId();
        if (!editId) {
          return { success: false as const, errors: [tValidation("invoiceNotFound")] };
        }
        return updateInvoice(editId, payload);
      }

      const save = onSave ?? createInvoice;
      return save(payload);
    },
    [mode, onSave, resolveEditInvoiceId, tValidation]
  );

  const initialBank = resolveInitialBankState(bankAccounts, initialData, defaults);

  const [selectedBankAccountId, setSelectedBankAccountId] = useState(initialBank.selectedId);
  const [form, setForm] = useState<InvoiceFormData>(() =>
    buildInitialForm(initialData, defaults, initialBank)
  );
  const [fieldErrors, setFieldErrors] = useState<InvoiceFieldErrors>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [generationTechnicalError, setGenerationTechnicalError] = useState(() =>
    initialData?.generation_status === "FAILED" && initialData.generation_error
      ? initialData.generation_error
      : ""
  );
  const initialGenerationActive = isInitialGenerationActive(initialData);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationSessionPhase, setGenerationSessionPhase] = useState<GenerationSessionPhase>(
    initialGenerationActive ? "running" : "idle"
  );
  const progressOpen = isGenerationSessionVisible(generationSessionPhase);
  const [progressInvoiceId, setProgressInvoiceId] = useState<string | null>(() =>
    initialGenerationActive && initialData?.id ? initialData.id : null
  );
  const [progressAttempt, setProgressAttempt] = useState(0);
  const progressSessionKey = `${progressInvoiceId ?? "new"}-${progressAttempt}`;
  const [progressInitialStatus, setProgressInitialStatus] = useState<GenerationStatus>(() =>
    initialGenerationActive ? resolveProgressInitialStatus(initialData) : "VALIDATING"
  );
  const [generateCompletionSnapshot, setGenerateCompletionSnapshot] =
    useState<InvoiceGenerationStatusPayload | null>(null);
  const generatePayloadRef = useRef<InvoiceFormData | null>(null);
  const generateRequestInFlightRef = useRef<string | null>(
    initialGenerationActive && initialData?.id ? initialData.id : null
  );
  const [generateRequestInFlight, setGenerateRequestInFlight] = useState(initialGenerationActive);
  const [backgroundStatusReconciliation, setBackgroundStatusReconciliation] = useState(false);
  const backgroundReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearGenerateRequestGuard = useCallback(() => {
    generateRequestInFlightRef.current = null;
    setGenerateRequestInFlight(false);
    setBackgroundStatusReconciliation(false);
    if (backgroundReconcileTimerRef.current) {
      clearTimeout(backgroundReconcileTimerRef.current);
      backgroundReconcileTimerRef.current = null;
    }
  }, []);

  const generationLifecycleActive = generateRequestInFlight || progressOpen;

  useEffect(() => {
    if (!generationLifecycleActive) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [generationLifecycleActive]);

  useEffect(() => {
    if (!initialGenerationActive || !initialData?.id) {
      return;
    }

    generatePayloadRef.current = normalizeInvoiceFormData(form);
  }, [initialGenerationActive, initialData, form]);

  const shouldPreserveGenerateRequestGuard = useCallback((error: string) => {
    const trimmed = error.trim();
    return /^Generation timed out after \d+ seconds$/i.test(trimmed);
  }, []);

  const normalizedForm = useMemo(() => normalizeInvoiceFormData(form), [form]);

  const amounts = useMemo(
    () => calculateInvoiceAmounts(normalizedForm.amount_net, normalizedForm.small_business_rule),
    [normalizedForm.amount_net, normalizedForm.small_business_rule]
  );
  const previewTaxAmount = amounts.vat_amount;
  const previewTotalAmount = amounts.gross_amount;

  const generateFieldErrors = useMemo(
    () => getInvoiceFieldErrors(normalizedForm, { requirePaymentDeadline: true }),
    [normalizedForm]
  );
  const canGenerate = Object.keys(generateFieldErrors).length === 0;

  const readinessItems = useMemo(
    () => [
      {
        label: t("invoiceData"),
        complete: Boolean(form.invoice_date && form.service_period_start && form.service_period_end),
      },
      { label: t("customer"), complete: Boolean(form.customer_name.trim()) },
      {
        label: t("services"),
        complete: Boolean(form.service_description.trim() && form.amount_net),
      },
      { label: t("payment"), complete: Boolean(form.payment_deadline && form.iban.trim()) },
      {
        label: t("review"),
        complete: canGenerate,
        hint: canGenerate ? t("complete") : t("check"),
      },
    ],
    [form, canGenerate, t]
  );

  const [visibleStep, setVisibleStep] = useState(1);
  const scrollLockRef = useRef(false);

  const handleStepClick = useCallback((stepId: number, sectionId: string) => {
    setVisibleStep(stepId);
    scrollLockRef.current = true;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 700);
  }, []);

  useEffect(() => {
    if (mode !== "create") return;

    const sections = FORM_STEPS.map((step) => ({
      id: step.id,
      el: document.getElementById(step.sectionId),
    })).filter((section) => section.el != null) as Array<{ id: (typeof FORM_STEPS)[number]["id"]; el: HTMLElement }>;

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLockRef.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => ({
            id: FORM_STEPS.find((step) => step.sectionId === entry.target.id)?.id ?? 1,
            top: entry.boundingClientRect.top,
          }))
          .sort((a, b) => a.top - b.top);

        if (visible.length > 0) {
          setVisibleStep(visible[0].id);
        }
      },
      {
        rootMargin: "-120px 0px -45% 0px",
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    );

    sections.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [mode]);

  const completedSteps = useMemo(() => {
    const steps: number[] = [];
    if (form.invoice_date && form.service_period_start && form.service_period_end) steps.push(1);
    if (form.customer_name.trim()) steps.push(2);
    if (form.service_description.trim() && form.amount_net) steps.push(3);
    if (form.payment_deadline && form.iban.trim()) steps.push(4);
    if (canGenerate) steps.push(5);
    return steps;
  }, [form, canGenerate]);

  const hasFailedDraftGeneration = Boolean(
    generationTechnicalError ||
      (initialData?.generation_status === "FAILED" && initialData.status === "draft")
  );

  const validationMessages = useMemo(() => {
    const messages = errors.map(translateValidationMessage);
    Object.values(fieldErrors).forEach((message) => {
      if (message) messages.push(translateValidationMessage(message));
    });
    return [...new Set(messages)];
  }, [errors, fieldErrors, translateValidationMessage]);

  const hasFieldValidationErrors = Object.keys(fieldErrors).length > 0;

  const validationAlertMessages = useMemo(() => {
    if (hasFieldValidationErrors) {
      return [tInvoiceErrors("validation.message")];
    }
    return validationMessages;
  }, [hasFieldValidationErrors, validationMessages, tInvoiceErrors]);

  const generationErrorAlert = useMemo(() => {
    if (!generationTechnicalError) return null;
    return getFriendlyGenerationErrorContent(generationTechnicalError, tInvoiceErrors, {
      draftFailure: true,
    });
  }, [generationTechnicalError, tInvoiceErrors]);

  const applyValidationErrors = useCallback(
    (errorList: string[]) => {
      const nextFieldErrors: InvoiceFieldErrors = {};
      const genericErrors: string[] = [];

      for (const key of errorList) {
        const field = VALIDATION_ERROR_TO_FIELD[key];
        if (field) {
          nextFieldErrors[field] = key;
        } else {
          genericErrors.push(translateValidationMessage(key));
        }
      }

      setFieldErrors(nextFieldErrors);
      setErrors(genericErrors);
      if (Object.keys(nextFieldErrors).length > 0) {
        focusFirstInvalidField(nextFieldErrors);
      }
    },
    [translateValidationMessage]
  );

  function updateField<K extends keyof InvoiceFormData>(field: K, value: InvoiceFormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "bank_name" || field === "iban" || field === "bic") {
        setSelectedBankAccountId(
          matchBankAccountId(bankAccounts, next.bank_name, next.iban, next.bic)
        );
      }
      return next;
    });
    if (field === "service_period_start" || field === "service_period_end") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.service_period_start;
        delete next.service_period_end;
        return next;
      });
    } else if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleBankAccountSelect(accountId: string) {
    setSelectedBankAccountId(accountId);
    if (!accountId) return;

    const account = bankAccounts.find((item) => item.id === accountId);
    if (!account) return;

    setForm((prev) => ({
      ...prev,
      bank_name: account.bank_name,
      account_holder: account.account_holder || "",
      iban: account.iban,
      bic: account.bic || "",
    }));
  }

  function handleCustomerSelect(customerId: string) {
    const customer = customerId
      ? customers.find((c) => c.id === customerId)
      : undefined;

    if (!customer) {
      setForm((prev) => ({ ...prev, customer_id: customerId }));
      return;
    }

    const address = customerToInvoiceAddressFields(customer);
    const paymentDeadline = paymentDeadlineFromCustomer(customer);
    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customerDisplayName(customer),
      customer_address: address.customer_address,
      customer_zip: address.customer_zip,
      customer_city: address.customer_city,
      customer_country: address.customer_country,
      currency: resolveInvoiceCurrency(customer.default_currency),
      payment_deadline: paymentDeadline || prev.payment_deadline,
      payment_terms: paymentTermsFromCustomer(customer, prev.payment_terms),
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.customer_name;
      return next;
    });
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setGenerationTechnicalError("");
    setSaving(true);

    const payload = normalizeInvoiceFormData(form);
    const result = await persistInvoice(payload);
    if (!result.success) {
      if (result.errors?.length) {
        applyValidationErrors(result.errors);
      } else {
        setErrors([tValidation("saveFailed")]);
      }
      setSaving(false);
      return;
    }

    if (result.data?.invoice_number) {
      setForm((prev) => ({ ...prev, invoice_number: result.data!.invoice_number }));
    }

    if (mode === "create" && result.data && "id" in result.data) {
      router.push(`/invoices/${result.data.id}`);
    } else {
      router.refresh();
    }
    setSaving(false);
  }

  const applySuccessFromSnapshot = useCallback(
    (data: InvoiceGenerationStatusPayload) => {
      clearGenerateRequestGuard();
      setGenerationSessionPhase("idle");
      setGenerating(false);
      setGenerateCompletionSnapshot(null);
      setGenerationTechnicalError("");

      // Navigate only after explicit user action (View result).
      router.push(`/invoices/${data.id}`);
      router.refresh();
    },
    [clearGenerateRequestGuard, router]
  );

  const handleGenerationFailed = useCallback((error: string) => {
    if (!shouldPreserveGenerateRequestGuard(error)) {
      clearGenerateRequestGuard();
    } else {
      setBackgroundStatusReconciliation(true);
    }

    setGenerationTechnicalError(error);
    setGenerating(false);
  }, [clearGenerateRequestGuard, shouldPreserveGenerateRequestGuard]);

  useEffect(() => {
    if (!backgroundStatusReconciliation || !progressInvoiceId || !generateRequestInFlight) {
      return;
    }

    const invoiceId = progressInvoiceId;
    let cancelled = false;

    const scheduleNextCheck = () => {
      if (cancelled) {
        return;
      }

      if (backgroundReconcileTimerRef.current) {
        clearTimeout(backgroundReconcileTimerRef.current);
      }

      backgroundReconcileTimerRef.current = setTimeout(() => {
        void runBackgroundStatusCheck();
      }, BACKGROUND_STATUS_INTERVAL_MS);
    };

    async function runBackgroundStatusCheck() {
      if (cancelled) {
        return;
      }

      const status = await fetchInvoiceGenerationStatus(invoiceId);
      if (cancelled) {
        return;
      }

      if (!status) {
        scheduleNextCheck();
        return;
      }

      if (isTerminalGenerationSuccess(status) || isGenerationStatusComplete(status)) {
        // While the progress modal session is visible, feed the modal — never auto-close/navigate.
        if (isGenerationSessionVisible(generationSessionPhase)) {
          const snapshot =
            mergeGenerateResults(null, status, { preferSecondForCompletion: true }) ?? status;
          setGenerateCompletionSnapshot({
            ...snapshot,
            generation_status: snapshot.generation_status ?? "COMPLETED",
            generation_step: snapshot.generation_step ?? "COMPLETED",
          });
          setBackgroundStatusReconciliation(false);
          return;
        }

        setBackgroundStatusReconciliation(false);
        const snapshot =
          mergeGenerateResults(null, status, { preferSecondForCompletion: true }) ?? status;
        applySuccessFromSnapshot({
          ...snapshot,
          generation_status: "COMPLETED",
          generation_step: "COMPLETED",
        });
        return;
      }

      if (status.generation_status === "FAILED") {
        setBackgroundStatusReconciliation(false);
        handleGenerationFailed(status.generation_error?.trim() || "UNKNOWN_GENERATION_ERROR");
        return;
      }

      if (isGenerationActive(status.workflow_status, status.generation_status)) {
        scheduleNextCheck();
        return;
      }

      setBackgroundStatusReconciliation(false);
    }

    void runBackgroundStatusCheck();

    return () => {
      cancelled = true;
      if (backgroundReconcileTimerRef.current) {
        clearTimeout(backgroundReconcileTimerRef.current);
        backgroundReconcileTimerRef.current = null;
      }
    };
  }, [
    backgroundStatusReconciliation,
    progressInvoiceId,
    generateRequestInFlight,
    generationSessionPhase,
    applySuccessFromSnapshot,
    handleGenerationFailed,
  ]);

  const resumeExistingGeneration = useCallback(
    (
      invoiceId: string,
      payload?: InvoiceFormData,
      status?: Pick<InvoiceGenerationStatusPayload, "generation_status" | "generation_step"> | Invoice | null
    ) => {
      if (payload) {
        generatePayloadRef.current = payload;
      }

      setGenerationTechnicalError("");
      setGenerating(false);
      setGenerateCompletionSnapshot(null);
      setProgressInitialStatus(resolveProgressInitialStatus(status ?? initialData));
      setProgressAttempt((attempt) => attempt + 1);
      setProgressInvoiceId(invoiceId);
      setGenerationSessionPhase("running");
      generateRequestInFlightRef.current = invoiceId;
      setGenerateRequestInFlight(true);
    },
    [initialData]
  );

  async function startGenerateRequest(id: string, payload: InvoiceFormData) {
    if (generateRequestInFlightRef.current === id) {
      resumeExistingGeneration(id, payload);
      return;
    }

    const currentStatus = await fetchInvoiceGenerationStatus(id);
    if (!currentStatus) {
      setGenerationTechnicalError(GENERATION_STATUS_VERIFY_FAILED_MESSAGE);
      setGenerating(false);
      return;
    }

    if (isGenerationActive(currentStatus.workflow_status, currentStatus.generation_status)) {
      resumeExistingGeneration(id, payload, currentStatus);
      return;
    }

    generateRequestInFlightRef.current = id;
    setGenerateRequestInFlight(true);

    try {
      const response = await fetch(`/api/invoices/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as InvoiceGenerateApiResponse & {
        uncertain?: boolean;
        check_generation_status?: boolean;
        error_code?: string;
      };

      if (response.ok && isGenerateApiSuccess(data)) {
        const normalized = normalizeGenerateApiResult(id, data);

        setGenerationTechnicalError("");
        const refetched = await fetchInvoiceGenerationStatus(id);
        const snapshot = mergeGenerateResults(refetched, normalized, {
          preferSecondForCompletion: true,
        }) ?? normalized;
        if (process.env.NODE_ENV === "development") {
          console.debug("[generate] completed", {
            invoice_number: snapshot.invoice_number,
            generation_status: snapshot.generation_status,
            workflow_status: snapshot.workflow_status,
            pdf_url: snapshot.pdf_url,
            docx_url: snapshot.docx_url,
          });
        }
        setGenerateCompletionSnapshot(snapshot);
        return;
      }

      if (!response.ok) {
        if (data.uncertain === true && data.check_generation_status === true) {
          setBackgroundStatusReconciliation(true);
          return;
        }

        if (data.error_code === "N8N_WEBHOOK_UNAVAILABLE") {
          setGenerationTechnicalError(data.generation_error || data.error || "UNKNOWN_GENERATION_ERROR");
          setGenerating(false);
          setGenerationSessionPhase((phase) =>
            isGenerationSessionVisible(phase) ? "failed" : phase
          );
          clearGenerateRequestGuard();
          return;
        }

        if (data.errors?.length) {
          applyValidationErrors(data.errors);
          setGenerationSessionPhase("idle");
        } else {
          setGenerationTechnicalError(
            data.generation_error || data.workflow_error || data.error || "UNKNOWN_GENERATION_ERROR"
          );
          setGenerationSessionPhase((phase) =>
            isGenerationSessionVisible(phase) ? "failed" : phase
          );
        }
        setGenerating(false);
        clearGenerateRequestGuard();
        return;
      }

      setGenerationTechnicalError("UNKNOWN_GENERATION_ERROR");
      setGenerating(false);
      clearGenerateRequestGuard();
    } catch {
      setGenerationTechnicalError("UNKNOWN_GENERATION_ERROR");
      setGenerating(false);
    }
  }

  async function handleGenerate() {
    setErrors([]);
    setGenerationTechnicalError("");
    setGenerateCompletionSnapshot(null);

    const validationErrors = getInvoiceFieldErrors(normalizeInvoiceFormData(form), {
      requirePaymentDeadline: true,
    });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      focusFirstInvalidField(validationErrors);
      return;
    }

    const payload = normalizeInvoiceFormData(form);
    const existingId = resolveEditInvoiceId();

    if (existingId) {
      const liveStatus = await fetchInvoiceGenerationStatus(existingId);
      if (!liveStatus) {
        setGenerationTechnicalError(GENERATION_STATUS_VERIFY_FAILED_MESSAGE);
        return;
      }

      if (isGenerationActive(liveStatus.workflow_status, liveStatus.generation_status)) {
        resumeExistingGeneration(existingId, payload, liveStatus);
        return;
      }
    }

    setGenerating(true);

    if (existingId) {
      setProgressAttempt((attempt) => attempt + 1);
      setProgressInvoiceId(existingId);
      setGenerationSessionPhase("running");
    }

    const saveResult = await persistInvoice(payload);
    if (!saveResult.success) {
      if (saveResult.errors?.length) {
        applyValidationErrors(saveResult.errors);
      } else {
        setErrors([tValidation("saveFailed")]);
      }
      setGenerationSessionPhase("idle");
      setGenerating(false);
      return;
    }

    const savedInvoice =
      saveResult.data && "net_amount" in saveResult.data
        ? saveResult.data
        : null;

    if (saveResult.data?.invoice_number) {
      setForm((prev) => ({ ...prev, invoice_number: saveResult.data!.invoice_number }));
    }

    const id =
      savedInvoice?.id ??
      existingId ??
      (saveResult.data && "id" in saveResult.data ? saveResult.data.id : undefined);
    if (!id) {
      setErrors([t("invoiceSaveFailed")]);
      setGenerationSessionPhase("idle");
      setGenerating(false);
      return;
    }

    const generatePayload = savedInvoice
      ? mergeSavedInvoiceIntoFormPayload(payload, savedInvoice)
      : payload;

    generatePayloadRef.current = generatePayload;

    if (!existingId) {
      setProgressAttempt((attempt) => attempt + 1);
      setProgressInvoiceId(id);
      setGenerationSessionPhase("running");
    }

    setGenerating(false);
    void startGenerateRequest(id, generatePayload);
  }

  const progressModal = (
    <InvoiceGenerationProgressModal
      key={progressSessionKey}
      open={progressOpen}
      sessionKey={progressSessionKey}
      sessionPhase={generationSessionPhase}
      invoiceId={progressInvoiceId}
      invoiceNumber={form.invoice_number}
      customerName={form.customer_name}
      initialStatus={progressInitialStatus}
      externalCompletion={generateCompletionSnapshot}
      onSessionPhaseChange={setGenerationSessionPhase}
      onCompleted={applySuccessFromSnapshot}
      onFailed={handleGenerationFailed}
      onClose={() => {
        setGenerationSessionPhase("idle");
        setGenerating(false);
        clearGenerateRequestGuard();
      }}
      onRetry={() => {
        if (!progressInvoiceId || !generatePayloadRef.current) return;
        setGenerateCompletionSnapshot(null);
        setGenerationTechnicalError("");
        setGenerationSessionPhase("running");
        setProgressAttempt((attempt) => attempt + 1);
        const retryPayload = normalizeInvoiceFormData(form);
        generatePayloadRef.current = retryPayload;
        void startGenerateRequest(progressInvoiceId, retryPayload);
      }}
    />
  );

  const previewYear = form.invoice_date
    ? new Date(form.invoice_date).getFullYear()
    : new Date().getFullYear();
  const invoiceNumberDisplay = form.invoice_number.trim()
    ? form.invoice_number
    : t("autoGenerated");
  const previewInvoiceNumber = form.invoice_number.trim() || t("automatic");
  const previewCustomerAddress = composeInvoiceCustomerAddress({
    customer_address: form.customer_address,
    customer_zip: form.customer_zip,
    customer_city: form.customer_city,
    customer_country: form.customer_country,
  });
  const previewCurrency = resolveInvoiceCurrency(normalizedForm.currency);
  const previewNetAmount =
    amounts.net_amount > 0 ? formatGermanCurrencyDisplay(amounts.net_amount, previewCurrency) : null;
  const previewTotalFormatted =
    previewTotalAmount > 0 ? formatGermanCurrencyDisplay(previewTotalAmount, previewCurrency) : null;
  const previewServiceDescription = normalizedForm.service_description;
  const previewServicePeriod = formatServicePeriod(
    normalizedForm.service_period_start,
    normalizedForm.service_period_end
  );

  const formBody = (
    <Box
      component="form"
      onSubmit={handleSaveDraft}
      autoComplete="off"
      data-lpignore="true"
      data-form-type="other"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" },
        gap: { xs: 2.5, lg: 3 },
        alignItems: "start",
      }}
    >
      <Stack spacing={2.25}>
        {validationAlertMessages.length > 0 ? (
          <FormValidationAlert
            title={tInvoiceErrors("validation.title")}
            messages={validationAlertMessages}
          />
        ) : null}
        {generationErrorAlert ? (
          <InvoiceErrorAlert
            title={generationErrorAlert.title}
            messages={[generationErrorAlert.message]}
            technicalDetails={generationErrorAlert.technicalDetails}
            technicalDetailsLabel={tInvoiceErrors("technicalDetails")}
            technicalErrorsDisplay={technicalErrorsDisplay}
            tone="info"
          />
        ) : null}

        <SectionCard
          id="invoice-section-rechnungsdaten"
          step={1}
          title={t("invoiceData")}
          subtitle={t("invoiceDataSubtitle")}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t("invoiceDate")}
                type="date"
                name="invoice_date"
                value={form.invoice_date}
                onChange={(e) => updateField("invoice_date", e.target.value)}
                error={Boolean(fieldErrors.invoice_date)}
                helperText={translateFieldError(fieldErrors.invoice_date)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t("invoiceTitle")}
                name="invoice_title"
                value={form.invoice_title}
                onChange={(e) => updateField("invoice_title", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <ServicePeriodFieldGroup
                start={form.service_period_start}
                end={form.service_period_end}
                startError={translateFieldError(fieldErrors.service_period_start)}
                endError={translateFieldError(fieldErrors.service_period_end)}
                onStartChange={(value) => updateField("service_period_start", value)}
                onEndChange={(value) => updateField("service_period_end", value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <InvoiceNumberField value={invoiceNumberDisplay} formatHint={`${previewYear}-0001`} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <ImsSelect
                label={tCommon("invoiceLanguage")}
                name="invoice_language"
                value={form.invoice_language}
                onChange={(value) => updateField("invoice_language", value)}
                options={[
                  { value: "en", label: tCommon("english") },
                  { value: "de", label: tCommon("german") },
                ]}
              />
              <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mt: 0.75 }}>
                {tCommon("invoiceLanguageHint")}
              </Typography>
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          id="invoice-section-kunde"
          step={2}
          title={t("customer")}
          subtitle={t("customer")}
          action={
            <Button
              component={Link}
              href="/customers/new"
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              sx={{ borderColor: imsColors.border, color: imsColors.textDark, fontWeight: 700 }}
            >
              {tCustomers("newCustomer")}
            </Button>
          }
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                label={t("searchOrSelectCustomer")}
                name="customer_id"
                value={form.customer_id}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                slotProps={{ select: { MenuProps: imsSelectMenuProps } }}
              >
                <MenuItem value="">{t("enterManually")}</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {customerDisplayName(c)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t("customerNameField")}
                required
                name="customer_name"
                value={form.customer_name}
                onChange={(e) => updateField("customer_name", e.target.value)}
                error={Boolean(fieldErrors.customer_name)}
                helperText={translateFieldError(fieldErrors.customer_name)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={t("customerSalutation")}
                name="customer_salutation"
                value={form.customer_salutation}
                onChange={(e) => updateField("customer_salutation", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={tAddress("streetAndNumber")}
                name="customer_address"
                value={form.customer_address}
                onChange={(e) => updateField("customer_address", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label={tAddress("postalCode")}
                name="customer_zip"
                value={form.customer_zip}
                onChange={(e) => updateField("customer_zip", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label={tAddress("city")}
                name="customer_city"
                value={form.customer_city}
                onChange={(e) => updateField("customer_city", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={tAddress("country")}
                name="customer_country"
                value={form.customer_country}
                onChange={(e) => updateField("customer_country", e.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          id="invoice-section-leistungen"
          step={3}
          title={t("services")}
          subtitle={t("serviceDescription")}
        >
          <Stack spacing={2.75}>
            <Stack spacing={0.75}>
              <TextField
                label={t("serviceDescription")}
                required
                name="service_description"
                value={form.service_description}
                onChange={(e) => updateField("service_description", e.target.value)}
                error={Boolean(fieldErrors.service_description)}
                helperText={
                  translateFieldError(fieldErrors.service_description) || t("serviceDescriptionHint")
                }
                multiline
                minRows={5}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
              {!fieldErrors.service_description ? (
                <Typography
                  sx={{
                    fontSize: 12,
                    color: imsColors.textMuted,
                    textAlign: "right",
                    mt: -0.5,
                  }}
                >
                  {form.service_description.length}/2000
                </Typography>
              ) : null}
            </Stack>

            <Box
              sx={{
                borderRadius: "14px",
                border: `1px solid ${imsColors.border}`,
                bgcolor: "#fafbfc",
                p: { xs: 1.75, md: 2 },
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: imsColors.textDark, mb: 1.75 }}>
                {t("amountNet")}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gap: 2.5,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(0, 1fr) minmax(220px, 360px)",
                  },
                  alignItems: "start",
                }}
              >
                <TextField
                  label={t("amountNet")}
                  type="number"
                  required
                  slotProps={{ htmlInput: { step: "0.01", min: 0 } }}
                  name="amount_net"
                  value={form.amount_net}
                  onChange={(e) => updateField("amount_net", e.target.value)}
                  error={Boolean(fieldErrors.amount_net)}
                  helperText={translateFieldError(fieldErrors.amount_net) || t("netAmountHint")}
                  fullWidth
                  sx={{ "& .MuiInputBase-root": { minHeight: imsInputHeight } }}
                />
                <TextField
                  select
                  label={t("currency")}
                  name="currency"
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  fullWidth
                  sx={{ "& .MuiInputBase-root": { minHeight: imsInputHeight } }}
                  slotProps={{ select: { MenuProps: imsSelectMenuProps } }}
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {tCurrency(option.value as "EUR" | "USD" | "GBP" | "CHF")}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            <Box
              sx={{
                borderRadius: "14px",
                border: `1px solid ${imsColors.border}`,
                bgcolor: "#fcfdfb",
                p: { xs: 1.75, md: 2 },
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: imsColors.textDark, mb: 1.75 }}>
                {t("totals")}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TotalsSummaryField
                    label={t("netTotal")}
                    value={
                      amounts.net_amount > 0
                        ? formatCurrency(amounts.net_amount, form.currency || "EUR")
                        : "—"
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TotalsSummaryField
                    label={t("taxAmount")}
                    value={
                      amounts.net_amount > 0
                        ? formatCurrency(amounts.vat_amount, form.currency || "EUR")
                        : "—"
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TotalsSummaryField
                    label={t("totalAmount")}
                    value={
                      amounts.gross_amount > 0
                        ? formatCurrency(amounts.gross_amount, form.currency || "EUR")
                        : "—"
                    }
                    primary
                  />
                </Grid>
              </Grid>
            </Box>

            <Typography sx={{ fontSize: 12.5, color: imsColors.textMuted, fontStyle: "italic" }}>
              {t("multipleLineItemsLater")}
            </Typography>
          </Stack>
        </SectionCard>

        <SectionCard
          id="invoice-section-zahlung"
          step={4}
          title={t("paymentAndBank")}
          subtitle={t("paymentAndBankSubtitle")}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={t("paymentDeadline")}
                type="date"
                required
                name="payment_deadline"
                value={form.payment_deadline}
                onChange={(e) => updateField("payment_deadline", e.target.value)}
                error={Boolean(fieldErrors.payment_deadline)}
                helperText={translateFieldError(fieldErrors.payment_deadline)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                label={t("bankAccount")}
                name="bank_account_id"
                value={selectedBankAccountId}
                onChange={(e) => handleBankAccountSelect(e.target.value)}
                slotProps={{ select: { MenuProps: imsSelectMenuProps } }}
              >
                <MenuItem value="">{t("enterManually")}</MenuItem>
                {bankAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.is_default
                      ? `${account.label} ${t("defaultAccountSuffix")}`
                      : account.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={tSettings("taxNumber")}
                name="tax_number"
                value={form.tax_number}
                onChange={(e) => updateField("tax_number", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={tBank("iban")}
                name="iban"
                value={form.iban}
                onChange={(e) => updateField("iban", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={tBank("bankName")}
                name="bank_name"
                value={form.bank_name}
                onChange={(e) => updateField("bank_name", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={tBank("accountHolder")}
                name="account_holder"
                value={form.account_holder}
                onChange={(e) => updateField("account_holder", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label={tBank("bic")}
                name="bic"
                value={form.bic}
                onChange={(e) => updateField("bic", e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.small_business_rule}
                    onChange={(e) => updateField("small_business_rule", e.target.checked)}
                    name="small_business_rule"
                  />
                }
                label={t("smallBusinessCheckbox")}
              />
              {form.small_business_rule ? (
                <Alert severity="info" sx={{ mt: 1, bgcolor: imsColors.primaryLight }}>
                  {t("smallBusiness")}
                </Alert>
              ) : null}
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          id="invoice-section-pruefung"
          step={5}
          title={t("optionalNotes")}
          subtitle={t("optionalNotesSubtitle")}
        >
          <TextField
            label={t("note")}
            name="optional_notes"
            value={form.optional_notes}
            onChange={(e) => updateField("optional_notes", e.target.value)}
            multiline
            minRows={4}
            helperText={`${form.optional_notes.length}/1000`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </SectionCard>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between" }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <ImsButton type="submit" imsVariant="secondary" loading={saving}>
              {saving ? tCommon("saving") : tButtons("saveDraft")}
            </ImsButton>
            <ImsButton imsVariant="ghost" onClick={() => router.back()}>
              {tButtons("cancel")}
            </ImsButton>
          </Stack>
          <ImsButton
            type="button"
            endIcon={<ArrowForwardIcon />}
            onClick={handleGenerate}
            disabled={!canGenerate || generating || progressOpen || generateRequestInFlight}
            loading={generating}
          >
            {generating
              ? t("generating")
              : hasFailedDraftGeneration
                ? t("retryDocumentGeneration")
                : mode === "create"
                  ? t("continueToReview")
                  : tButtons("createInvoice")}
          </ImsButton>
        </Stack>
      </Stack>

      <Stack
        spacing={2}
        sx={{
          position: { lg: "sticky" },
          top: { lg: 16 },
          alignSelf: "start",
        }}
      >
        <InvoicePreviewCard
          invoiceNumber={previewInvoiceNumber}
          invoiceDate={normalizedForm.invoice_date ? formatGermanDate(normalizedForm.invoice_date) : "—"}
          servicePeriod={previewServicePeriod || null}
          customerName={normalizedForm.customer_name || "—"}
          customerAddress={previewCustomerAddress || undefined}
          serviceDescription={previewServiceDescription || undefined}
          netAmount={previewNetAmount}
          taxAmount={
            !form.small_business_rule && previewTaxAmount > 0
              ? formatGermanCurrencyDisplay(previewTaxAmount, previewCurrency)
              : null
          }
          showTax={!form.small_business_rule}
          totalAmount={previewTotalFormatted}
          paymentDeadline={
            normalizedForm.payment_deadline ? formatGermanDate(normalizedForm.payment_deadline) : "—"
          }
        />
        <InvoiceFormSidebar ready={canGenerate} items={readinessItems} />
      </Stack>
    </Box>
  );

  if (mode === "create") {
    return (
      <>
        {progressModal}
        <PageShell
        breadcrumbs={[
          { label: tNav("invoices"), href: "/invoices" },
          { label: t("newInvoice") },
        ]}
        title={t("newInvoice")}
        subtitle={t("newInvoiceSubtitle")}
        showDraftSave
        onSaveDraft={() => {
          void handleSaveDraft({ preventDefault: () => undefined } as React.FormEvent);
        }}
        savingDraft={saving}
      >
        <Stack spacing={2.5}>
          <StepIndicator
            activeStep={visibleStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
          <ClientOnly fallback={<Box sx={{ minHeight: 720 }} aria-hidden />}>{formBody}</ClientOnly>
        </Stack>
      </PageShell>
      </>
    );
  }

  return (
    <>
      {progressModal}
      <Stack spacing={2}>
      <Typography variant="h5">{t("editInvoice")}</Typography>
      <ClientOnly fallback={<Box sx={{ minHeight: 720 }} aria-hidden />}>{formBody}</ClientOnly>
    </Stack>
    </>
  );
}

function ServicePeriodFieldGroup({
  start,
  end,
  startError,
  endError,
  onStartChange,
  onEndChange,
}: {
  start: string;
  end: string;
  startError?: string;
  endError?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  const t = useTranslations("invoice");

  return (
    <Box
      sx={{
        border: `1px solid ${imsColors.border}`,
        borderRadius: "18px",
        bgcolor: "#fcfdfb",
        p: 2,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1.5 }}>
        {t("servicePeriod")}
        <Box component="span" sx={{ color: "#d92d20" }}>
          {" "}
          *
        </Box>
      </Typography>
      <Grid container spacing={2} sx={{ alignItems: "center" }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            name="service_period_start"
            label={t("servicePeriodStart")}
            type="date"
            required
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            error={Boolean(startError)}
            helperText={startError}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }} sx={{ display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
          <Typography color="text.secondary">→</Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            name="service_period_end"
            label={t("servicePeriodEnd")}
            type="date"
            required
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            error={Boolean(endError)}
            helperText={endError}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </Grid>
      </Grid>
      <Typography variant="body2" sx={{ mt: 1.5 }}>
        {t("servicePeriodHint")}
      </Typography>
    </Box>
  );
}

function InvoiceNumberField({ value, formatHint }: { value: string; formatHint: string }) {
  const t = useTranslations("invoice");

  return (
    <Box
      sx={{
        border: `1px solid ${imsColors.border}`,
        borderRadius: "18px",
        bgcolor: imsColors.primaryLight,
        p: 2,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{t("invoiceNumber")}</Typography>
      <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{value}</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {t("formatLabel")}: {formatHint}
      </Typography>
      <Alert severity="info" sx={{ mt: 1.5, bgcolor: "#fff", border: `1px solid ${imsColors.border}` }}>
        {t("invoiceNumberAutoHint")}
      </Alert>
    </Box>
  );
}

function TotalsSummaryField({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: imsColors.textMuted }}>
        {label}
      </Typography>
      <Box
        sx={{
          minHeight: imsInputHeight,
          borderRadius: "12px",
          border: `1px solid ${imsColors.border}`,
          bgcolor: primary ? imsColors.primaryLight : "#f9fbf8",
          px: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: primary ? 16 : 14,
            color: primary ? imsColors.primary : imsColors.textDark,
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}
