"use client";

import Link from "next/link";
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import {
  LogoutOutlinedIcon,
  PersonOutlineOutlinedIcon,
  SettingsOutlinedIcon,
} from "@/components/icons/muiIcons";
import { ProfileLanguageMenu } from "@/components/i18n/LanguageSwitcher";
import { imsMenuPaperSx } from "@/components/forms/ims/imsStyles";
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
  ...imsMenuPaperSx,
  minWidth: 240,
  mt: 0.75,
};

const menuItemSx = {
  minHeight: 40,
  mx: 0.75,
  my: 0.25,
  borderRadius: "8px",
  fontSize: 13,
  color: imsColors.textDark,
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
          pb: 0.25,
          fontSize: 13,
          fontWeight: 600,
          color: imsColors.textDark,
        }}
      >
        {t("accountAppSettings")}
      </Typography>
      <Typography sx={{ px: 2, pb: 0.25, fontSize: 12, fontWeight: 500, color: imsColors.textDark }} noWrap>
        {userLabel}
      </Typography>
      {userEmail ? (
        <Typography sx={{ px: 2, pb: 1, fontSize: 11.5, color: imsColors.textMuted }} noWrap>
          {userEmail}
        </Typography>
      ) : null}

      <Divider sx={{ borderColor: imsColors.border }} />

      <MenuItem component={Link} href="/settings" onClick={onClose} sx={menuItemSx}>
        <ListItemIcon sx={{ minWidth: 32, color: imsColors.textMuted }}>
          <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />
        </ListItemIcon>
        <ListItemText primary={t("profileSettings")} />
      </MenuItem>

      <MenuItem component={Link} href="/settings/app" onClick={onClose} sx={menuItemSx}>
        <ListItemIcon sx={{ minWidth: 32, color: imsColors.textMuted }}>
          <SettingsOutlinedIcon sx={{ fontSize: 18 }} />
        </ListItemIcon>
        <ListItemText primary={t("appSettings")} />
      </MenuItem>

      <Divider sx={{ borderColor: imsColors.border }} />

      <ProfileLanguageMenu onChanged={onClose} />

      <Divider sx={{ borderColor: imsColors.border }} />

      <MenuItem
        onClick={() => {
          onClose();
          onLogout();
        }}
        sx={menuItemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: imsColors.textMuted }}>
          <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
        </ListItemIcon>
        <ListItemText primary={t("logout")} />
      </MenuItem>
    </Menu>
  );
}
