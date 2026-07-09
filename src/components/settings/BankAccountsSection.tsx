"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useTranslations } from "next-intl";
import { FormValidationAlert } from "@/components/invoices/FormValidationAlert";
import {
  ImsCheckboxCard,
  ImsButton,
  ImsTextField,
  imsCardSx,
} from "@/components/forms/ims";
import type { ProfileBankAccount } from "@/lib/types/database";
import {
  createBankAccount,
  deleteBankAccount,
  setDefaultBankAccount,
  updateBankAccount,
  type BankAccountFormData,
} from "@/lib/actions/bank-accounts";
import { imsColors } from "@/theme/imsTheme";

const EMPTY_FORM: BankAccountFormData = {
  label: "",
  account_holder: "",
  bank_name: "",
  iban: "",
  bic: "",
  is_default: false,
};

interface BankAccountsSectionProps {
  accounts: ProfileBankAccount[];
}

export function BankAccountsSection({ accounts }: BankAccountsSectionProps) {
  const router = useRouter();
  const t = useTranslations("bankAccounts");
  const tCommon = useTranslations("common");
  const tButtons = useTranslations("buttons");
  const tValidation = useTranslations("validation");
  const [form, setForm] = useState<BankAccountFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  }

  function startEdit(account: ProfileBankAccount) {
    setEditingId(account.id);
    setForm({
      label: account.label,
      account_holder: account.account_holder || "",
      bank_name: account.bank_name,
      iban: account.iban,
      bic: account.bic || "",
      is_default: account.is_default,
    });
    setError("");
  }

  async function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);

    const result = editingId
      ? await updateBankAccount(editingId, form)
      : await createBankAccount(form);

    if (!result.success) {
      setError(result.errors?.[0] || tValidation("saveFailed"));
      setLoading(false);
      return;
    }

    resetForm();
    setLoading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setActionId(id);
    setError("");
    const result = await deleteBankAccount(id);
    if (!result.success) {
      setError(result.errors?.[0] || tValidation("deleteFailed"));
    } else if (editingId === id) {
      resetForm();
    }
    setActionId(null);
    router.refresh();
  }

  async function handleSetDefault(id: string) {
    setActionId(id);
    setError("");
    const result = await setDefaultBankAccount(id);
    if (!result.success) {
      setError(result.errors?.[0] || t("setDefaultFailed"));
    }
    setActionId(null);
    router.refresh();
  }

  return (
    <Stack spacing={2.25}>
      {error ? <FormValidationAlert messages={[error]} /> : null}

      {accounts.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
          {t("emptyHint")}
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {accounts.map((account) => (
            <Box
              key={account.id}
              sx={{
                ...imsCardSx,
                p: 2,
                borderRadius: "16px",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{account.label}</Typography>
                    {account.is_default ? (
                      <Chip
                        label={t("default")}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 11,
                          bgcolor: imsColors.primaryLight,
                          color: imsColors.primaryDark,
                          border: `1px solid ${imsColors.border}`,
                        }}
                      />
                    ) : null}
                  </Stack>
                  {account.account_holder ? (
                    <Typography sx={{ fontSize: 13, color: imsColors.textMuted, mt: 0.5 }}>
                      {account.account_holder}
                    </Typography>
                  ) : null}
                  <Typography sx={{ fontSize: 13, color: imsColors.textMuted, mt: 0.35 }}>
                    {account.bank_name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mt: 0.35, fontFamily: "monospace" }}>
                    {account.iban}
                    {account.bic ? ` · ${account.bic}` : ""}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {!account.is_default ? (
                    <ImsButton
                      type="button"
                      imsVariant="secondary"
                      size="small"
                      disabled={actionId === account.id}
                      onClick={() => handleSetDefault(account.id)}
                      sx={{ minHeight: 36, fontSize: 13 }}
                    >
                      {t("setDefault")}
                    </ImsButton>
                  ) : null}
                  <ImsButton type="button" imsVariant="ghost" size="small" onClick={() => startEdit(account)} sx={{ minHeight: 36, fontSize: 13 }}>
                    {tButtons("edit")}
                  </ImsButton>
                  <ImsButton
                    type="button"
                    imsVariant="ghost"
                    size="small"
                    disabled={actionId === account.id}
                    onClick={() => handleDelete(account.id)}
                    sx={{ minHeight: 36, fontSize: 13, color: imsColors.textMuted }}
                  >
                    {tButtons("delete")}
                  </ImsButton>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Box
        sx={{
          ...imsCardSx,
          borderRadius: "16px",
          p: 2.25,
          bgcolor: "#fafbfc",
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 2 }}>
          {editingId ? t("editAccount") : t("newAccount")}
        </Typography>
        <Grid container spacing={2.25}>
          <Grid size={{ xs: 12 }}>
            <ImsTextField
              label={t("label")}
              name="bank_label"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder={t("labelPlaceholder")}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ImsTextField
              label={t("accountHolder")}
              name="account_holder"
              value={form.account_holder}
              onChange={(e) => setForm((prev) => ({ ...prev, account_holder: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("bankName")}
              name="bank_name"
              value={form.bank_name}
              onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ImsTextField
              label={t("iban")}
              name="iban"
              value={form.iban}
              onChange={(e) => setForm((prev) => ({ ...prev, iban: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ImsTextField
              label={t("bic")}
              name="bic"
              value={form.bic}
              onChange={(e) => setForm((prev) => ({ ...prev, bic: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ImsCheckboxCard
              id="bank_is_default"
              checked={form.is_default}
              onChange={(checked) => setForm((prev) => ({ ...prev, is_default: checked }))}
              title={t("useAsDefault")}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1.25} sx={{ mt: 2.25 }}>
          <ImsButton type="button" loading={loading} onClick={handleSubmit}>
            {loading ? tCommon("saving") : editingId ? t("saveChanges") : t("addAccount")}
          </ImsButton>
          {editingId ? (
            <ImsButton type="button" imsVariant="ghost" onClick={resetForm}>
              {tCommon("cancel")}
            </ImsButton>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
