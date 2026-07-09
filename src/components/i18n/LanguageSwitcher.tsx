"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Box, Menu, MenuItem, Typography } from "@mui/material";
import { setUserLocale } from "@/lib/actions/locale";
import { getLocaleDefinitions } from "@/i18n/locale-config";
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, type AppLocale } from "@/i18n/routing";
import { imsColors } from "@/theme/imsTheme";
import { useTranslations } from "next-intl";

interface ProfileLanguageMenuProps {
  onChanged?: () => void;
}

const menuItemSx = {
  minHeight: 36,
  py: 0.75,
  px: 1.5,
  mx: 0.75,
  borderRadius: "8px",
  fontSize: 13,
  color: imsColors.textDark,
  transition: "background-color 0.12s ease",
  "&:hover": { bgcolor: "rgba(16, 24, 40, 0.04)" },
};

export function ProfileLanguageMenu({ onChanged }: ProfileLanguageMenuProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const options = getLocaleDefinitions();

  function changeLanguage(next: AppLocale) {
    if (next === locale || pending) return;

    startTransition(async () => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      await setUserLocale(next);
      onChanged?.();
      router.refresh();
    });
  }

  return (
    <Box sx={{ py: 0.5 }}>
      <Typography
        sx={{
          px: 2,
          py: 0.75,
          fontSize: 12,
          fontWeight: 600,
          color: imsColors.textMuted,
          letterSpacing: 0.1,
        }}
      >
        🌐 {t("language")}
      </Typography>

      {options.map((option) => {
        const selected = option.code === locale;
        return (
          <MenuItem
            key={option.code}
            disabled={pending}
            selected={selected}
            onClick={() => changeLanguage(option.code)}
            sx={{
              ...menuItemSx,
              pl: 3.25,
              fontWeight: selected ? 600 : 400,
              bgcolor: selected ? "rgba(16, 24, 40, 0.03)" : "transparent",
            }}
          >
            <Box
              component="span"
              sx={{
                width: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1,
                fontSize: 12,
                color: selected ? imsColors.primary : "transparent",
              }}
              aria-hidden
            >
              {selected ? "✓" : ""}
            </Box>
            {t(option.messageKey)}
          </MenuItem>
        );
      })}
    </Box>
  );
}

interface LanguageSelectorProps {
  onChanged?: () => void;
}

export function LanguageSelector({ onChanged }: LanguageSelectorProps) {
  const t = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const options = getLocaleDefinitions();
  const current = options.find((o) => o.code === locale) ?? options[0];
  const open = Boolean(anchorEl);

  function changeLanguage(next: AppLocale) {
    if (next === locale || pending) return;

    startTransition(async () => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      await setUserLocale(next);
      setAnchorEl(null);
      onChanged?.();
      router.refresh();
    });
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        disabled={pending}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={t("language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          height: 40,
          px: 1.5,
          border: `1px solid ${imsColors.border}`,
          borderRadius: "12px",
          bgcolor: "#fff",
          cursor: pending ? "wait" : "pointer",
          transition: "background-color 0.12s ease, border-color 0.12s ease",
          fontSize: 13,
          fontWeight: 500,
          color: imsColors.textDark,
          "&:hover": {
            bgcolor: "rgba(16, 24, 40, 0.02)",
            borderColor: "rgba(16, 24, 40, 0.12)",
          },
        }}
      >
        <span aria-hidden>🌐</span>
        <span>{t(current.messageKey)}</span>
        <Typography component="span" sx={{ fontSize: 10, color: imsColors.textMuted, ml: 0.25 }}>
          ▼
        </Typography>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
              minWidth: 180,
              mt: 0.75,
              border: `1px solid ${imsColors.border}`,
              boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
            },
          },
        }}
      >
        {options.map((option) => {
          const selected = option.code === locale;
          return (
            <MenuItem
              key={option.code}
              disabled={pending}
              selected={selected}
              onClick={() => changeLanguage(option.code)}
              sx={menuItemSx}
            >
              <Box
                component="span"
                sx={{
                  width: 18,
                  display: "inline-flex",
                  mr: 1,
                  color: selected ? imsColors.primary : "transparent",
                }}
              >
                {selected ? "✓" : null}
              </Box>
              {t(option.messageKey)}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
