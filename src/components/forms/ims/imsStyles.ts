import { imsColors } from "@/theme/imsTheme";

export const imsCardSx = {
  borderRadius: "20px",
  border: `1px solid ${imsColors.border}`,
  bgcolor: "#fff",
  boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)",
} as const;

export const imsStickyColumnSx = {
  position: { lg: "sticky" as const },
  top: { lg: 16 },
  alignSelf: "start" as const,
};
