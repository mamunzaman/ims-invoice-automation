"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  sidebarMainOffset,
} from "@/components/layout/sidebarLayout";

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  sidebarWidth: number;
  mainOffset: number;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const SIDEBAR_CHANGE_EVENT = "ims-sidebar-change";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribeSidebar(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribeSidebar, readCollapsed, () => false);

  const toggleCollapsed = useCallback(() => {
    const next = !readCollapsed();
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
      sidebarWidth: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      mainOffset: sidebarMainOffset(collapsed),
    }),
    [collapsed, toggleCollapsed]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarLayout() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebarLayout must be used within SidebarProvider");
  }
  return ctx;
}
