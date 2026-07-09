"use client";

import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { LogoutOutlinedIcon } from "@/components/icons/muiIcons";
import { ProfileLanguageMenu } from "@/components/i18n/LanguageSwitcher";
import { imsColors } from "@/theme/imsTheme";
import { useTranslations } from "next-intl";

interface UserProfileMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  userLabel: string;
  userEmail: string;
  onLogout: () => void;
}

const profileMenuPaperSx = {
  borderRadius: "12px",
  minWidth: 220,
  mt: 0.75,
  border: `1px solid ${imsColors.border}`,
  boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
  overflow: "hidden",
};

export function UserProfileMenu({
  anchorEl,
  open,
  onClose,
  userLabel,
  userEmail,
  onLogout,
}: UserProfileMenuProps) {
  const t = useTranslations("navigation");

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      slotProps={{ paper: { sx: profileMenuPaperSx } }}
    >
      <Typography
        sx={{
          px: 2,
          pt: 1.5,
          pb: 0.5,
          fontSize: 13,
          fontWeight: 600,
          color: imsColors.textDark,
        }}
        noWrap
      >
        {userLabel}
      </Typography>
      {userEmail ? (
        <Typography
          sx={{ px: 2, pb: 1, fontSize: 11.5, color: imsColors.textMuted }}
          noWrap
        >
          {userEmail}
        </Typography>
      ) : null}

      <Divider sx={{ borderColor: imsColors.border }} />

      <ProfileLanguageMenu onChanged={onClose} />

      <Divider sx={{ borderColor: imsColors.border }} />

      <MenuItem
        onClick={() => {
          onClose();
          onLogout();
        }}
        sx={{
          minHeight: 40,
          mx: 0.75,
          my: 0.5,
          borderRadius: "8px",
          fontSize: 13,
          color: imsColors.textDark,
          "&:hover": { bgcolor: "rgba(16, 24, 40, 0.04)" },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: imsColors.textMuted }}>
          <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
        </ListItemIcon>
        <ListItemText primary={t("logout")} />
      </MenuItem>
    </Menu>
  );
}
