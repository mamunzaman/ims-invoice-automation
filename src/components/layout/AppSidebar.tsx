"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Card,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AccountBalanceOutlinedIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardOutlinedIcon,
  DescriptionOutlinedIcon,
  HeadsetMicOutlinedIcon,
  MenuIcon,
  MoreHorizIcon,
  PeopleOutlineOutlinedIcon,
  ReceiptLongOutlinedIcon,
  SettingsOutlinedIcon,
} from "@/components/icons/muiIcons";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { useSidebarLayout } from "@/components/layout/SidebarContext";
import { SIDEBAR_GUTTER } from "@/components/layout/sidebarLayout";
import { createClient } from "@/lib/supabase/client";
import { imsColors } from "@/theme/imsTheme";

type NavKey = "dashboard" | "invoices" | "customers" | "templates" | "bankAccounts" | "settings";

const navItems: { href: string; key: NavKey; icon: typeof DashboardOutlinedIcon }[] = [
  { href: "/dashboard", key: "dashboard", icon: DashboardOutlinedIcon },
  { href: "/invoices", key: "invoices", icon: ReceiptLongOutlinedIcon },
  { href: "/customers", key: "customers", icon: PeopleOutlineOutlinedIcon },
  { href: "/settings#vorlagen", key: "templates", icon: DescriptionOutlinedIcon },
  { href: "/settings#bankkonten", key: "bankAccounts", icon: AccountBalanceOutlinedIcon },
  { href: "/settings", key: "settings", icon: SettingsOutlinedIcon },
];

function isNavItemActive(pathname: string, hash: string, item: (typeof navItems)[number]): boolean {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    if (item.key === "templates") return hash === "#vorlagen";
    if (item.key === "bankAccounts") return hash === "#bankkonten";
    if (item.key === "settings") return !hash;
    return false;
  }

  const baseHref = item.href.split("#")[0];
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState("");
  const [userLabel, setUserLabel] = useState(tCommon("appName"));
  const [userEmail, setUserEmail] = useState("");
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const name =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        tCommon("user");
      setUserLabel(name);
      setUserEmail(user.email || "");
    });
  }, [tCommon]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function openProfileMenu(event: React.MouseEvent<HTMLElement>) {
    setProfileMenuAnchor(event.currentTarget);
  }

  return (
    <Stack sx={{ height: "100%", p: collapsed ? 1.25 : 1.75 }} spacing={collapsed ? 1.25 : 1.75}>
      <Stack
        direction="row"
        spacing={collapsed ? 0 : 1.25}
        sx={{
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          px: collapsed ? 0 : 0.25,
          py: 0.25,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            bgcolor: imsColors.primaryLight,
            color: imsColors.primary,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <ReceiptLongOutlinedIcon sx={{ fontSize: 19 }} />
        </Box>
        {!collapsed ? (
          <Box sx={{ minWidth: 0, pr: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: imsColors.textDark, lineHeight: 1.2 }}>
              {t("invoices")}
            </Typography>
            <Typography sx={{ fontSize: 11, color: imsColors.textMuted }}>{tCommon("appName")}</Typography>
          </Box>
        ) : null}
      </Stack>

      <Stack spacing={0.35} sx={{ flex: 1 }}>
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, hash, item);
          const Icon = item.icon;
          const label = t(item.key);

          const link = (
            <Box
              component={Link}
              href={item.href}
              onClick={onNavigate}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 1.1,
                px: collapsed ? 0.85 : 1.15,
                py: 0.85,
                borderRadius: 2,
                textDecoration: "none",
                color: active ? imsColors.primaryDark : imsColors.textMuted,
                bgcolor: active ? imsColors.primaryLight : "transparent",
                border: `1px solid ${active ? imsColors.border : "transparent"}`,
                fontWeight: active ? 600 : 500,
                fontSize: 12.5,
                transition: "background-color 0.15s ease, border-color 0.15s ease",
                "&:hover": {
                  bgcolor: active ? imsColors.primaryLight : "rgba(238, 248, 232, 0.55)",
                },
              }}
            >
              <Icon sx={{ fontSize: 18, color: active ? imsColors.primary : imsColors.textMuted }} />
              {!collapsed ? label : null}
            </Box>
          );

          return collapsed ? (
            <Tooltip key={item.key} title={label} placement="right" arrow>
              {link}
            </Tooltip>
          ) : (
            <Box key={item.key}>{link}</Box>
          );
        })}
      </Stack>

      {!collapsed ? (
        <Stack spacing={1}>
          <Card variant="outlined" sx={{ borderRadius: 2, borderColor: imsColors.border, boxShadow: "none" }}>
            <Stack direction="row" spacing={0.85} sx={{ alignItems: "center", p: 1.15 }}>
              <HeadsetMicOutlinedIcon sx={{ color: imsColors.primary, fontSize: 15 }} />
              <Typography sx={{ fontWeight: 600, fontSize: 12 }}>{t("help")}</Typography>
            </Stack>
          </Card>

          <Card
            variant="outlined"
            onClick={openProfileMenu}
            sx={{
              borderRadius: 2,
              borderColor: imsColors.border,
              boxShadow: "none",
              cursor: "pointer",
              transition: "background-color 0.12s ease, border-color 0.12s ease",
              "&:hover": {
                bgcolor: "rgba(16, 24, 40, 0.02)",
                borderColor: "rgba(16, 24, 40, 0.12)",
              },
            }}
          >
            <Stack direction="row" spacing={0.85} sx={{ alignItems: "center", p: 1.15 }}>
              <Avatar sx={{ bgcolor: imsColors.primary, width: 30, height: 30, fontSize: 11 }}>
                {userLabel.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 12 }} noWrap>
                  {userLabel}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 10 }} noWrap>
                  {userEmail || tCommon("appName")}
                </Typography>
              </Box>
              <MoreHorizIcon sx={{ fontSize: 18, color: imsColors.textMuted }} />
            </Stack>
          </Card>
        </Stack>
      ) : (
        <Stack spacing={0.75} sx={{ alignItems: "center", pb: 0.25 }}>
          <Tooltip title={userLabel} placement="right">
            <Avatar
              sx={{
                bgcolor: imsColors.primary,
                width: 30,
                height: 30,
                fontSize: 11,
                cursor: "pointer",
                transition: "opacity 0.12s ease",
                "&:hover": { opacity: 0.9 },
              }}
              onClick={openProfileMenu}
            >
              {userLabel.slice(0, 2).toUpperCase()}
            </Avatar>
          </Tooltip>
        </Stack>
      )}

      <UserProfileMenu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
        userLabel={userLabel}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
    </Stack>
  );
}

