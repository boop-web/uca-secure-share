import { createStyles } from "@mantine/core";
import useConfig from "../../hooks/config.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import { ui } from "../../styles/mantine.style";

const useStyles = createStyles(() => ({
  footer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 18px",
    justifyContent: "center",
    padding: "26px 20px",
    marginTop: 40,
    color: ui.faint,
    fontSize: 13,
    borderTop: `1px solid ${ui.line}`,
    "& a": { color: ui.muted },
    "& a:hover": { color: ui.text },
  },
}));

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
      <span>© UCA · {host}</span>
      {config.get("legal.enabled") && hasImprint && (
        <a href={imprintUrl}>{t("imprint.title")}</a>
      )}
      {config.get("legal.enabled") && hasPrivacy && (
        <a href={privacyUrl}>{t("privacy.title")}</a>
      )}
      <a href="https://ucagg.de/" rel="noopener">
        More apps from UCA
      </a>
      <a href="https://ai.ucagg.de/" rel="noopener">
        UCA AI voice assistant for Windows
      </a>
      <a href="https://mesh.ucagg.de/" rel="noopener">
        UCA Mesh remote support
      </a>
      <a href="https://pdf.ucagg.de/" rel="noopener">
        UCA PDF Editor
      </a>
      <a href="https://audio.ucagg.de/" rel="noopener">
        UCA Audio
      </a>
    </footer>
  );
};

export default Footer;
