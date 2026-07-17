"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import {
  ArchiveOutlinedIcon,
  BlockOutlinedIcon,
  ContentCopyOutlinedIcon,
  DeleteOutlinedIcon,
  DescriptionOutlinedIcon,
  MoreHorizIcon,
  OpenInNewIcon,
  PictureAsPdfOutlinedIcon,
  RefreshOutlinedIcon,
  VisibilityOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ImsConfirmDialog } from "@/components/forms/ims";
import { imsMenuPaperSx } from "@/components/forms/ims/imsStyles";
import {
  archiveInvoice,
  buildRegeneratePayload,
  cancelInvoice,
  deleteDraftInvoice,
  duplicateInvoiceAction,
} from "@/lib/actions/invoice-admin";
import {
  canArchiveInvoice,
  canCancelInvoice,
  canDeleteInvoice,
  canDuplicateInvoice,
  canRegenerateInvoice,
  canRetryDocumentGeneration,
} from "@/lib/invoice-lifecycle";
import { invoiceGoogleDocUrl, invoicePdfUrl } from "@/lib/invoice-form";
import { normalizeInvoiceFormData } from "@/lib/invoice-form";
import { fetchInvoiceGenerationStatus } from "@/lib/invoice-generation-client";
import { isGenerationActive } from "@/lib/generation-status";
import { getFriendlyGenerationErrorContent } from "@/lib/invoice-errors";
import type { Invoice } from "@/lib/types/database";
import { imsColors } from "@/theme/imsTheme";

import type { ReactNode } from "react";

type ConfirmAction = "archive" | "cancel" | "delete" | "deleteDrive" | "regenerate" | "retryGeneration" | null;

const GENERATION_ALREADY_RUNNING_MESSAGE =
  "Invoice generation is already running. Please wait for the current run to finish.";

const GENERATION_STATUS_VERIFY_FAILED_MESSAGE =
  "Could not verify the current generation status. Please try again.";

interface InvoiceRowActionsMenuProps {
  invoice: Invoice;
  hideOpenInvoice?: boolean;
  hideDuplicate?: boolean;
  trigger?: (props: { onClick: (event: React.MouseEvent<HTMLElement>) => void; disabled: boolean }) => ReactNode;
}

