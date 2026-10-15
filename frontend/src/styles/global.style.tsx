import { Global } from "@mantine/core";
import { ui } from "./mantine.style";

const GlobalStyle = () => {
  return (
    <Global
      styles={() => ({
        "html, body": {
          backgroundColor: ui.bg,
          color: ui.text,
        },
        html: { overflowX: "hidden" },
        body: {
          minHeight: "100vh",
          overflowX: "hidden",
          background: `radial-gradient(1200px 600px at 70% -10%, rgba(255,138,61,.11), transparent 60%), ${ui.bg}`,
          backgroundAttachment: "fixed",
          WebkitFontSmoothing: "antialiased",
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
        "::selection": {
          background: "rgba(255,138,61,.3)",
          color: ui.text,
        },
        "*": {
          scrollbarColor: `#3a2d25 ${ui.bg}`,
        },
        "table.md, table.md th:nth-of-type(odd), table.md td:nth-of-type(odd)":
          {
            background: "rgba(255, 255, 255, 0.03)",
          },
        "table.md td": {
          paddingLeft: "0.5em",
          paddingRight: "0.5em",
        },
      })}
    />
  );
};
export default GlobalStyle;
