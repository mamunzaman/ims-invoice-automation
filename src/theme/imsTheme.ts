"use client";

import { createTheme } from "@mui/material/styles";

export const imsColors = {
  background: "#f8faf7",
  card: "#ffffff",
  primary: "#3f8f00",
  primaryDark: "#1f7a00",
  primaryLight: "#eef8e8",
  border: "#dfe8d8",
  textDark: "#101828",
  textMuted: "#667085",
  required: "#d92d20",
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
      default: imsColors.background,
      paper: imsColors.card,
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
          backgroundColor: imsColors.background,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          fontWeight: 700,
          minHeight: 44,
          boxShadow: "none",
        },
        contained: {
          "&.MuiButton-colorPrimary": {
            background: `linear-gradient(180deg, ${imsColors.primary} 0%, ${imsColors.primaryDark} 100%)`,
            color: "#fff",
            boxShadow: "0 1px 2px rgba(63, 143, 0, 0.2)",
            "&:hover": {
              background: `linear-gradient(180deg, ${imsColors.primaryDark} 0%, #186800 100%)`,
              boxShadow: "0 2px 6px rgba(63, 143, 0, 0.24)",
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
          borderRadius: 20,
          border: `1px solid ${imsColors.border}`,
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.05)",
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
          borderRadius: 12,
          backgroundColor: "#fff",
          minHeight: imsInputHeight,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: imsColors.border,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#c5d4bc",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: imsColors.primary,
            borderWidth: 1.5,
          },
          "&.Mui-disabled": {
            backgroundColor: "#f9fbf8",
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
          color: imsColors.border,
          "&.Mui-checked": {
            color: imsColors.primary,
          },
        },
      },
    },
  },
});
