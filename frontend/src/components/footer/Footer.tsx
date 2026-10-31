import { createStyles } from "@mantine/core";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import { ui } from "../../styles/mantine.style";
import Brand from "../Brand";

const useStyles = createStyles((theme) => ({
  footer: {
    marginTop: 56,
    borderTop: `1px solid ${ui.line}`,
    background: "linear-gradient(180deg, rgba(26,28,42,.6), rgba(22,24,38,0))",
  },
  inner: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "30px 16px 26px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) repeat(2, minmax(0, 1fr))",
    gap: 28,
    [theme.fn.smallerThan("sm")]: { gridTemplateColumns: "1fr 1fr", gap: 22 },
  },
  about: {
    [theme.fn.smallerThan("sm")]: { gridColumn: "1 / -1" },
    "& p": { color: ui.muted, fontSize: 13, lineHeight: 1.6, margin: "12px 0 0", maxWidth: 340 },
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 13.5,
    "& h4": { font: `500 10px/1 ${ui.mono}`, letterSpacing: ".22em", textTransform: "uppercase", color: ui.faint, margin: "0 0 6px" },
    "& a": { color: ui.muted, transition: "color .15s", width: "fit-content" },
    "& a:hover": { color: ui.text },
  },
  bottom: {
    maxWidth: 1040,
    margin: "0 auto",
    padding: "14px 16px 26px",
    borderTop: `1px solid ${ui.line}`,
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 18px",
    justifyContent: "space-between",
    color: ui.faint,
    fontSize: 12.5,
    "& a": { color: ui.muted },
    "& a:hover": { color: ui.text },
  },
}));

// the other UCA apps (no third-party names); UCA ID is the one account across them
const APPS: [string, string][] = [
  ["UCA AI", "https://ai.ucagg.de/"],
  ["UCA PDF Editor", "https://pdf.ucagg.de/"],
  ["UCA Tidy Organizer", "https://tidy.ucagg.de/"],
  ["UCA Mesh", "https://mesh.ucagg.de/"],
  ["UCA Audio", "https://audio.ucagg.de/"],
  ["UCA TV", "https://iptv.ucagg.de/"],
];

const Footer = () => {
  const t = useTranslate();
  const config = useConfig();
  const { classes } = useStyles();

  const hasImprint = !!(
    config.get("legal.imprintUrl") || config.get("legal.imprintText")
  );
  const hasPrivacy = !!(
    config.get("legal.privacyPolicyUrl") ||
    config.get("legal.privacyPolicyText")
  );
  const imprintUrl =
    (!config.get("legal.imprintText") && config.get("legal.imprintUrl")) ||
    "/imprint";
  const privacyUrl =
    (!config.get("legal.privacyPolicyText") &&
      config.get("legal.privacyPolicyUrl")) ||
    "/privacy";

  let host = "share.ucagg.de";
  try {
    host = new URL(config.get("general.appUrl")).host || host;
  } catch {
    /* keep default */
  }

  return (
    <footer className={classes.footer}>
      <div className={classes.inner}>
        <div className={classes.about}>
          <Brand />
          <p>
            Send big files with a private link - with an expiry, a password or
            a download limit. Part of UCA, made by one person; the files stay
            on UCA&apos;s own server (IONOS, Kansas City, USA).
          </p>
        </div>
        <nav className={classes.col} aria-label="UCA">
          <h4>UCA</h4>
          <a href="https://ucagg.de/account" rel="noopener">
            UCA ID · your account
          </a>
          <a href="https://ucagg.de/" rel="noopener">
            All UCA apps
          </a>
          <a href="/#faq">Questions</a>
          {config.get("legal.enabled") && hasImprint && (
            <a href={imprintUrl}>{t("imprint.title")}</a>
          )}
          {config.get("legal.enabled") && hasPrivacy && (
            <a href={privacyUrl}>{t("privacy.title")}</a>
          )}
        </nav>
        <nav className={classes.col} aria-label="More from UCA">
          <h4>More from UCA</h4>
          {APPS.map(([name, url]) => (
            <a key={url} href={url} rel="noopener">
              {name}
            </a>
          ))}
        </nav>
      </div>
      <div className={classes.bottom}>
        <span>© UCA · {host}</span>
        <span>Free · no ads · no tracking</span>
      </div>
    </footer>
  );
};

export default Footer;
