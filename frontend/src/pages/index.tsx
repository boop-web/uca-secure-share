import { Button, createStyles, keyframes } from "@mantine/core";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import CoreOrb, { pulseOrb } from "../components/home/CoreOrb";
import ShareScene from "../components/home/ShareScene";
import LinkModeScene from "../components/uca/LinkModeScene";
import ucaService, { size, UcaStatus, UPGRADE_URL } from "../services/uca.service";
import Meta from "../components/Meta";
import useConfig from "../hooks/config.hook";
import useUser from "../hooks/user.hook";
import homepageService from "../services/homepage.service";
import { ui } from "../styles/mantine.style";
import { HOMEPAGE_DEFAULTS, resolveHomepage } from "../utils/homepage.util";
import { siteUrl } from "../utils/seo.util";

const rise = keyframes({ from: { opacity: 0, transform: "translateY(14px)" }, to: { opacity: 1, transform: "none" } });
const drift = keyframes({
  "0%, 100%": { transform: "translate(0, 0) scale(1)" },
  "50%": { transform: "translate(30px, -18px) scale(1.12)" },
});
const iconPulse = keyframes({
  "0%, 100%": { boxShadow: "0 0 0 0 rgba(var(--uca-accent-rgb, 145, 132, 217), 0)" },
  "50%": { boxShadow: "0 0 18px 2px rgba(var(--uca-accent-rgb, 145, 132, 217), .28)" },
});

