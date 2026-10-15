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
    fontSize: 17,
    letterSpacing: ".02em",
    whiteSpace: "nowrap",
    "& b": { color: ui.accent, fontWeight: 600 },
  },
}));

// "UCA Share" -> UCA <b>Share</b> (last word in the accent colour)
export const BrandName = ({ name }: { name: string }) => {
  const words = (name || "UCA Share").trim().split(/\s+/);
  if (words.length < 2) return <b>{words[0]}</b>;
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <b>{last}</b>
    </>
  );
};

const Brand = () => {
  const { classes } = useStyles();
  const config = useConfig();
  return (
    <Link href="/" className={classes.brand} aria-label="Home">
      <Logo height={30} width={30} />
      <span>
        <BrandName name={config.get("general.appName")} />
      </span>
    </Link>
  );
};

export default Brand;
