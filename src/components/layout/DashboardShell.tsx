"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, useSidebarLayout } from "@/components/layout/SidebarContext";
import { Box } from "@mui/material";

function DashboardMain({ children }: { children: React.ReactNode }) {
  const { mainOffset } = useSidebarLayout();

  return (
    <Box
      component="main"
      sx={{
        pl: { xs: 0, lg: `${mainOffset}px` },
        pt: { xs: 8, lg: 2 },
        pr: { xs: 2, lg: 2.5 },
        pb: { xs: 3, lg: 4 },
        transition: "padding-left 0.22s ease",
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Box className="app-background" sx={{ minHeight: "100vh" }}>
        <AppSidebar />
        <DashboardMain>{children}</DashboardMain>
      </Box>
    </SidebarProvider>
  );
}