const useStyles = createStyles((theme) => ({
  // the hero rises in on load; later sections ease in as they scroll into view (see useReveal)
  hero: {
    position: "relative",
    textAlign: "center",
    padding: "8px 0 34px",
    [theme.fn.smallerThan("sm")]: { padding: "0 0 24px" },
    "& > *": { animation: `${rise} .7s cubic-bezier(.2,.8,.2,1) both` },
    "& > *:nth-of-type(2)": { animationDelay: ".08s" },
    "& > *:nth-of-type(3)": { animationDelay: ".16s" },
    "& > *:nth-of-type(4)": { animationDelay: ".24s" },
    "& > *:nth-of-type(5)": { animationDelay: ".34s" },
    "& > *:nth-of-type(6)": { animationDelay: ".42s" },
    "@media (prefers-reduced-motion: reduce)": { "& > *": { animation: "none" } },
  },
  glow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(var(--uca-accent-rgb, 145, 132, 217), .14), rgba(var(--uca-accent-rgb, 145, 132, 217), 0) 68%)",
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
    "& h2": { fontSize: "clamp(24px, 3.6vw, 32px)", fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 8px", color: ui.text },
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
    borderRadius: 14,
    overflow: "hidden",
    border: `1px solid ${ui.line}`,
    background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`,
    boxShadow: "0 24px 60px -30px rgba(0,0,0,1), 0 0 0 1px rgba(var(--uca-accent-rgb, 145, 132, 217), .05)",
    transition: "transform .4s cubic-bezier(.2,.7,.2,1), box-shadow .4s, border-color .3s",
    "&:hover": { transform: "translateY(-4px)", borderColor: ui.lineStrong, boxShadow: "0 30px 70px -30px rgba(0,0,0,1), 0 0 34px -6px rgba(var(--uca-accent-rgb, 145, 132, 217), .28)" },
    display: "grid",
    placeItems: "center",
    "& img": { display: "block", maxWidth: "100%", maxHeight: 420, width: "auto", height: "auto" },
  },
  stepText: {
    "& b": { display: "inline-grid", placeItems: "center", width: 30, height: 30, borderRadius: "50%", border: `1px solid ${ui.accent}`, boxShadow: `0 0 18px -6px ${ui.glow}`, color: ui.accent300, font: `500 13px/1 ${ui.mono}`, marginBottom: 12 },
    "& h3": { fontSize: 21, fontWeight: 500, letterSpacing: "-.01em", margin: "0 0 8px", color: ui.text },
    "& p": { margin: 0, color: ui.muted, fontSize: 15.5, lineHeight: 1.6 },
  },
  kicker: {
    color: ui.accent2,
    font: `500 10.5px/1 ${ui.mono}`,
    letterSpacing: ".22em",
    textTransform: "uppercase",
    margin: "0 0 14px",
  },
  title: {
    fontSize: "clamp(30px, 5.6vw, 50px)",
    lineHeight: 1.1,
    fontWeight: 500,
    letterSpacing: "-.025em",
    margin: "0 0 18px",
    color: ui.text,
    overflowWrap: "break-word",
    "& span": { color: ui.accent2, textShadow: "0 0 32px rgba(var(--uca-accent-rgb, 145, 132, 217), .35)" },
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
    position: "relative",
    overflow: "hidden",
    background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`,
    border: `1px solid ${ui.line}`,
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 1px 0 rgba(255,255,255,.03) inset, 0 20px 40px -30px rgba(0,0,0,.9)",
    transition: "transform .3s cubic-bezier(.2,.7,.2,1), border-color .3s, box-shadow .3s",
    "&::after": { content: '""', position: "absolute", inset: 0, borderRadius: "inherit", background: `radial-gradient(160px 80px at 20% 0%, ${ui.soft}, transparent 70%)`, opacity: 0, transition: "opacity .3s", pointerEvents: "none" },
    "&:hover": { transform: "translateY(-3px)", borderColor: ui.lineStrong, boxShadow: "0 18px 40px -24px rgba(0,0,0,1), 0 0 0 1px rgba(var(--uca-accent-rgb, 145, 132, 217), .08)" },
    "&:hover::after": { opacity: 1 },
    "& h3": { margin: "0 0 6px", fontSize: 15.5, fontWeight: 600, letterSpacing: "-.01em" },
    "& p": { margin: 0, color: ui.muted, fontSize: 14, lineHeight: 1.55 },
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    marginBottom: 12,
    background: ui.soft,
    border: "1px solid rgba(var(--uca-accent-rgb, 145, 132, 217), .3)",
    animation: `${iconPulse} 3.6s ease-in-out infinite`,
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
    "& svg": {
      width: 18,
      height: 18,
      stroke: ui.accent2,
      fill: "none",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
  },
  plans: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    maxWidth: 760,
    margin: "0 auto",
    [theme.fn.smallerThan("sm")]: { gridTemplateColumns: "1fr" },
  },
  plan: {
    position: "relative",
    background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`,
    border: `1px solid ${ui.line}`,
    borderRadius: 16,
    padding: "22px 22px 20px",
    transition: "transform .3s cubic-bezier(.2,.7,.2,1), border-color .3s, box-shadow .3s",
    "&:hover": { transform: "translateY(-3px)", borderColor: ui.lineStrong, boxShadow: "0 0 34px -10px rgba(var(--uca-accent-rgb, 145, 132, 217), .35)" },
    "& h3": { margin: "0 0 4px", fontSize: 19, fontWeight: 500, letterSpacing: "-.01em" },
    "& .big": { font: `500 30px/1.1 ${ui.font}`, color: ui.accent300, margin: "12px 0 2px", letterSpacing: "-.02em" },
    "& .sub": { color: ui.muted, fontSize: 13.5, margin: 0 },
    "& ul": { margin: "14px 0 0", padding: 0, listStyle: "none", color: ui.muted, fontSize: 14, lineHeight: 1.8 },
    "& li::before": { content: '"\\00B7\\00a0\\00a0"', color: ui.accent2 },
  },
  planMax: { borderColor: "rgba(var(--uca-accent-rgb, 145, 132, 217), .45)", boxShadow: "0 0 30px -14px rgba(var(--uca-accent-rgb, 145, 132, 217), .5)" },
  modes: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    [theme.fn.smallerThan("sm")]: { gridTemplateColumns: "1fr" },
  },
  needs: { color: ui.muted, fontSize: 14, margin: "16px 0 0", "& a": { color: ui.accent300 } },
  faq: {
    margin: "10px 0 34px",
    "& > h2": { textAlign: "center", fontSize: "clamp(24px, 3.6vw, 30px)", fontWeight: 500, letterSpacing: "-.02em", margin: "0 0 20px", color: ui.text },
  },
  note: {
    background: `linear-gradient(180deg, ${ui.panel2}, ${ui.panel})`,
    border: `1px solid ${ui.line}`,
    borderRadius: 14,
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

// [image, width, height, title, text, alt] - the v2 pictures live in the images volume (/img, like the logo), taken
// on share.ucagg.de with demo files from C:\Users\Public
const STEPS: [string, number, number, string, string, string][] = [
  ["/img/home/v2-upload.webp", 2400, 1500, "Drop your files", "Drag photos, documents or a whole folder onto the page - up to 250 MB per link with UCA Pro, 750 MB with UCA Max. The bar shows the space your live links use.", "The upload page with files ready to send and the space bar"],
  ["/img/home/v2-modes.webp", 1000, 1400, "Choose how the link ends", "Downloads: it ends after 1 to 10 downloads, or after 3 days at the latest. Days: it ends after 1, 2 or 3 days, however often it is downloaded.", "The dialog with the two link modes, Downloads and Days"],
  ["/img/home/v2-ready.webp", 1000, 520, "Send the link", "Your link is ready in seconds. Copy it and send it any way you like - chat, email, text message.", "The link is ready to copy"],
  ["/img/home/v2-downloads.webp", 2400, 1000, "They download - you see it", "One click per file or everything at once. In My shares you see each download: number, time and device type.", "A shared folder with files to download"],
];

const OLD_SHOTS = ["/home/step-upload.webp", "/home/step-create.webp", "/home/step-ready.webp", "/home/step-download.webp"];

// Landing sections for what people search for; honest about what the service does (TLS to our own server, not
// end-to-end encryption).
const USES: [string, string][] = [
  ["Send a file to someone else", "UCA Share is for sending - a photo to a friend, a document to a colleague, a video to family. Not for syncing your own devices: the link ends, the files go."],
  ["A link that ends by itself", "Pick a number of downloads or a number of days. When the link ends, its files are deleted and the space is yours again. Nothing lingers on a server for months."],
  ["Know when it arrived", "Every download is listed: \"Download 2, today 14:32, Android phone\". With UCA AI on your PC you even get a note the moment your file is downloaded."],
];

const PLAN_CARDS: [string, "pro" | "max", number, number, string][] = [
  ["UCA Pro", "pro", 250 * 1024 ** 2, 1024 ** 3, "UCA AI + UCA Mesh + UCA My Home"],
  ["UCA Max", "max", 750 * 1024 ** 2, 2.5 * 1024 ** 3, "Everything in UCA Pro + UCA Radar + UCA PDF Pro"],
];

const faqItems = (pro: string, max: string): [string, string][] => [
  ["Who can use UCA Share?", `UCA Share is part of the UCA bundles on ucagg.de: UCA Pro (${pro}) and UCA Max (${max}). Recipients never need an account or a plan - the link is enough.`],
  ["How does a link end?", "You choose when you send: Downloads (it ends after 1 to 10 downloads, or after 3 days at the latest) or Days (it ends after 1, 2 or 3 days). A link never lives longer than 3 days."],
  ["What happens to the files?", "When a link ends or you delete it, its files are deleted from the server. Your space only counts live links, so it comes back at once."],
  ["What do I see about downloads?", "For each download: its number, the time and the device type (for example \"Android phone \u00b7 Chrome\"). Share stores no IP address and no location for it."],
  ["Are my files encrypted?", "Files are encrypted in transit (HTTPS/TLS) to our own server and are only reachable through the link, which you can protect with a password. They are not end-to-end encrypted, so for highly sensitive data, encrypt the files first."],
  ["Where are the files stored?", "On UCA's own server, hosted at IONOS in Kansas City (USA) - not on a third-party cloud service. Shared files are never listed publicly or in search engines."],
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

  // the plans' limits come from Share itself (admin-editable), with the owner's numbers as the fallback
  const [status, setStatus] = useState<UcaStatus | null>(null);
  useEffect(() => {
    ucaService.status().then(setStatus).catch(() => {});
  }, []);
  const pro = status ? `${size(status.plans.pro.perLinkBytes)} per link, ${size(status.plans.pro.storageBytes)} at once` : "250 MB per link, 1 GB at once";
  const max = status ? `${size(status.plans.max.perLinkBytes)} per link, ${size(status.plans.max.storageBytes)} at once` : "750 MB per link, 2.5 GB at once";
  const faq = faqItems(pro, max);
  const base = siteUrl(config.get("general.appUrl"));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "UCA Share",
      description: "Send a file to someone with one link that ends after a number of downloads or after 1 to 3 days. Part of UCA Pro and UCA Max.",
      url: base + "/",
      image: base + "/og.png",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript and a modern web browser",
      publisher: { "@type": "Organization", name: "UCA", url: "https://ucagg.de/" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  const [titleMain, ...titleRest] = content.title.split("\n");
  const cards = [
    [content.bullet1Name, content.bullet1Desc],
    [content.bullet2Name, content.bullet2Desc],
    [content.bullet3Name, content.bullet3Desc],
  ].filter(([name]) => name);

  return (
    <div ref={root}>
      <Meta
        title="Send a File With One Link That Ends | UCA Share"
        description="UCA Share sends a file or photo to someone with one link that ends after 1-10 downloads or 1-3 days, and shows you every download. Part of UCA Pro and UCA Max."
        fullTitle
      />
      <Head>
        <script
          type="application/ld+json"
          key="ld-json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      </Head>
      <section className={classes.hero}>
        <span className={classes.glow} aria-hidden="true" />
        <CoreOrb size={168} style={{ margin: "0 auto -6px" }} />
        <p className={classes.kicker}>A tool of the UCA ecosystem</p>
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
          <Button component={Link} href="/upload" size="md" onMouseEnter={() => pulseOrb(0.5)} onFocus={() => pulseOrb(0.5)}>
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
        <p className={classes.needs}>
          Needs <a href={UPGRADE_URL}>UCA Pro or UCA Max</a> on ucagg.de. Recipients need nothing but the link.
        </p>
        <ShareScene />
      </section>

      <section className={classes.how} id="plans">
        <div className={cx(classes.howHead, classes.reveal)} data-reveal>
          <p className={classes.kicker}>In UCA Pro and UCA Max</p>
          <h2>Pick the bundle, Share comes with it.</h2>
          <p>Space counts only live links: when a link ends, its files go and the space is yours again.</p>
        </div>
        <div className={classes.plans}>
          {PLAN_CARDS.map(([name, key, link, store, apps], i) => {
            const p = status?.plans[key];
            return (
              <article key={name} className={cx(classes.plan, i === 1 && classes.planMax, classes.reveal)} data-reveal style={{ transitionDelay: `${i * 0.08}s` }}>
                <h3>{name}</h3>
                <p className="sub">{apps}</p>
                <p className="big">{size(p?.perLinkBytes ?? link)}</p>
                <p className="sub">per link {"\u00b7"} {size(p?.storageBytes ?? store)} in live links at once</p>
                <ul>
                  <li>Links end after 1-{status?.maxDownloads ?? 10} downloads or 1-{status?.maxDays ?? 3} days</li>
                  <li>See every download</li>
                  <li>Send from UCA AI on your PC</li>
                </ul>
                <Button component="a" href={UPGRADE_URL} mt={16} variant={i === 1 ? "filled" : "default"} fullWidth>
                  Get {name} on ucagg.de
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={classes.how} id="modes">
        <div className={cx(classes.howHead, classes.reveal)} data-reveal>
          <p className={classes.kicker}>Two ways a link ends</p>
          <h2>Downloads or days - you choose when you send.</h2>
        </div>
        <div className={classes.modes}>
          <article className={cx(classes.card, classes.reveal)} data-reveal>
            <h3>Downloads</h3>
            <p>Ends after 1 to 10 downloads - or after 3 days, whichever comes first.</p>
            <LinkModeScene mode="downloads" n={3} />
          </article>
          <article className={cx(classes.card, classes.reveal)} data-reveal style={{ transitionDelay: ".08s" }}>
            <h3>Days</h3>
            <p>Ends after 1, 2 or 3 days, however often it is downloaded until then.</p>
            <LinkModeScene mode="days" days={3} />
          </article>
        </div>
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
        {STEPS.map(([src, width, height, title, text, alt], i) => (
          <div className={classes.step} key={src}>
            <figure className={cx(classes.shot, classes.reveal)} data-reveal>
              <img
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                // until the v2 picture is in the images volume, the old one built into the image
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.old) {
                    img.dataset.old = "1";
                    img.src = OLD_SHOTS[i];
                  }
                }}
              />
            </figure>
            <div className={cx(classes.stepText, classes.reveal)} data-reveal style={{ transitionDelay: ".1s" }}>
              <b>{i + 1}</b>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className={classes.how}>
        <div className={cx(classes.howHead, classes.reveal)} data-reveal>
          <p className={classes.kicker}>Why UCA Share</p>
          <h2>Sending, not storing.</h2>
        </div>
        <div className={classes.grid}>
          {USES.map(([name, text], i) => (
            <article className={cx(classes.card, classes.reveal)} data-reveal key={name} style={{ transitionDelay: `${i * 0.08}s` }}>
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={classes.faq} id="faq">
        <h2 className={classes.reveal} data-reveal>Questions</h2>
        {faq.map(([q, a]) => (
          <article className={cx(classes.note, classes.reveal)} data-reveal key={q}>
            <h3>{q}</h3>
            <p>{a}</p>
          </article>
        ))}
      </section>

      <section className={cx(classes.note, classes.reveal)} data-reveal>
        <h3>What may not be shared</h3>
        <p>
          UCA Share is run from Germany on a server in the USA, so every share
          must comply with German law (including the StGB and the NetzDG) and
          with the law where the server is. Not allowed: hate speech, symbols of unconstitutional
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
