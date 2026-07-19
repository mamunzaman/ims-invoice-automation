"use client";

import { createTheme } from "@mui/material/styles";
import { designTokens } from "@/theme/designTokens";

export const imsColors = {
  background: designTokens.color.pageBackground,
  card: designTokens.surface.card,
  primary: designTokens.color.primary,
  primaryDark: designTokens.color.primaryDark,
  primaryLight: designTokens.color.primaryLight,
  border: designTokens.border.default,
  textDark: designTokens.color.textDark,
  textMuted: designTokens.color.textMuted,
  required: designTokens.color.required,
} as const;

export const imsInputHeight = 46;

export const imsTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: imsColors.primary,
      dark: imsColors.primaryDark,
      light: imsColors.primaryLight,
      contrastText: "#ffffff",
    },
    success: {
      main: imsColors.primary,
      light: imsColors.primaryLight,
      dark: imsColors.primaryDark,
    },
    background: {
      default: designTokens.color.pageBackground,
      paper: designTokens.surface.card,
    },
    text: {
      primary: imsColors.textDark,
      secondary: imsColors.textMuted,
    },
    divider: imsColors.border,
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), "Segoe UI", system-ui, sans-serif',
    h4: { fontWeight: 700, color: imsColors.textDark },
    h5: { fontWeight: 700, color: imsColors.textDark },
    h6: { fontWeight: 600, color: imsColors.textDark, fontSize: "1rem" },
    body2: { color: imsColors.textMuted, fontSize: "0.8125rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: designTokens.background.global,
          backgroundAttachment: "fixed",
          backgroundColor: designTokens.color.pageBackground,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: designTokens.radius.button,
          fontWeight: 700,
          minHeight: 44,
          boxShadow: "none",
          transition: `transform ${designTokens.transition.fast}, box-shadow ${designTokens.transition.fast}, background-color ${designTokens.transition.fast}`,
        },
        contained: {
          "&.MuiButton-colorPrimary": {
            background: `linear-gradient(180deg, ${imsColors.primary} 0%, ${imsColors.primaryDark} 100%)`,
            color: "#fff",
            boxShadow: designTokens.shadow.primaryButton,
            "&:hover": {
              background: `linear-gradient(180deg, ${imsColors.primaryDark} 0%, #186800 100%)`,
              boxShadow: designTokens.shadow.primaryButton,
              transform: "translateY(-1px)",
            },
            "&:active": {
              transform: "translateY(0)",
            },
            "&.Mui-disabled": {
              background: "#e4e7ec",
              color: imsColors.textMuted,
              boxShadow: "none",
            },
          },
        },
        outlined: {
          borderColor: imsColors.border,
          color: imsColors.textDark,
          bgcolor: designTokens.surface.card,
          "&:hover": {
            borderColor: imsColors.primary,
            bgcolor: imsColors.primaryLight,
          },
        },
        text: {
          color: imsColors.primaryDark,
          "&:hover": {
            bgcolor: imsColors.primaryLight,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.card,
          border: `1px solid ${designTokens.border.default}`,
          boxShadow: designTokens.shadow.card,
          backgroundColor: designTokens.surface.card,
          backgroundImage: "none",
          backdropFilter: designTokens.blur.surface,
          WebkitBackdropFilter: designTokens.blur.surface,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: `${designTokens.surface.overlay} !important`,
          backgroundImage: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          opacity: 1,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: designTokens.overlay.backdrop,
        },
        invisible: {
          backgroundColor: "transparent",
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: designTokens.surface.menu,
          backgroundImage: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          opacity: 1,
          border: `1px solid ${designTokens.border.default}`,
          borderRadius: designTokens.radius.menu,
          boxShadow: designTokens.shadow.menu,
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        paper: {
          backgroundColor: `${designTokens.surface.menu} !important`,
          backgroundImage: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          opacity: 1,
          border: `1px solid ${designTokens.border.default}`,
          borderRadius: designTokens.radius.menu,
          boxShadow: designTokens.shadow.menu,
          overflow: "hidden",
        },
        list: {
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 40,
          marginLeft: 6,
          marginRight: 6,
          marginTop: 2,
          marginBottom: 2,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 8,
          fontSize: "0.875rem",
          fontWeight: 500,
          color: imsColors.textDark,
          transition: `background-color ${designTokens.transition.fast}`,
          "&:hover": {
            backgroundColor: designTokens.color.primaryLight,
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(63,143,0,0.12)",
            color: imsColors.primaryDark,
            fontWeight: 600,
            "&:hover": {
              backgroundColor: "rgba(63,143,0,0.18)",
            },
          },
          "&.Mui-focusVisible": {
            backgroundColor: designTokens.color.primaryLight,
            outline: `2px solid ${imsColors.primary}`,
            outlineOffset: -2,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        fullWidth: true,
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: imsColors.textMuted,
          "&.Mui-focused": {
            color: imsColors.primaryDark,
          },
          "& .MuiFormLabel-asterisk": {
            color: imsColors.required,
            opacity: 0.85,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: designTokens.radius.input,
          backgroundColor: designTokens.surface.input,
          minHeight: imsInputHeight,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: designTokens.border.default,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(90,120,80,0.22)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: imsColors.primary,
            borderWidth: 1.5,
          },
          "&.Mui-disabled": {
            backgroundColor: designTokens.surface.cardSoft,
          },
          "& textarea": {
            padding: "12px 14px",
            lineHeight: 1.5,
          },
        },
        input: {
          padding: "11px 14px",
          fontSize: "0.875rem",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginTop: 6,
          fontSize: "0.75rem",
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          disablePortal: false,
          slotProps: {
            paper: {
              elevation: 0,
            },
            list: {
              sx: { py: 1 },
            },
          },
        },
      },
      styleOverrides: {
        select: {
          minHeight: "unset !important",
          display: "flex",
          alignItems: "center",
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: designTokens.border.default,
          "&.Mui-checked": {
            color: imsColors.primary,
          },
        },
      },
    },
  },
});
