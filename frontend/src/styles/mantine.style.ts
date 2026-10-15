import { MantineThemeOverride, Tuple } from "@mantine/core";

// UCA look: dark warm background, ember-orange accent (shared with
// ai.ucagg.de, cad.ucagg.de and audio.ucagg.de).
export const ui = {
  bg: "#0d0907",
  bgSoft: "#140e0b",
  panel: "#17110e",
  panel2: "#1f1712",
  line: "rgba(255, 255, 255, 0.08)",
  lineStrong: "rgba(255, 138, 61, 0.5)",
  text: "#f4ece8",
  muted: "#a99c96",
  faint: "#857873",
  accent: "#ff8a3d",
  accent2: "#ffb26b",
  onAccent: "#1a0d06",
  font: '"Segoe UI Variable Text", "Segoe UI", Inter, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  mono: 'Consolas, "JetBrains Mono", ui-monospace, monospace',
};

const ember: Tuple<string, 10> = [
  "#fff3e8",
  "#ffe2c9",
  "#ffc898",
  "#ffb26b",
  "#ff9d50",
  "#ff8a3d",
  "#f2762a",
  "#d9621c",
  "#b34f14",
  "#8c3d0f",
];

// Mantine's dark palette, re-tinted warm. Index meaning in Mantine v6:
// 0 text, 1-2 dimmed text, 3 placeholders/icons, 4 borders, 5 hover,
// 6 inputs, 7 body/paper, 8-9 deeper surfaces.
const dark: Tuple<string, 10> = [
  ui.text,
  "#ddd1cb",
  ui.muted,
  ui.faint,
  "#33281f",
  "#2a201a",
  ui.panel2,
  ui.panel,
  ui.bgSoft,
  ui.bg,
];

const theme = <MantineThemeOverride>{
  colorScheme: "dark",
  colors: { ember, dark },
  primaryColor: "ember",
  primaryShade: 5,
  white: "#ffffff",
  black: ui.bg,
  fontFamily: ui.font,
  fontFamilyMonospace: ui.mono,
  defaultRadius: "md",
  radius: { xs: "6px", sm: "10px", md: "14px", lg: "16px", xl: "999px" },
  headings: {
    fontFamily: ui.font,
    fontWeight: 650,
  },
  shadows: {
    xs: "0 1px 2px rgba(0,0,0,.4)",
    sm: "0 6px 18px rgba(0,0,0,.35)",
    md: "0 12px 32px rgba(0,0,0,.4)",
    lg: "0 20px 60px rgba(0,0,0,.45)",
    xl: "0 28px 80px rgba(0,0,0,.5)",
  },
  components: {
    Button: {
      defaultProps: { radius: "xl" },
      styles: (
        _theme,
        params: { color?: string },
        { variant }: { variant?: string },
      ) => {
        const isPrimary = !params.color || params.color === "ember";
        const isFilled = !variant || variant === "filled";
        return {
          root: {
            fontWeight: 600,
            "&:disabled, &[data-disabled]": {
              backgroundColor: "rgba(255,255,255,.06)",
              backgroundImage: "none",
              boxShadow: "none",
              color: ui.faint,
              borderColor: "transparent",
            },
            ...(isPrimary && isFilled
              ? {
                  color: ui.onAccent,
                  backgroundImage: "linear-gradient(135deg, #ff9b4a, #ff6a2a)",
                  boxShadow: "0 8px 26px rgba(255,122,42,.22)",
                }
              : {}),
            ...(variant === "default"
              ? {
                  backgroundColor: "transparent",
                  borderColor: ui.line,
                  color: ui.text,
                  "&:hover": {
                    backgroundColor: "rgba(255,138,61,.06)",
                    borderColor: ui.lineStrong,
                  },
                }
              : {}),
          },
        };
      },
    },
    ActionIcon: {
      defaultProps: { radius: "xl" },
    },
    Paper: {
      styles: () => ({
        root: {
          backgroundColor: ui.panel,
          "&[data-with-border]": { borderColor: ui.line },
        },
      }),
    },
    Card: {
      styles: () => ({
        root: { backgroundColor: ui.panel, borderColor: ui.line },
      }),
    },
    Modal: {
      defaultProps: { radius: "lg", overlayProps: { blur: 2, opacity: 0.7 } },
      styles: (t) => ({
        title: {
          fontSize: t.fontSizes.lg,
          fontWeight: 650,
        },
        content: {
          backgroundColor: ui.panel,
          border: `1px solid ${ui.line}`,
        },
        header: { backgroundColor: ui.panel },
      }),
    },
    Input: {
      styles: () => ({
        input: {
          backgroundColor: ui.panel2,
          borderColor: ui.line,
          color: ui.text,
          "&:focus, &:focus-within": {
            borderColor: "rgba(255,138,61,.6)",
            boxShadow: "0 0 0 3px rgba(255,138,61,.15)",
          },
        },
      }),
    },
    InputWrapper: {
      styles: () => ({
        label: { color: ui.muted, fontWeight: 500, marginBottom: 4 },
        description: { color: ui.faint },
      }),
    },
    Menu: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel, borderColor: ui.line },
        item: { "&[data-hovered]": { backgroundColor: ui.panel2 } },
      }),
    },
    Popover: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel, borderColor: ui.line },
      }),
    },
    Select: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel, borderColor: ui.line },
        item: {
          "&[data-selected]": {
            backgroundColor: "rgba(255,138,61,.2)",
            color: ui.text,
          },
          "&[data-hovered]": { backgroundColor: ui.panel2 },
        },
      }),
    },
    MultiSelect: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel, borderColor: ui.line },
      }),
    },
    Table: {
      styles: () => ({
        root: {
          "& thead tr th": {
            color: ui.faint,
            fontWeight: 500,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            borderBottomColor: ui.line,
          },
          "& tbody tr td": { borderTopColor: ui.line },
        },
      }),
    },
    Tooltip: {
      styles: () => ({
        tooltip: { backgroundColor: ui.panel2, color: ui.text },
      }),
    },
    Notification: {
      styles: () => ({
        root: { backgroundColor: ui.panel, borderColor: ui.line },
      }),
    },
    Anchor: {
      styles: () => ({ root: { color: ui.accent2 } }),
    },
    Badge: {
      defaultProps: { radius: "xl" },
    },
    Header: {
      styles: () => ({
        root: {
          backgroundColor: "rgba(13, 9, 7, 0.82)",
          backdropFilter: "blur(10px)",
          borderBottomColor: ui.line,
        },
      }),
    },
    Footer: {
      styles: () => ({
        root: { backgroundColor: "transparent", borderTopColor: ui.line },
      }),
    },
    Navbar: {
      styles: () => ({
        root: { backgroundColor: ui.bgSoft, borderRightColor: ui.line },
      }),
    },
  },
};

export default theme;