export function InvoiceRowActionsMenu({
  invoice,
  hideOpenInvoice = false,
  hideDuplicate = false,
  trigger,
}: InvoiceRowActionsMenuProps) {
  const router = useRouter();
  const t = useTranslations("invoice");
  const tDialogs = useTranslations("dialogs");
  const tValidation = useTranslations("validation");
  const tInvoiceErrors = useTranslations("invoiceErrors");
  const tCommon = useTranslations("common");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [loading, setLoading] = useState(false);

  const googleUrl = invoiceGoogleDocUrl(invoice);
  const pdfUrl = invoicePdfUrl(invoice);
  const open = Boolean(anchorEl);

  function closeMenu() {
    setAnchorEl(null);
  }

  function getConfirmCopy(action: Exclude<ConfirmAction, null>): {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
  } {
    const map = {
      archive: {
        title: tDialogs("archiveTitle"),
        message: tDialogs("archiveMessage"),
        confirmLabel: tDialogs("archiveConfirm"),
      },
      cancel: {
        title: tDialogs("cancelTitle"),
        message: tDialogs("cancelMessage"),
        confirmLabel: tDialogs("cancelConfirm"),
        danger: true as const,
      },
      delete: {
        title: tDialogs("deleteDraftTitle"),
        message: tDialogs("deleteDraftMessage"),
        confirmLabel: tDialogs("deleteDraftConfirm"),
        danger: true as const,
      },
      deleteDrive: {
        title: tDialogs("deleteDraftWithDocsTitle"),
        message: tDialogs("deleteDraftWithDocsMessage"),
        confirmLabel: tDialogs("deleteDraftWithDocsConfirm"),
        danger: true as const,
      },
      regenerate: {
        title: tDialogs("regenerateTitle"),
        message: tDialogs("regenerateMessage"),
        confirmLabel: tDialogs("regenerateConfirm"),
      },
      retryGeneration: {
        title: tDialogs("retryGenerationTitle"),
        message: tDialogs("retryGenerationMessage"),
        confirmLabel: tDialogs("retryGenerationConfirm"),
      },
    };
    return map[action];
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
      } else if (confirmAction === "delete") {
        const result = await deleteDraftInvoice(invoice.id, false);
        if ("needsDriveConfirmation" in result && result.needsDriveConfirmation) {
          setConfirmAction("deleteDrive");
          setLoading(false);
          return;
        }
        if (!result.success) alert(result.errors?.[0] || tValidation("deleteFailed"));
      } else if (confirmAction === "deleteDrive") {
        const result = await deleteDraftInvoice(invoice.id, true);
        if (!result.success) alert(result.errors?.[0] || tValidation("deleteFailed"));
      } else if (confirmAction === "regenerate" || confirmAction === "retryGeneration") {
        if (isGenerationActive(invoice.workflow_status, invoice.generation_status)) {
          alert(GENERATION_ALREADY_RUNNING_MESSAGE);
          return;
        }

        const liveStatus = await fetchInvoiceGenerationStatus(invoice.id);
        if (!liveStatus) {
          alert(GENERATION_STATUS_VERIFY_FAILED_MESSAGE);
          return;
        }

        if (isGenerationActive(liveStatus.workflow_status, liveStatus.generation_status)) {
          alert(GENERATION_ALREADY_RUNNING_MESSAGE);
          return;
        }

        const payload = await buildRegeneratePayload(invoice.id);
        if (!payload.success) {
          alert(payload.errors[0]);
        } else {
          const response = await fetch(`/api/invoices/${invoice.id}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(normalizeInvoiceFormData(payload.formData)),
          });
          const data = await response.json();
          if (!response.ok) {
            const technical =
              data.generation_error || data.workflow_error || data.error || "UNKNOWN_GENERATION_ERROR";
            const friendly = getFriendlyGenerationErrorContent(technical, tInvoiceErrors, {
              draftFailure: invoice.status === "draft",
            });
            alert(`${friendly.title}\n\n${friendly.message}`);
          }
        }
      }
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmAction(null);
      closeMenu();
    }
  }

  async function handleDuplicate() {
    closeMenu();
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

  function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    closeMenu();
  }

  const confirmCopy = confirmAction ? getConfirmCopy(confirmAction) : null;

  return (
    <>
      {trigger ? (
        trigger({
          onClick: (e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          },
          disabled: loading,
        })
      ) : (
        <IconButton
          size="small"
          aria-label={tCommon("actions")}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          }}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "10px",
            border: `1px solid ${imsColors.border}`,
            bgcolor: "#fff",
          }}
        >
          <MoreHorizIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { ...imsMenuPaperSx, minWidth: 240 } } }}
      >
        {!hideOpenInvoice ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              router.push(`/invoices/${invoice.id}`);
            }}
          >
            <ListItemIcon>
              <VisibilityOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("openInvoice")}</ListItemText>
          </MenuItem>
        ) : null}

        {googleUrl ? (
          <MenuItem onClick={() => openExternal(googleUrl)}>
            <ListItemIcon>
              <DescriptionOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("openGoogleDocs")}</ListItemText>
            <OpenInNewIcon sx={{ fontSize: 14, color: imsColors.textMuted, ml: 1 }} />
          </MenuItem>
        ) : null}

        {pdfUrl ? (
          <MenuItem onClick={() => openExternal(pdfUrl)}>
            <ListItemIcon>
              <PictureAsPdfOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("openPdf")}</ListItemText>
            <OpenInNewIcon sx={{ fontSize: 14, color: imsColors.textMuted, ml: 1 }} />
          </MenuItem>
        ) : null}

        {canRetryDocumentGeneration(invoice) ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              setConfirmAction("retryGeneration");
            }}
          >
            <ListItemIcon>
              <RefreshOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("retryDocumentGeneration")}</ListItemText>
          </MenuItem>
        ) : null}

        {canRegenerateInvoice(invoice) ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              setConfirmAction("regenerate");
            }}
          >
            <ListItemIcon>
              <RefreshOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("regeneratePdf")}</ListItemText>
          </MenuItem>
        ) : null}

        {canDuplicateInvoice(invoice) && !hideDuplicate ? (
          <MenuItem onClick={handleDuplicate}>
            <ListItemIcon>
              <ContentCopyOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("duplicate")}</ListItemText>
          </MenuItem>
        ) : null}

        {canArchiveInvoice(invoice) ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              setConfirmAction("archive");
            }}
          >
            <ListItemIcon>
              <ArchiveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("archive")}</ListItemText>
          </MenuItem>
        ) : null}

        {canCancelInvoice(invoice) ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              setConfirmAction("cancel");
            }}
          >
            <ListItemIcon>
              <BlockOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("cancelInvoice")}</ListItemText>
          </MenuItem>
        ) : null}

        {canDeleteInvoice(invoice) ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              setConfirmAction("delete");
            }}
            sx={{ color: "#b42318" }}
          >
            <ListItemIcon sx={{ color: "#b42318" }}>
              <DeleteOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("deleteDraft")}</ListItemText>
          </MenuItem>
        ) : null}
      </Menu>

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
