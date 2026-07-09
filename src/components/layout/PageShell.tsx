"use client";

import {
  Box,
  Breadcrumbs,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SaveOutlinedIcon, SettingsOutlinedIcon, MoreHorizIcon } from "@/components/icons/muiIcons";
import { ImsButton } from "@/components/forms/ims";
import { useSidebarLayout } from "@/components/layout/SidebarContext";
import type { ReactNode } from "react";
import { imsColors } from "@/theme/imsTheme";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  topActions?: ReactNode;
  showDraftSave?: boolean;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  children: ReactNode;
}

export function PageShell({
  breadcrumbs,
  title,
  subtitle,
  topActions,
  showDraftSave,
  onSaveDraft,
  savingDraft,
  children,
}: PageShellProps) {
  const t = useTranslations("invoice");
  const tNav = useTranslations("navigation");
  const { collapsed } = useSidebarLayout();

  return (
    <Box sx={{ maxWidth: collapsed ? 1680 : 1440, mx: "auto", width: "100%", transition: "max-width 0.22s ease" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "24px",
          border: `1px solid ${imsColors.border}`,
          bgcolor: "#fff",
          p: { xs: 2, md: 3 },
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)",
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              gap: 2,
            }}
          >
            <Stack spacing={1}>
              {breadcrumbs?.length ? (
                <Breadcrumbs
                  separator="›"
                  sx={{ "& .MuiBreadcrumbs-separator": { color: imsColors.textMuted } }}
                >
                  {breadcrumbs.map((item) =>
                    item.href ? (
                      <MuiLink
                        key={item.label}
                        component={Link}
                        href={item.href}
                        underline="hover"
                        color="primary"
                        sx={{ fontSize: 13 }}
                      >
                        {item.label}
                      </MuiLink>
                    ) : (
                      <Typography key={item.label} color="text.secondary" sx={{ fontSize: 13 }}>
                        {item.label}
                      </Typography>
                    )
                  )}
                </Breadcrumbs>
              ) : null}
              <Typography variant="h4" sx={{ fontSize: { xs: 28, md: 34 } }}>
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="body1" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {showDraftSave ? (
                <ImsButton
                  imsVariant="secondary"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={onSaveDraft}
                  disabled={savingDraft}
                  sx={{ minHeight: 40 }}
                >
                  {t("saveDraft")}
                </ImsButton>
              ) : null}
              {topActions}
              <IconButton
                aria-label={tNav("settings")}
                component={Link}
                href="/settings"
                sx={{ border: `1px solid ${imsColors.border}`, borderRadius: 2 }}
              >
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label={tNav("openMenu")}
                sx={{ border: `1px solid ${imsColors.border}`, borderRadius: 2, display: { lg: "none" } }}
              >
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
