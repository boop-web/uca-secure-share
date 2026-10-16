import { Button, createStyles, keyframes } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import ShareScene from "../components/home/ShareScene";
import Meta from "../components/Meta";
import useConfig from "../hooks/config.hook";
import useUser from "../hooks/user.hook";
import homepageService from "../services/homepage.service";
import { ui } from "../styles/mantine.style";
import { HOMEPAGE_DEFAULTS, resolveHomepage } from "../utils/homepage.util";

const rise = keyframes({ from: { opacity: 0, transform: "translateY(14px)" }, to: { opacity: 1, transform: "none" } });
const drift = keyframes({
  "0%, 100%": { transform: "translate(0, 0) scale(1)" },
  "50%": { transform: "translate(30px, -18px) scale(1.12)" },
});
const iconPulse = keyframes({
  "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,138,61,0)" },
  "50%": { boxShadow: "0 0 18px 2px rgba(255,138,61,.28)" },
});

const useStyles = createStyles((theme) => ({
  // the hero rises in on load; later sections ease in as they scroll into view (see useReveal)
  hero: {
    position: "relative",
    textAlign: "center",
    padding: "48px 0 34px",
    [theme.fn.smallerThan("sm")]: { padding: "20px 0 24px" },
    "& > *": { animation: `${rise} .7s cubic-bezier(.2,.8,.2,1) both` },
    "& > *:nth-of-type(2)": { animationDelay: ".08s" },
    "& > *:nth-of-type(3)": { animationDelay: ".16s" },
    "& > *:nth-of-type(4)": { animationDelay: ".24s" },
    "& > *:nth-of-type(5)": { animationDelay: ".34s" },
    "@media (prefers-reduced-motion: reduce)": { "& > *": { animation: "none" } },
  },
  glow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,138,61,.16), rgba(255,138,61,0) 68%)",
    top: -120,
    left: "50%",
    marginLeft: -210,
    pointerEvents: "none",
    zIndex: -1,
    animation: `${drift} 14s ease-in-out infinite`,
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
  },
  reveal: {
    opacity: 0,
    transform: "translateY(18px)",
    transition: "opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)",
    "&.in": { opacity: 1, transform: "none" },
    "@media (prefers-reduced-motion: reduce)": { opacity: 1, transform: "none", transition: "none" },
  },
  how: { margin: "56px 0 30px" },
  howHead: {
    textAlign: "center",
    margin: "0 0 28px",
    "& h2": { fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 8px", color: ui.text },
    "& p": { margin: 0, color: ui.muted },
  },
  step: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
    gap: 32,
    alignItems: "center",
    margin: "0 0 40px",
    "&:nth-of-type(even)": { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.25fr)", "& > figure": { order: 2 } },
    [theme.fn.smallerThan("sm")]: {
      gridTemplateColumns: "1fr !important",
      gap: 16,
      "& > figure": { order: "0 !important" as any },
    },
  },
  shot: {
    margin: 0,
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${ui.line}`,
    background: ui.panel,
    boxShadow: "0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,138,61,.06)",
    transition: "transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .4s",
    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 30px 70px rgba(0,0,0,.5), 0 0 34px rgba(255,138,61,.14)" },
    display: "grid",
    placeItems: "center",
    "& img": { display: "block", maxWidth: "100%", maxHeight: 420, width: "auto", height: "auto" },
  },
  stepText: {
    "& b": { display: "inline-grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", background: "rgba(255,138,61,.14)", color: ui.accent, fontSize: 14, marginBottom: 12 },
    "& h3": { fontSize: 22, fontWeight: 650, margin: "0 0 8px", color: ui.text },
    "& p": { margin: 0, color: ui.muted, fontSize: 15.5, lineHeight: 1.6 },
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
    transition: "transform .3s cubic-bezier(.2,.8,.2,1), border-color .3s",
    "&:hover": { transform: "translateY(-3px)", borderColor: "rgba(255,138,61,.35)" },
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
    animation: `${iconPulse} 3.6s ease-in-out infinite`,
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
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

const STEPS: [string, string, string, string][] = [
  ["/home/step-upload.webp", "Drop your files", "Drag anything onto the page - photos, documents, music - up to 5 GB in total. No account needed.", "The upload page with three files ready to share"],
  ["/home/step-create.webp", "Choose how it lives", "Pick the link, how long it stays online, a password or a download limit, and who should get it by email.", "The Create Share dialog with link, expiry and options"],
  ["/home/step-ready.webp", "Send the link", "Your link is ready in seconds. Copy it and send it any way you like.", "The Share ready dialog with the link to copy"],
  ["/home/step-download.webp", "They download", "One click per file or everything at once. PDFs, pictures and audio can be previewed first.", "A shared folder with three files to download"],
];

// adds .in to every [data-reveal] element once it scrolls into view
function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current ? Array.from(root.current.querySelectorAll("[data-reveal]")) : [];
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
  return root;
}

export default function Home() {
  const { classes, cx } = useStyles();
  const root = useReveal();
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
    <div ref={root}>
      <Meta title="UCA Share - private file sharing" fullTitle />
      <section className={classes.hero}>
        <span className={classes.glow} aria-hidden="true" />
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
        <ShareScene />
      </section>

      <section className={classes.grid}>
        {cards.map(([name, desc], i) => (
          <article className={cx(classes.card, classes.reveal)} data-reveal key={i} style={{ transitionDelay: `${i * 0.08}s` }}>
            <div className={classes.icon}>{icons[i]}</div>
            <h3>{name}</h3>
            <p>{desc}</p>
          </article>
        ))}
      </section>

      <section className={classes.how}>
        <div className={cx(classes.howHead, classes.reveal)} data-reveal>
          <p className={classes.kicker}>How it works</p>
          <h2>From your PC to theirs in four steps.</h2>
        </div>
        {STEPS.map(([src, title, text, alt], i) => (
          <div className={classes.step} key={src}>
            <figure className={cx(classes.shot, classes.reveal)} data-reveal>
              <img src={src} alt={alt} loading="lazy" decoding="async" />
            </figure>
            <div className={cx(classes.stepText, classes.reveal)} data-reveal style={{ transitionDelay: ".1s" }}>
              <b>{i + 1}</b>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className={cx(classes.note, classes.reveal)} data-reveal>
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
    </div>
  );
}
