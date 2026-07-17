"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { ImsAlert, ImsStatusChip, type ImsStatusTone } from "@/components/forms/ims";
import type {
  AppServiceKey,
  HealthCheckLogServiceResult,
  HealthCheckOverallStatus,
  SystemLogEntry,
} from "@/lib/app-settings-shared";
import { serviceHealthTone } from "@/lib/app-settings-shared";
import { imsColors } from "@/theme/imsTheme";

const SERVICE_ORDER: AppServiceKey[] = ["automation", "googleDocs", "googleDrive", "dropbox"];

const STATUS_DOT: Record<HealthCheckLogServiceResult["state"], string> = {
  connected: "#12b76a",
  unknown: "#f79009",
  offline: "#f04438",
};

export interface HealthSystemLogProps {
  entries: SystemLogEntry[];
  loading: boolean;
  formatTimestamp: (value: string | null | undefined) => string;
}

function overallStatusTone(status: HealthCheckOverallStatus): ImsStatusTone {
  if (status === "healthy") return "green";
  if (status === "degraded") return "amber";
  return "red";
}

function orderedServices(services: HealthCheckLogServiceResult[]): HealthCheckLogServiceResult[] {
  const byKey = new Map(services.map((service) => [service.key, service]));
  return SERVICE_ORDER.flatMap((key) => {
    const service = byKey.get(key);
    return service ? [service] : [];
  });
}

function countConnectedServices(services: HealthCheckLogServiceResult[]): number {
  return services.filter((service) => service.state === "connected").length;
}

function HealthSystemLogEntry({
  entry,
  formatTimestamp,
}: {
  entry: SystemLogEntry;
  formatTimestamp: (value: string | null | undefined) => string;
}) {
  const t = useTranslations("appSettings.systemLog");
  const tStatus = useTranslations("appSettings.status");

  const services = useMemo(() => orderedServices(entry.services), [entry.services]);
  const connectedCount = countConnectedServices(services);
  const totalServices = SERVICE_ORDER.length;

  const serviceLabels: Record<AppServiceKey, string> = {
    automation: tStatus("automation"),
    googleDocs: tStatus("googleDocs"),
    googleDrive: tStatus("googleDrive"),
    dropbox: tStatus("dropbox"),
  };

  const stateLabels: Record<HealthCheckLogServiceResult["state"], string> = {
    connected: tStatus("connected"),
    unknown: tStatus("unknown"),
    offline: tStatus("offline"),
  };

  function serviceMessage(service: HealthCheckLogServiceResult): string {
    return service.message?.trim() || tStatus(`healthMessages.${service.messageKey}`);
  }

  return (
    <Box
      component="article"
      aria-label={`${formatTimestamp(entry.checkedAt)} · ${t(`overallStatus.${entry.overallStatus}`)}`}
      sx={{
        border: `1px solid ${imsColors.border}`,
        borderRadius: "10px",
        px: 1.5,
        py: 1.25,
        bgcolor: imsColors.card,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: imsColors.textDark }}>
          <Box component="time" dateTime={entry.checkedAt} sx={{ fontWeight: 600 }}>
            {formatTimestamp(entry.checkedAt)}
          </Box>
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
          <ImsStatusChip
            tone={overallStatusTone(entry.overallStatus)}
            label={t(`overallStatus.${entry.overallStatus}`)}
          />
          <ImsStatusChip
            tone={connectedCount === totalServices ? "green" : connectedCount === 0 ? "red" : "amber"}
            label={t("servicesConnected", { connected: connectedCount, total: totalServices })}
          />
        </Stack>
      </Stack>

      {entry.requestFailed && entry.failureMessageKey ? (
        <Box sx={{ mt: 1 }}>
          <ImsAlert tone="error" title={t("checkFailedTitle")}>
            {tStatus(`healthMessages.${entry.failureMessageKey}`)}
          </ImsAlert>
        </Box>
      ) : null}

      <Grid container spacing={1} sx={{ mt: 1 }}>
        {services.map((service) => (
          <Grid key={`${entry.id}-${service.key}`} size={{ xs: 12, sm: 6 }}>
            <Stack
              spacing={0.35}
              sx={{
                height: "100%",
                border: `1px solid ${imsColors.border}`,
                borderRadius: "8px",
                px: 1,
                py: 0.85,
                bgcolor: "#fafbfa",
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: imsColors.textDark }}>
                  {serviceLabels[service.key]}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
                  <Box
                    aria-hidden
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: STATUS_DOT[service.state],
                    }}
                  />
                  <ImsStatusChip
                    tone={serviceHealthTone(service.state)}
                    label={stateLabels[service.state]}
                    sx={{ height: 22, fontSize: 11 }}
                  />
                </Stack>
              </Stack>
              <Typography
                sx={{
                  fontSize: 12,
                  color: imsColors.textMuted,
                  lineHeight: 1.45,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {serviceMessage(service)}
              </Typography>
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function HealthSystemLog({ entries, loading, formatTimestamp }: HealthSystemLogProps) {
  const t = useTranslations("appSettings.systemLog");
  const tCommon = useTranslations("common");

  if (loading) {
    return (
      <Typography sx={{ fontSize: 13, color: imsColors.textMuted }} role="status" aria-live="polite">
        {tCommon("loading")}
      </Typography>
    );
  }

  if (entries.length === 0) {
    return (
      <Typography sx={{ fontSize: 13, color: imsColors.textMuted }} role="status">
        {t("empty")}
      </Typography>
    );
  }

  return (
    <Box
      role="log"
      aria-label={t("title")}
      aria-live="polite"
      sx={{
        maxHeight: { xs: "60vh", sm: "65vh" },
        overflowY: "auto",
        pr: 0.5,
        "&::-webkit-scrollbar": { width: 6 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: imsColors.border,
          borderRadius: 999,
        },
      }}
    >
      <Stack spacing={1}>
        {entries.map((entry) => (
          <HealthSystemLogEntry key={entry.id} entry={entry} formatTimestamp={formatTimestamp} />
        ))}
      </Stack>
    </Box>
  );
}
