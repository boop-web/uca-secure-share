import { createStyles } from "@mantine/core";
import Link from "next/link";
import useConfig from "../hooks/config.hook";
import { ui } from "../styles/mantine.style";
import Logo from "./Logo";

const useStyles = createStyles(() => ({
  brand: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    color: ui.text,
    whiteSpace: "nowrap",
    "& b": { fontWeight: 600, fontSize: 15, letterSpacing: ".02em", display: "block", lineHeight: 1.1 },
    "& small": { display: "block", font: `500 9px/1 ${ui.mono}`, letterSpacing: ".22em", color: ui.faint, textTransform: "uppercase", marginTop: 4 },
    "&:hover b": { color: ui.text },
  },
}));

// "UCA Share" as one name (Nocturne: the accent is a line and a glow, not text colour)
export const BrandName = ({ name }: { name: string }) => <>{(name || "UCA Share").trim()}</>;

const Brand = () => {
  const { classes } = useStyles();
  const config = useConfig();
  return (
    <Link href="/" className={classes.brand} aria-label="Home">
      <Logo height={30} width={30} />
      <span>
        <b>
          <BrandName name={config.get("general.appName")} />
        </b>
        <small>Secure share</small>
      </span>
    </Link>
  );
};

export default Brand;
