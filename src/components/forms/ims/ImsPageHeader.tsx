"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowBackIcon } from "@/components/icons/muiIcons";
import { Box, Stack, Typography } from "@mui/material";
import { ImsStatusChip, type ImsStatusTone } from "./ImsStatusChip";
import { imsColors } from "@/theme/imsTheme";

export interface ImsPageMetaItem {
  icon?: ReactNode;
  label: string;
  value: string;
}

interface ImsPageHeaderProps {
  backHref?: string;
  backLabel?: string;
  title: string;
  status?: { label: string; tone: ImsStatusTone };
  meta?: ImsPageMetaItem[];
  actions?: ReactNode;
}

export function ImsPageHeader({
  backHref,
  backLabel,
  title,
  status,
  meta,
  actions,
}: ImsPageHeaderProps) {
  return (
    <Stack spacing={2}>
      {backHref && backLabel ? (
        <Box
          component={Link}
          href={backHref}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            color: imsColors.textMuted,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            width: "fit-content",
            "&:hover": { color: imsColors.primaryDark },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
          {backLabel}
        </Box>
      ) : null}

      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { lg: "flex-start" } }}
      >
        <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
            useFlexGap
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: 26, md: 32 },
                color: imsColors.textDark,
                lineHeight: 1.15,
              }}
            >
              {title}
            </Typography>
            {status ? (
              <ImsStatusChip
                tone={status.tone}
                label={status.label}
                sx={{ textTransform: "uppercase", fontWeight: 700, height: 28 }}
              />
            ) : null}
          </Stack>

          {meta?.length ? (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 0.75, md: 2.5 }}
              sx={{ flexWrap: "wrap" }}
              useFlexGap
            >
              {meta.map((item) => (
                <Stack
                  key={`${item.label}-${item.value}`}
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: "center", minWidth: 0 }}
                >
                  {item.icon}
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: imsColors.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}:{" "}
                    <Box
                      component="span"
                      sx={{
                        color: imsColors.textDark,
                        fontWeight: 600,
                        whiteSpace: { xs: "normal", md: "nowrap" },
                      }}
                    >
                      {item.value}
                    </Box>
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : null}
        </Stack>

        {actions ? (
          <Box sx={{ flexShrink: 0, width: { xs: "100%", lg: "auto" } }}>{actions}</Box>
        ) : null}
      </Stack>
    </Stack>
  );
}
