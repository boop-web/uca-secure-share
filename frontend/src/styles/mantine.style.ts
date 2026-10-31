import { MantineThemeOverride, Tuple } from "@mantine/core";

// UCA look: Nocturne, the system UCA ID (ucagg.de/account) and UCA TV use - a near-neutral blue-grey ground, Inter at
// medium weight, 8px radii, and ONE blurple accent used as a line and a glow, never a flood. Primary buttons are
// outlined. The token names stay as before so every page picks the look up from here.
export const ui = {
  bg: "#161826",
  bgSoft: "#1a1c2a",
  panel: "#1e2030",
  panel2: "#232532",
  line: "#2c2f3c",
  lineStrong: "#3f424d",
  text: "#e9e9ed",
  muted: "#9397ab",
  faint: "#75798c",
  accent: "#9184d9",
  accent2: "#b5abfc",
  accent300: "#d2cefd",
  accent800: "#423a6a",
  accent900: "#2b2741",
  glow: "rgba(145,132,217,.42)",
  soft: "rgba(145,132,217,.12)",
  ok: "#7fd6a4",
  warn: "#e8c27a",
  danger: "#f08a96",
  onAccent: "#161826",
  orbRgb: "145,132,217",
  font: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
  ease: "cubic-bezier(.2,.7,.2,1)",
};

// the blurple scale (Mantine needs ten steps; 5 = the accent)
const nocturne: Tuple<string, 10> = [
  "#f1effe",
  "#e2defd",
  ui.accent300,
  ui.accent2,
  "#a397eb",
  ui.accent,
  "#7a6dc4",
  "#5f549c",
  ui.accent800,
  ui.accent900,
];

// Mantine's dark palette in Nocturne's surface tones. Index meaning in Mantine v6:
// 0 text, 1-2 dimmed text, 3 placeholders/icons, 4 borders, 5 hover, 6 inputs, 7 body/paper, 8-9 deeper surfaces.
const dark: Tuple<string, 10> = [
  ui.text,
  "#c9cad6",
  ui.muted,
  ui.faint,
  ui.lineStrong,
  "#2a2c3a",
  ui.panel2,
  ui.panel,
  ui.bgSoft,
  ui.bg,
];

const card = `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`;
const cardShadow = "0 1px 0 rgba(255,255,255,.03) inset, 0 20px 40px -30px rgba(0,0,0,.9)";

