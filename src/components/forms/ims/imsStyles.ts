import { designTokens } from "@/theme/designTokens";

export const imsCardSx = {
  borderRadius: designTokens.radius.card,
  border: `1px solid ${designTokens.border.default}`,
  bgcolor: designTokens.surface.card,
  boxShadow: designTokens.shadow.card,
  backdropFilter: designTokens.blur.surface,
  WebkitBackdropFilter: designTokens.blur.surface,
} as const;

export const imsLabelSx = {
  fontSize: "0.6875rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  color: designTokens.color.textMuted,
  lineHeight: 1.4,
};

export const imsValueSx = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: designTokens.color.textDark,
  lineHeight: 1.5,
};

export const imsSectionTitleSx = {
  fontSize: "1rem",
  fontWeight: 700,
  lineHeight: 1.3,
  color: designTokens.color.textDark,
};

export const imsStickyColumnSx = {
  position: { lg: "sticky" as const },
  top: { lg: 16 },
  alignSelf: "start" as const,
};

export const imsTableContainerSx = {
  ...imsCardSx,
  borderRadius: designTokens.radius.card,
  overflow: "hidden",
} as const;

export const imsTableHeadSx = {
  bgcolor: designTokens.table.header,
};

export const imsTableRowSx = {
  bgcolor: designTokens.table.row,
  "&:hover": { bgcolor: designTokens.table.rowHover },
};

/** Shared opaque dropdown / menu panel — solid white, no glass bleed. */
export const imsMenuPaperSx = {
  backgroundColor: `${designTokens.surface.menu} !important`,
  backgroundImage: "none",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  opacity: 1,
  border: `1px solid ${designTokens.border.default}`,
  borderRadius: designTokens.radius.menu,
  boxShadow: designTokens.shadow.menu,
  overflow: "hidden",
} as const;

export const imsSelectMenuProps = {
  disablePortal: false,
  slotProps: {
    paper: {
      elevation: 0,
      sx: imsMenuPaperSx,
    },
    list: {
      sx: {
        py: 1,
      },
    },
  },
} as const;
