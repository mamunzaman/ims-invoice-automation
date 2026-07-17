"use client";

import Link from "next/link";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { ImsCard, ImsMetricCard } from "@/components/forms/ims";
import { designTokens } from "@/theme/designTokens";
import { imsColors } from "@/theme/imsTheme";
import type { AppLocale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";

interface DashboardOverviewProps {
  stats: {
    totalInvoices: number;
    paidInvoices: number;
    openInvoices: number;
    draftInvoices: number;
    totalAmountThisMonth: number;
  };
  locale: AppLocale;
}

function NavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        transition: `transform ${designTokens.transition.fast}, box-shadow ${designTokens.transition.fast}`,
        "&:hover": {
          transform: "translateY(-1px)",
        },
      }}
    >
      <ImsCard variant="muted" padding="md">
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: imsColors.textDark }}>{title}</Typography>
        <Typography sx={{ fontSize: 13, color: imsColors.textMuted, mt: 0.75, lineHeight: 1.5 }}>
          {description}
        </Typography>
      </ImsCard>
    </Box>
  );
}

export function DashboardOverview({ stats, locale }: DashboardOverviewProps) {
  const t = useTranslations("dashboard");

  const cards = [
    { label: t("totalInvoices"), value: stats.totalInvoices, tone: "default" as const },
    { label: t("paidInvoices"), value: stats.paidInvoices, tone: "success" as const },
    { label: t("openInvoices"), value: stats.openInvoices, tone: "primary" as const },
    { label: t("draftInvoices"), value: stats.draftInvoices, tone: "default" as const },
  ];

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <ImsMetricCard label={card.label} value={card.value} tone={card.tone} />
          </Grid>
        ))}
      </Grid>

      <ImsMetricCard
        label={t("amountThisMonth")}
        value={formatCurrency(stats.totalAmountThisMonth, "EUR", locale)}
        tone="primary"
        size="lg"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NavCard
            href="/invoices"
            title={t("manageInvoicesTitle")}
            description={t("manageInvoicesDesc")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NavCard
            href="/customers"
            title={t("manageCustomersTitle")}
            description={t("manageCustomersDesc")}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
