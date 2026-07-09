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
} from "@/lib/invoice-lifecycle";
import { invoiceGoogleDocUrl, invoicePdfUrl } from "@/lib/invoice-form";
import { normalizeInvoiceFormData } from "@/lib/invoice-form";
import type { Invoice } from "@/lib/types/database";
import { imsColors } from "@/theme/imsTheme";

type ConfirmAction = "archive" | "cancel" | "delete" | "deleteDrive" | "regenerate" | null;

export function InvoiceRowActionsMenu({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const t = useTranslations("invoice");
  const tDialogs = useTranslations("dialogs");
  const tValidation = useTranslations("validation");
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
      } else if (confirmAction === "regenerate") {
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
            alert(data.error || data.errors?.[0] || tValidation("regenerateFailed"));
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
      router.push(`/invoices/${result.data.id}`);
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

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 240 } } }}
      >
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

        {canDuplicateInvoice(invoice) ? (
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
