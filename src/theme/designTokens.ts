export const designTokens = {
  color: {
    pageBackground: "#F6F8F5",
    pageBackgroundAlt: "#F5F8F4",
    primary: "#3f8f00",
    primaryDark: "#1f7a00",
    primaryLight: "#eef8e8",
    textDark: "#101828",
    textMuted: "#667085",
    required: "#d92d20",
  },
  background: {
    global:
      "radial-gradient(circle at top left, rgba(92,170,37,0.08), transparent 35%), radial-gradient(circle at top right, rgba(63,143,0,0.05), transparent 30%), linear-gradient(180deg, #F7F9F5 0%, #F3F6F2 100%)",
  },
  surface: {
    card: "rgba(255,255,255,0.86)",
    cardSoft: "#FBFDF9",
    sidebar: "rgba(255,255,255,0.82)",
    input: "#ffffff",
    /** Fully opaque panels for Select/Menu/Popover — never use translucent card glass here. */
    menu: "#FFFFFF",
    /** Fully opaque Dialog / Modal paper — never inherit translucent card glass. */
    overlay: "#FFFFFF",
    overlayMuted: "#F8FAF7",
  },
  overlay: {
    backdrop: "rgba(15, 23, 42, 0.62)",
  },
  border: {
    default: "rgba(90,120,80,0.14)",
    subtle: "rgba(90,120,80,0.10)",
    focus: "rgba(63,143,0,0.35)",
    overlay: "rgba(15, 23, 42, 0.10)",
  },
  shadow: {
    soft: "0 8px 30px rgba(25,40,15,0.05)",
    card: "0 14px 40px rgba(25,40,15,0.07)",
    primaryButton: "0 10px 22px rgba(63,143,0,0.18)",
    sidebar: "0 10px 36px rgba(25,40,15,0.06)",
    menu: "0 12px 32px rgba(25,40,15,0.12), 0 2px 8px rgba(25,40,15,0.05)",
  },
  radius: {
    card: "22px",
    shell: "24px",
    button: "12px",
    input: "12px",
    sidebar: "22px",
    menu: "12px",
  },
  transition: {
    default: "0.18s ease",
    fast: "0.12s ease",
    layout: "0.22s ease",
  },
  table: {
    header: "#F8FBF6",
    row: "#FEFFFD",
    rowHover: "#F5FAF1",
    toolbar: "#F8FBF6",
  },
  blur: {
    surface: "blur(12px)",
  },
} as const;

export const imsGlobalBackgroundSx = {
  minHeight: "100vh",
  background: designTokens.background.global,
  backgroundAttachment: "fixed",
} as const;

export const imsGlassSurfaceSx = {
  backgroundColor: designTokens.surface.card,
  border: `1px solid ${designTokens.border.default}`,
  boxShadow: designTokens.shadow.card,
  backdropFilter: designTokens.blur.surface,
  WebkitBackdropFilter: designTokens.blur.surface,
} as const;

export const imsSidebarSurfaceSx = {
  backgroundColor: designTokens.surface.sidebar,
  border: `1px solid ${designTokens.border.default}`,
  boxShadow: designTokens.shadow.sidebar,
  backdropFilter: designTokens.blur.surface,
  WebkitBackdropFilter: designTokens.blur.surface,
  borderRadius: designTokens.radius.sidebar,
} as const;
