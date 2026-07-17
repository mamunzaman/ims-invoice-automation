"use client";

import { useTranslations } from "next-intl";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { SectionCard } from "@/components/layout/SectionCard";
import { ImsAlert, ImsButton, ImsStatusChip } from "@/components/forms/ims";
import type {
  AppServiceHealthSnapshot,
  GenerationActivitySnapshot,
  ServiceHealthMessageKey,
  ServiceHealthState,
} from "@/lib/app-settings-shared";
import {
  normalizeAppServiceHealthSnapshot,
  serviceHealthTone,
} from "@/lib/app-settings-shared";
import { imsColors } from "@/theme/imsTheme";

interface AppSettingsStatusCardProps {
  health: AppServiceHealthSnapshot;
  checking: boolean;
  onCheckServices: () => void;
  onViewSystemLog: () => void;
  formatGenerationActivity: (entry: GenerationActivitySnapshot) => string;
  formatLastChecked: (value: string | null | undefined) => string;
}

const STATUS_DOT: Record<ServiceHealthState, string> = {
  connected: "#12b76a",
  unknown: "#f79009",
  offline: "#f04438",
};

export function AppSettingsStatusCard({
  health,
  checking,
  onCheckServices,
  onViewSystemLog,
  formatGenerationActivity,
  formatLastChecked,
}: AppSettingsStatusCardProps) {
  const t = useTranslations("appSettings.status");
  const normalizedHealth = normalizeAppServiceHealthSnapshot(health);

  const serviceLabels: Record<(typeof normalizedHealth.services)[number]["key"], string> = {
    automation: t("automation"),
    googleDocs: t("googleDocs"),
    googleDrive: t("googleDrive"),
    dropbox: t("dropbox"),
  };

  const stateLabels: Record<ServiceHealthState, string> = {
    connected: t("connected"),
    unknown: t("unknown"),
    offline: t("offline"),
  };

  function serviceMessage(messageKey: ServiceHealthMessageKey): string {
    return t(`healthMessages.${messageKey}`);
  }

  return (
    <SectionCard title={t("title")} subtitle={t("subtitle")}>
      <Stack spacing={2}>
        <Stack spacing={1}>
          {normalizedHealth.services.map((service) => (
            <Stack
              key={service.key}
              direction="row"
              spacing={1.25}
              sx={{
                alignItems: "flex-start",
                justifyContent: "space-between",
                py: 0.75,
                borderBottom: `1px solid ${imsColors.border}`,
                "&:last-child": { borderBottom: 0 },
              }}
            >
              <Box sx={{ minWidth: 0, pr: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: imsColors.textDark }}>
                  {serviceLabels[service.key]}
                </Typography>
                <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mt: 0.25 }}>
                  {service.message?.trim() || serviceMessage(service.messageKey)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: STATUS_DOT[service.state],
                    flexShrink: 0,
                  }}
                />
                <ImsStatusChip
                  tone={serviceHealthTone(service.state)}
                  label={stateLabels[service.state]}
                />
              </Stack>
            </Stack>
          ))}
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mb: 0.35 }}>
              {t("lastSuccessfulGeneration")}
            </Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: imsColors.textDark }}>
              {formatGenerationActivity(normalizedHealth.lastSuccessfulGeneration)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography sx={{ fontSize: 12, color: imsColors.textMuted, mb: 0.35 }}>
              {t("lastFailedGeneration")}
            </Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: imsColors.textDark }}>
              {formatGenerationActivity(normalizedHealth.lastFailedGeneration)}
            </Typography>
          </Grid>
        </Grid>

        <Typography sx={{ fontSize: 12, color: imsColors.textMuted }}>
          {t("lastChecked")}:{" "}
          <Box component="span" sx={{ fontWeight: 600, color: imsColors.textDark }}>
            {formatLastChecked(normalizedHealth.checkedAt)}
          </Box>
        </Typography>

        {normalizedHealth.checkFailed && normalizedHealth.checkFailureMessageKey ? (
          <ImsAlert tone="error" title={t("checkFailedTitle")}>
            {serviceMessage(normalizedHealth.checkFailureMessageKey)}
          </ImsAlert>
        ) : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <ImsButton imsVariant="secondary" loading={checking} disabled={checking} onClick={onCheckServices}>
            {checking ? t("checkingServices") : t("checkServices")}
          </ImsButton>
          <ImsButton imsVariant="ghost" onClick={onViewSystemLog}>
            {t("viewSystemLog")}
          </ImsButton>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
