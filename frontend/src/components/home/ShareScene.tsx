import { createStyles, keyframes } from "@mantine/core";
import { useEffect, useState } from "react";
import { ui } from "../../styles/mantine.style";

// The homepage's living picture: a file leaves the PC, turns into a link and lands on a phone, in a loop.
// Pure SVG + CSS (no JS timers); frozen for people who prefer reduced motion.

const dash = keyframes({ to: { strokeDashoffset: -40 } });
const chipPulse = keyframes({
  "0%, 44%, 100%": { transform: "scale(1)", filter: "drop-shadow(0 0 0 rgba(255,138,61,0))" },
  "52%": { transform: "scale(1.08)", filter: "drop-shadow(0 0 14px rgba(255,138,61,.75))" },
});
const ring = keyframes({
  "0%, 88%": { opacity: 0, transform: "scale(.6)" },
  "92%": { opacity: 0.9, transform: "scale(1)" },
  "100%": { opacity: 0, transform: "scale(1.8)" },
});
const tick = keyframes({
  "0%, 90%": { strokeDashoffset: 24, opacity: 0 },
  "94%": { opacity: 1 },
  "100%": { strokeDashoffset: 0, opacity: 1 },
});
const glow = keyframes({
  "0%, 100%": { opacity: 0.45 },
  "50%": { opacity: 0.85 },
});

const useStyles = createStyles(() => ({
  wrap: {
    position: "relative",
    maxWidth: 760,
    margin: "40px auto 8px",
    padding: "6px 0",
  },
  svg: {
    width: "100%",
    height: "auto",
    display: "block",
    overflow: "visible",
    "& .stroke": { fill: "none", stroke: ui.accent, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    "& .soft": { fill: "rgba(255,138,61,.08)", stroke: "rgba(255,138,61,.45)", strokeWidth: 1.5 },
    "& .dev": { fill: ui.panel, stroke: "rgba(255,255,255,.12)", strokeWidth: 1.5 },
    "& .path": { fill: "none", stroke: "rgba(255,138,61,.35)", strokeWidth: 2, strokeDasharray: "4 8", animation: `${dash} 1.6s linear infinite` },
    "& .label": { fill: ui.muted, fontSize: 13, fontFamily: ui.font },
    "& .chip": { transformBox: "fill-box", transformOrigin: "center", animation: `${chipPulse} 4.8s ease-in-out infinite` },
    "& .halo": { animation: `${glow} 4.8s ease-in-out infinite` },
    "& .ring": { transformBox: "fill-box", transformOrigin: "center", fill: "none", stroke: ui.accent, strokeWidth: 2, animation: `${ring} 4.8s ease-out infinite` },
    "& .tick": { fill: "none", stroke: ui.accent, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, animation: `${tick} 4.8s ease-out infinite` },
  },
  reduce: {
    "@media (prefers-reduced-motion: reduce)": { "& *": { animation: "none !important" } },
  },
}));

// the two legs of the trip, in the SVG's 760 x 220 coordinate space (shared by the dashed paths and the flying file)
const LEG1 = "M150 110 C 230 40, 300 40, 380 110";
const LEG2 = "M380 110 C 460 180, 530 180, 610 110";

// one leg of the trip: the file glyph rides the path for half the 4.8 s loop, fading in and out at the ends
const Flyer = ({ path, half }: { path: string; half: 0 | 1 }) => {
  const t = half === 0 ? "0;0.06;0.44;0.5;1" : "0;0.5;0.56;0.94;1";
  const o = half === 0 ? "0;1;1;0;0" : "0;0;1;1;0";
  const k = half === 0 ? "0;1;1" : "0;0;1";
  const kt = half === 0 ? "0;0.5;1" : "0;0.5;1";
  return (
    <g opacity="0" style={{ filter: "drop-shadow(0 0 8px rgba(255,138,61,.6))" }}>
      <animate attributeName="opacity" dur="4.8s" repeatCount="indefinite" values={o} keyTimes={t} />
      <animateMotion dur="4.8s" repeatCount="indefinite" path={path} keyPoints={k} keyTimes={kt} calcMode="linear" />
      <g transform="translate(-14 -17)">
        <path d="M3 1h15l7 7v24H3z" fill={ui.panel2} stroke={ui.accent} strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 1v7h7" fill="none" stroke={ui.accent} strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 16h12M8 21h12M8 26h8" stroke={ui.accent2} strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
};

export default function ShareScene() {
  const { classes, cx } = useStyles();
  // SMIL ignores CSS, so the flying file is simply left out for people who prefer reduced motion
  // (decided after mount, so the server-rendered HTML and the first client render match)
  const [still, setStill] = useState(false);
  useEffect(() => setStill(!!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return (
    <div className={cx(classes.wrap, classes.reduce)} aria-hidden="true">
      <svg className={classes.svg} viewBox="0 0 760 220">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,138,61,.35)" />
            <stop offset="100%" stopColor="rgba(255,138,61,0)" />
          </radialGradient>
        </defs>
        <path className="path" d={LEG1} />
        <path className="path" d={LEG2} />

        {/* your PC */}
        <rect className="dev" x="70" y="66" width="120" height="80" rx="10" />
        <rect className="soft" x="80" y="76" width="100" height="58" rx="5" />
        <path className="stroke" d="M112 160h56M140 146v14" />
        <text className="label" x="130" y="190" textAnchor="middle">Your PC</text>

        {/* the link */}
        <circle className="halo" cx="380" cy="110" r="70" fill="url(#halo)" />
        <g className="chip">
          <rect x="318" y="88" width="124" height="44" rx="22" fill={ui.panel2} stroke={ui.accent} strokeWidth="2" />
          <path className="stroke" d="M346 114l-3 3a6 6 0 0 1-8.5-8.5l5-5a6 6 0 0 1 8.5 0M354 106l3-3a6 6 0 0 1 8.5 8.5l-5 5a6 6 0 0 1-8.5 0" />
          <text x="400" y="116" textAnchor="middle" fill={ui.text} fontSize="14" fontWeight="600" fontFamily={ui.font}>/s/link</text>
        </g>
        <text className="label" x="380" y="190" textAnchor="middle">One link</text>

        {/* their phone */}
        <rect className="dev" x="584" y="54" width="58" height="104" rx="12" />
        <rect className="soft" x="592" y="66" width="42" height="72" rx="5" />
        <circle className="ring" cx="613" cy="102" r="20" />
        <path className="tick" d="M604 102l6 6 12-12" />
        <text className="label" x="613" y="190" textAnchor="middle">Anyone, anywhere</text>
        {!still && <Flyer path={LEG1} half={0} />}
        {!still && <Flyer path={LEG2} half={1} />}
      </svg>
    </div>
  );
}
