"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, ButtonBase, CircularProgress } from "@mui/material";
import { ImsConfirmDialog } from "@/components/forms/ims";
import {
  archiveInvoice,
  cancelInvoice,
  duplicateInvoiceAction,
} from "@/lib/actions/invoice-admin";
import {
  canArchiveInvoice,
  canCancelInvoice,
  canDuplicateInvoice,
} from "@/lib/invoice-lifecycle";
import type { Invoice } from "@/lib/types/database";
import { designTokens } from "@/theme/designTokens";
import { imsColors } from "@/theme/imsTheme";

type ConfirmAction = "archive" | "cancel" | null;

interface InvoiceTableRowOverlayProps {
  invoice: Invoice;
}

export function InvoiceTableRowOverlay({ invoice }: InvoiceTableRowOverlayProps) {
  const router = useRouter();
  const t = useTranslations("invoice");
  const tDialogs = useTranslations("dialogs");
  const tValidation = useTranslations("validation");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [loading, setLoading] = useState(false);

  const showDuplicate = canDuplicateInvoice(invoice);
  const showCancel = canCancelInvoice(invoice);
  const showArchive = canArchiveInvoice(invoice);

  function getConfirmCopy(action: Exclude<ConfirmAction, null>) {
    if (action === "archive") {
      return {
        title: tDialogs("archiveTitle"),
        message: tDialogs("archiveMessage"),
        confirmLabel: tDialogs("archiveConfirm"),
        danger: false,
      };
    }
    return {
      title: tDialogs("cancelTitle"),
      message: tDialogs("cancelMessage"),
      confirmLabel: tDialogs("cancelConfirm"),
      danger: true,
    };
  }

  async function runConfirmedAction() {
    if (!confirmAction) return;
    setLoading(true);
    try {
      if (confirmAction === "archive") {
        const result = await archiveInvoice(invoice.id);
        if (!result.success) alert(result.errors?.[0] || tValidation("archiveFailed"));
      } else if (confirmAction === "cancel") {
        const result = await cancelInvoice(invoice.id);
        if (!result.success) alert(result.errors?.[0] || tValidation("cancelFailed"));
      }
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  }

  async function handleDuplicate() {
    setLoading(true);
    const result = await duplicateInvoiceAction(invoice.id);
    setLoading(false);
    if (!result.success) {
      alert(result.errors?.[0] || tValidation("duplicateFailed"));
      return;
    }
    if (result.data && "id" in result.data) {
      router.replace(`/invoices/${result.data.id}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  const confirmCopy = confirmAction ? getConfirmCopy(confirmAction) : null;

  const actions: Array<{
    key: string;
    label: string;
    tone: "default" | "danger";
    onClick: () => void;
  }> = [
    {
      key: "view",
      label: t("rowOverlayView"),
      tone: "default",
      onClick: () => router.push(`/invoices/${invoice.id}`),
    },
  ];

  if (showDuplicate) {
    actions.push({
      key: "duplicate",
      label: t("rowOverlayDuplicate"),
      tone: "default",
      onClick: () => {
        void handleDuplicate();
      },
    });
  }

  if (showCancel) {
    actions.push({
      key: "cancel",
      label: t("rowOverlayCancel"),
      tone: "danger",
      onClick: () => setConfirmAction("cancel"),
    });
  }

  if (showArchive) {
    actions.push({
      key: "archive",
      label: t("rowOverlayArchive"),
      tone: "danger",
      onClick: () => setConfirmAction("archive"),
    });
  }

  return (
    <>
      <Box
        className="invoice-row-overlay"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          px: 3.5,
          py: 1.25,
          transition: `opacity ${designTokens.transition.fast}, visibility ${designTokens.transition.fast}`,
          background:
            "linear-gradient(90deg, rgba(247,250,245,0.72) 0%, rgba(255,255,255,0.88) 50%, rgba(247,250,245,0.72) 100%)",
          "@media (max-width: 1024px)": {
            justifyContent: "flex-start",
            pl: "28px",
            pr: "28px",
            py: 1.5,
          },
        }}
      >
        {loading ? (
          <CircularProgress size={22} thickness={4} sx={{ color: imsColors.primary }} />
        ) : (
          <Box
            role="group"
            aria-label={t("rowOverlayActions")}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              columnGap: { xs: 1.25, sm: 1.75 },
              rowGap: { xs: 1, sm: 1.25 },
              maxWidth: "100%",
              "@media (max-width: 1024px)": {
                justifyContent: "flex-start",
              },
            }}
          >
            {actions.map((action) => {
              const isDanger = action.tone === "danger";
              return (
                <ButtonBase
                  key={action.key}
                  focusRipple
                  disabled={loading}
                  onClick={(event) => {
                    event.stopPropagation();
                    action.onClick();
                  }}
                  sx={{
                    minHeight: 40,
                    px: 1.75,
                    py: 1,
                    borderRadius: "10px",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    color: isDanger ? "#9f2d23" : imsColors.primaryDark,
                    bgcolor: isDanger ? "rgba(255,248,247,0.96)" : "rgba(255,255,255,0.96)",
                    border: `1px solid ${
                      isDanger ? "rgba(159,45,35,0.18)" : "rgba(90,120,80,0.22)"
                    }`,
                    boxShadow: designTokens.shadow.soft,
                    transition: `background-color ${designTokens.transition.fast}, transform ${designTokens.transition.fast}, box-shadow ${designTokens.transition.fast}`,
                    "&:hover": {
                      bgcolor: isDanger ? "#FFF5F4" : "#FFFFFF",
                      boxShadow: isDanger
                        ? "0 4px 14px rgba(159, 45, 35, 0.1)"
                        : "0 4px 14px rgba(40, 70, 35, 0.12)",
                      transform: "translateY(-1px)",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${isDanger ? "#c15b52" : imsColors.primary}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  {action.label}
                </ButtonBase>
              );
            })}
          </Box>
        )}
      </Box>

      {confirmCopy ? (
        <ImsConfirmDialog
          open
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.confirmLabel}
          danger={confirmCopy.danger}
          loading={loading}
          onConfirm={runConfirmedAction}
          onClose={() => !loading && setConfirmAction(null)}
        />
      ) : null}
    </>
  );
}