export function AppSidebar() {
  const t = useTranslations("navigation");
  const tInvoice = useTranslations("invoice");
  const { collapsed, toggleCollapsed, sidebarWidth } = useSidebarLayout();

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          display: { lg: "none" },
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: "#fff",
          borderBottom: `1px solid ${imsColors.border}`,
          px: 2,
          py: 1.25,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{tInvoice("title")}</Typography>
          <IconButton onClick={() => setMobileOpen(true)} aria-label={t("openMenu")}>
            <MenuIcon />
          </IconButton>
        </Stack>
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: 260,
            border: "none",
            bgcolor: "#fff",
          },
        }}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box
        component="aside"
        sx={{
          display: { xs: "none", lg: "block" },
          position: "fixed",
          top: SIDEBAR_GUTTER,
          left: SIDEBAR_GUTTER,
          bottom: SIDEBAR_GUTTER,
          width: sidebarWidth,
          zIndex: 1100,
          transition: "width 0.22s ease",
        }}
      >
        <Card
          sx={{
            height: "100%",
            borderRadius: "22px",
            border: `1px solid ${imsColors.border}`,
            boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <IconButton
            onClick={toggleCollapsed}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            size="small"
            sx={{
              position: "absolute",
              top: 10,
              right: 8,
              zIndex: 2,
              width: 28,
              height: 28,
              bgcolor: "#fff",
              border: `1px solid ${imsColors.border}`,
              color: imsColors.textMuted,
              "&:hover": { bgcolor: imsColors.primaryLight, color: imsColors.primaryDark },
            }}
          >
            {collapsed ? <ChevronRightIcon sx={{ fontSize: 18 }} /> : <ChevronLeftIcon sx={{ fontSize: 18 }} />}
          </IconButton>

          <Box sx={{ height: "100%", overflow: "auto", pt: 4.5 }}>
            <SidebarContent collapsed={collapsed} />
          </Box>
        </Card>
      </Box>
    </>
  );
}
