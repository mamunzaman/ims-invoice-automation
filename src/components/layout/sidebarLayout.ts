export const SIDEBAR_STORAGE_KEY = "ims.sidebar.collapsed";

export const SIDEBAR_WIDTH_EXPANDED = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 84;
export const SIDEBAR_GUTTER = 16;

export function sidebarMainOffset(collapsed: boolean): number {
  return (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED) + SIDEBAR_GUTTER * 2;
}