const theme = <MantineThemeOverride>{
  colorScheme: "dark",
  colors: { nocturne, dark },
  primaryColor: "nocturne",
  primaryShade: 5,
  white: "#ffffff",
  black: ui.bg,
  fontFamily: ui.font,
  fontFamilyMonospace: ui.mono,
  defaultRadius: "sm",
  radius: { xs: "6px", sm: "8px", md: "8px", lg: "14px", xl: "999px" },
  headings: {
    fontFamily: ui.font,
    fontWeight: 500,
  },
  shadows: {
    xs: "0 1px 2px rgba(0,0,0,.4)",
    sm: "0 8px 20px -10px rgba(0,0,0,.9)",
    md: "0 18px 40px -24px rgba(0,0,0,1)",
    lg: "0 24px 60px -30px rgba(0,0,0,1)",
    xl: "0 30px 80px -30px rgba(0,0,0,1)",
  },
  components: {
    Button: {
      defaultProps: { radius: "sm" },
      styles: (
        _theme,
        params: { color?: string },
        { variant }: { variant?: string },
      ) => {
        const isPrimary = !params.color || params.color === "nocturne";
        const isFilled = !variant || variant === "filled";
        return {
          root: {
            fontWeight: 500,
            transition: `transform .15s ${ui.ease}, box-shadow .25s ${ui.ease}, background-color .2s, border-color .2s, color .2s`,
            "&:active:not([data-disabled])": { transform: "scale(.98)" },
            "&:disabled, &[data-disabled]": {
              backgroundColor: "rgba(255,255,255,.04)",
              backgroundImage: "none",
              boxShadow: "none",
              color: ui.faint,
              borderColor: ui.line,
            },
            // the Nocturne primary: an outline in the accent with a soft glow, filled only on hover
            ...(isPrimary && isFilled
              ? {
                  color: ui.accent300,
                  backgroundColor: "transparent",
                  border: `1px solid ${ui.accent}`,
                  boxShadow: `0 0 24px -12px ${ui.glow}`,
                  "&:hover:not([data-disabled])": {
                    backgroundColor: ui.accent900,
                    boxShadow: `0 0 28px -10px ${ui.glow}`,
                  },
                  "&:active:not([data-disabled])": { backgroundColor: ui.accent800 },
                }
              : {}),
            ...(variant === "default"
              ? {
                  backgroundColor: ui.panel2,
                  borderColor: ui.lineStrong,
                  color: ui.text,
                  "&:hover:not([data-disabled])": {
                    backgroundColor: "#2a2c3a",
                    borderColor: ui.faint,
                  },
                }
              : {}),
            ...(variant === "light" && isPrimary
              ? {
                  backgroundColor: ui.soft,
                  color: ui.accent300,
                  "&:hover:not([data-disabled])": { backgroundColor: "rgba(145,132,217,.2)" },
                }
              : {}),
          },
        };
      },
    },
    ActionIcon: {
      defaultProps: { radius: "sm" },
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
      defaultProps: { radius: "lg" },
      styles: () => ({
        root: {
          backgroundImage: card,
          backgroundColor: ui.panel,
          border: `1px solid ${ui.line}`,
          boxShadow: cardShadow,
        },
      }),
    },
    Modal: {
      defaultProps: { radius: "lg", overlayProps: { blur: 3, opacity: 0.72, color: "#0b0c14" } },
      styles: (t) => ({
        title: {
          fontSize: t.fontSizes.lg,
          fontWeight: 500,
        },
        content: {
          backgroundImage: card,
          backgroundColor: ui.panel,
          border: `1px solid ${ui.line}`,
          boxShadow: "0 30px 80px -30px rgba(0,0,0,1)",
        },
        header: { backgroundColor: "transparent" },
      }),
    },
    Input: {
      styles: () => ({
        input: {
          backgroundColor: ui.bgSoft,
          borderColor: ui.lineStrong,
          color: ui.text,
          transition: "border-color .2s, box-shadow .2s",
          "&::placeholder": { color: ui.faint },
          "&:focus, &:focus-within": {
            borderColor: ui.accent,
            boxShadow: `0 0 0 3px ${ui.soft}`,
          },
        },
      }),
    },
    InputWrapper: {
      styles: () => ({
        label: { color: ui.muted, fontWeight: 500, fontSize: 13, marginBottom: 6 },
        description: { color: ui.faint },
      }),
    },
    Checkbox: { styles: () => ({ input: { backgroundColor: ui.bgSoft, borderColor: ui.lineStrong } }) },
    Switch: { styles: () => ({ track: { backgroundColor: ui.bgSoft, borderColor: ui.lineStrong } }) },
    Menu: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel2, borderColor: ui.line, boxShadow: "0 18px 40px -20px rgba(0,0,0,1)" },
        item: { "&[data-hovered]": { backgroundColor: "#2a2c3a" } },
      }),
    },
    Popover: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel2, borderColor: ui.line },
      }),
    },
    Select: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel2, borderColor: ui.line },
        item: {
          "&[data-selected]": {
            backgroundColor: ui.accent900,
            color: ui.accent300,
          },
          "&[data-hovered]": { backgroundColor: "#2a2c3a" },
        },
      }),
    },
    MultiSelect: {
      styles: () => ({
        dropdown: { backgroundColor: ui.panel2, borderColor: ui.line },
      }),
    },
    Tabs: {
      styles: () => ({
        tab: {
          fontWeight: 500,
          color: ui.muted,
          "&[data-active]": { color: ui.text, borderColor: ui.accent },
        },
      }),
    },
    SegmentedControl: {
      styles: () => ({
        root: { backgroundColor: ui.bgSoft, border: `1px solid ${ui.line}` },
        indicator: { backgroundColor: ui.panel2, borderBottom: `1px solid ${ui.accent}` },
      }),
    },
    Table: {
      styles: () => ({
        root: {
          "& thead tr th": {
            color: ui.faint,
            fontFamily: ui.mono,
            fontWeight: 500,
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: ".14em",
            borderBottomColor: ui.line,
          },
          "& tbody tr td": { borderTopColor: ui.line },
          "& tbody tr": { transition: "background-color .2s" },
          "& tbody tr:hover": { backgroundColor: "rgba(145,132,217,.04)" },
        },
      }),
    },
    Tooltip: {
      styles: () => ({
        tooltip: { backgroundColor: ui.panel2, color: ui.text, border: `1px solid ${ui.line}` },
      }),
    },
    // alerts: a tinted line on the dark ground, never a coloured flood
    Alert: {
      styles: (t, params: { color?: string }) => {
        const c = t.fn.themeColor(params.color || "nocturne", 5);
        return {
          root: { backgroundColor: t.fn.rgba(c, 0.07), border: `1px solid ${t.fn.rgba(c, 0.35)}` },
          title: { fontWeight: 500, color: ui.text },
          message: { color: ui.muted },
        };
      },
    },
    Notification: {
      styles: () => ({
        root: { backgroundColor: ui.panel2, borderColor: ui.line, boxShadow: "0 18px 40px -20px rgba(0,0,0,1)" },
      }),
    },
    Anchor: {
      styles: () => ({ root: { color: ui.accent2, "&:hover": { color: ui.accent } } }),
    },
    Badge: {
      defaultProps: { radius: "xl", variant: "outline" },
      styles: () => ({ root: { fontFamily: ui.mono, fontWeight: 500, letterSpacing: ".1em" } }),
    },
    Progress: {
      styles: () => ({ root: { backgroundColor: ui.bgSoft } }),
    },
    Header: {
      styles: () => ({
        root: {
          backgroundColor: "rgba(22, 24, 38, 0.8)",
          backdropFilter: "blur(12px)",
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
