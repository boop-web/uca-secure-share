import { Global } from "@mantine/core";
import { ui } from "./mantine.style";

// Nocturne ground: the blue-grey base with one faint blurple light from the top, like ucagg.de/account
const GlobalStyle = () => {
  return (
    <Global
      styles={() => ({
        ":root": {
          "--orb-rgb": ui.orbRgb,
          "--orb-light": "210,206,253",
          colorScheme: "dark",
        },
        "html, body": {
          backgroundColor: ui.bg,
          color: ui.text,
        },
        html: { overflowX: "hidden", WebkitTextSizeAdjust: "100%" },
        body: {
          minHeight: "100vh",
          overflowX: "hidden",
          background: `radial-gradient(60% 40% at 30% -10%, rgba(145,132,217,.12), transparent 70%), linear-gradient(180deg, #1a1c2c, ${ui.bg} 60%)`,
          backgroundColor: ui.bg,
          backgroundAttachment: "fixed",
          WebkitFontSmoothing: "antialiased",
          fontFeatureSettings: '"cv11", "ss01"',
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
        ":focus-visible": {
          outline: `2px solid ${ui.accent}`,
          outlineOffset: 2,
          borderRadius: 6,
        },
        "::selection": {
          background: "rgba(145,132,217,.3)",
          color: ui.text,
        },
        "*": {
          scrollbarColor: `${ui.lineStrong} ${ui.bg}`,
        },
        "h1, h2, h3, h4": { letterSpacing: "-.01em", textWrap: "pretty" as any },
        "table.md, table.md th:nth-of-type(odd), table.md td:nth-of-type(odd)":
          {
            background: "rgba(255, 255, 255, 0.03)",
          },
        "table.md td": {
          paddingLeft: "0.5em",
          paddingRight: "0.5em",
        },
        // every page eases in (cheap: opacity + transform on one wrapper)
        "@keyframes ucaRise": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "none" },
        },
        ".uca-page": { animation: `ucaRise .45s ${ui.ease} both` },
        "@media (prefers-reduced-motion: reduce)": {
          ".uca-page": { animation: "none" },
        },
      })}
    />
  );
};
export default GlobalStyle;
