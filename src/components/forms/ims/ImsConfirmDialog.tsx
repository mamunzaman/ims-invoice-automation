"use client";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { ImsButton } from "@/components/forms/ims/ImsButton";
import { imsColors } from "@/theme/imsTheme";

interface ImsConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ImsConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  loading,
  onConfirm,
  onClose,
}: ImsConfirmDialogProps) {
  const tButtons = useTranslations("buttons");
  const resolvedConfirm = confirmLabel ?? tButtons("confirm");
  const resolvedCancel = cancelLabel ?? tButtons("cancel");

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: "18px" } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14, color: imsColors.textMuted, lineHeight: 1.55 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <ImsButton imsVariant="ghost" onClick={onClose} disabled={loading}>
          {resolvedCancel}
        </ImsButton>
        <ImsButton
          imsVariant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          loading={loading}
        >
          {resolvedConfirm}
        </ImsButton>
      </DialogActions>
    </Dialog>
  );
}
