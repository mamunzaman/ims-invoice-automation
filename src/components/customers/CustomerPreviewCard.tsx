"use client";

import { Avatar, Divider, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import {
  EmailOutlinedIcon,
  LanguageOutlinedIcon,
  PersonOutlineOutlinedIcon,
  PhoneOutlinedIcon,
} from "@/components/icons/muiIcons";
import { PreviewCardShell } from "@/components/forms/ims";
import { imsColors } from "@/theme/imsTheme";

interface CustomerPreviewCardProps {
  name: string;
  secondaryName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  currency?: string;
  paymentTermsDays?: string;
  vatNumber?: string;
}

export function CustomerPreviewCard({
  name,
  secondaryName,
  contactPerson,
  email,
  phone,
  website,
  address,
  currency,
  paymentTermsDays,
  vatNumber,
}: CustomerPreviewCardProps) {
  const t = useTranslations("customers");
  const tInvoice = useTranslations("invoice");

  return (
    <PreviewCardShell title={t("previewTitle")} subtitle={t("previewSubtitle")}>
      <Stack spacing={2}>
        <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: imsColors.primary,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {(name || "?").charAt(0).toUpperCase()}
          </Avatar>
          <Stack spacing={0.25}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: imsColors.textDark }}>
              {name || t("customerName")}
            </Typography>
            {secondaryName ? (
              <Typography sx={{ fontSize: 12.5, color: imsColors.textMuted }}>{secondaryName}</Typography>
            ) : null}
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: imsColors.border }} />

        <Stack spacing={1}>
          <ContactRow icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 16 }} />} label={t("contactPerson")} value={contactPerson} />
          <ContactRow icon={<EmailOutlinedIcon sx={{ fontSize: 16 }} />} label={t("email")} value={email} />
          <ContactRow icon={<PhoneOutlinedIcon sx={{ fontSize: 16 }} />} label={t("phone")} value={phone} />
          <ContactRow icon={<LanguageOutlinedIcon sx={{ fontSize: 16 }} />} label={t("website")} value={website} />
        </Stack>

        <Divider sx={{ borderColor: imsColors.border }} />

        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: imsColors.textMuted }}>
            {t("billingAddress").toUpperCase()}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: imsColors.textDark, whiteSpace: "pre-line", lineHeight: 1.5 }}>
            {address || "—"}
          </Typography>
        </Stack>

        <Divider sx={{ borderColor: imsColors.border }} />

        <Stack spacing={0.75}>
          <MetaRow label={tInvoice("currency")} value={currency} />
          <MetaRow
            label={t("paymentTermsLabel")}
            value={paymentTermsDays ? t("days", { count: paymentTermsDays }) : ""}
          />
          <MetaRow label={t("vatNumber")} value={vatNumber} />
        </Stack>
      </Stack>
    </PreviewCardShell>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  const trimmed = value?.trim() || "";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
      <Stack sx={{ color: imsColors.primary, mt: 0.15 }}>{icon}</Stack>
      <Stack direction="row" sx={{ flex: 1, justifyContent: "space-between", gap: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, color: imsColors.textMuted, flexShrink: 0 }}>{label}</Typography>
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 500, color: imsColors.textDark, textAlign: "right" }}
          noWrap
        >
          {trimmed || "—"}
        </Typography>
      </Stack>
    </Stack>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  const trimmed = value?.trim() || "";
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: imsColors.textDark }}>{trimmed || "—"}</Typography>
    </Stack>
  );
}
