import { Button, createStyles } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Meta from "../components/Meta";
import useConfig from "../hooks/config.hook";
import useUser from "../hooks/user.hook";
import homepageService from "../services/homepage.service";
import { ui } from "../styles/mantine.style";
import { HOMEPAGE_DEFAULTS, resolveHomepage } from "../utils/homepage.util";

const useStyles = createStyles((theme) => ({
  hero: {
    textAlign: "center",
    padding: "48px 0 34px",
    [theme.fn.smallerThan("sm")]: { padding: "20px 0 24px" },
  },
  kicker: {
    color: ui.accent,
    letterSpacing: ".16em",
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: 600,
    margin: "0 0 14px",
  },
  title: {
    fontSize: "clamp(32px, 6vw, 54px)",
    lineHeight: 1.08,
    fontWeight: 700,
    letterSpacing: "-.02em",
    margin: "0 0 18px",
    color: ui.text,
    overflowWrap: "break-word",
    "& span": { color: ui.accent },
  },
  lead: {
    maxWidth: 620,
    margin: "0 auto 28px",
    color: ui.muted,
    fontSize: 17,
    lineHeight: 1.55,
    [theme.fn.smallerThan("sm")]: { fontSize: 16 },
  },
  cta: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    margin: "34px 0 18px",
    [theme.fn.smallerThan("sm")]: { gridTemplateColumns: "1fr" },
  },
  card: {
    background: ui.panel,
    border: `1px solid ${ui.line}`,
    borderRadius: 16,
    padding: 20,
    "& h3": { margin: "0 0 6px", fontSize: 16, fontWeight: 600 },
    "& p": { margin: 0, color: ui.muted, fontSize: 14, lineHeight: 1.55 },
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    marginBottom: 12,
    background: "rgba(255,138,61,.12)",
    "& svg": {
      width: 18,
      height: 18,
      stroke: ui.accent,
      fill: "none",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
  },
  note: {
    background: ui.panel,
    border: `1px solid ${ui.line}`,
    borderRadius: 16,
    padding: "20px 22px",
    margin: "0 0 10px",
    "& h3": { margin: "0 0 6px", fontSize: 15, fontWeight: 600 },
    "& p": { margin: 0, color: ui.muted, fontSize: 13.5, lineHeight: 1.6 },
  },
}));

const icons = [
  // lock
  <svg key="lock" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>,
  // heart / free
  <svg key="free" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>,
  // clock
  <svg key="clock" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>,
];

export default function Home() {
  const { classes } = useStyles();
  const { user } = useUser();
  const router = useRouter();
  const config = useConfig();
  const [content, setContent] = useState(HOMEPAGE_DEFAULTS);

  useEffect(() => {
    if (user) {
      router.replace("/upload");
      return;
    }
    if (config.get("general.showHomePage") === false) {
      router.replace("/upload");
      return;
    }
    homepageService
      .get()
      .then((data) => setContent(resolveHomepage(data)))
      .catch(() => {});
  }, []);

  const [titleMain, ...titleRest] = content.title.split("\n");
  const cards = [
    [content.bullet1Name, content.bullet1Desc],
    [content.bullet2Name, content.bullet2Desc],
    [content.bullet3Name, content.bullet3Desc],
  ].filter(([name]) => name);

  return (
    <>
      <Meta title="UCA Share - private file sharing" fullTitle />
      <section className={classes.hero}>
        <p className={classes.kicker}>Private file sharing</p>
        <h1 className={classes.title}>
          {titleMain}
          {titleRest.length > 0 && (
            <>
              <br />
              <span>{titleRest.join(" ")}</span>
            </>
          )}
        </h1>
        <p className={classes.lead}>{content.description}</p>
        <div className={classes.cta}>
          <Button component={Link} href="/upload" size="md">
            {content.buttonText}
          </Button>
          <Button
            component={Link}
            href="/auth/signIn"
            size="md"
            variant="default"
          >
            Sign in
          </Button>
        </div>
      </section>

      <section className={classes.grid}>
        {cards.map(([name, desc], i) => (
          <article className={classes.card} key={i}>
            <div className={classes.icon}>{icons[i]}</div>
            <h3>{name}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </section>

      <section className={classes.note}>
        <h3>German law applies</h3>
        <p>
          Every share must comply with German law, including the StGB and the
          NetzDG. Not allowed: hate speech, symbols of unconstitutional
          organisations (§ 86a StGB), child sexual abuse material (§ 184b
          StGB), malware and ransomware, copyright infringement and violent
          extremist content. Illegal shares are removed immediately, and the
          data kept about the upload (IP address, logs and timestamps from the
          moment of upload) is handed to law enforcement.
        </p>
      </section>
    </>
  );
}
