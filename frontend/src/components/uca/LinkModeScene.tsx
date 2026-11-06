import { createStyles, keyframes } from "@mantine/core";
import type { CSSProperties } from "react";
import { ui } from "../../styles/mantine.style";

// The link-mode animation (owner rule: every feature gets its own animation). One loop of 6 s:
//  - "downloads": files leave the link one by one, each lights a slot (1..N); after the last one the link closes
//  - "days": a cursor runs over 1-3 day blocks, each one dims as it passes; at the end the link closes
// Pure SVG + CSS; still for people who prefer reduced motion.

const LOOP = 6;
const fly = keyframes({
  "0%": { transform: "translateX(0)", opacity: 0 },
  "8%": { opacity: 1 },
  "70%": { opacity: 1 },
  "100%": { transform: "translateX(var(--to))", opacity: 0 },
});
const light = keyframes({
  "0%": { fill: "rgba(var(--uca-accent-rgb, 145, 132, 217), .06)", stroke: "rgba(var(--uca-accent-rgb, 145, 132, 217), .35)" },
  "6%, 92%": { fill: "rgba(var(--uca-accent-rgb, 145, 132, 217), .55)", stroke: "rgba(var(--uca-accent-rgb, 145, 132, 217), 1)" },
  "100%": { fill: "rgba(var(--uca-accent-rgb, 145, 132, 217), .06)", stroke: "rgba(var(--uca-accent-rgb, 145, 132, 217), .35)" },
});
const close = keyframes({
  "0%, 82%": { opacity: 0, transform: "scale(.7)" },
  "88%, 96%": { opacity: 1, transform: "scale(1)" },
  "100%": { opacity: 0, transform: "scale(1)" },
});
const chipDim = keyframes({
  "0%, 82%": { opacity: 1 },
  "88%, 96%": { opacity: 0.35 },
  "100%": { opacity: 1 },
});
const sweep = keyframes({
  "0%": { transform: "translateX(0)" },
  "84%, 100%": { transform: "translateX(var(--to))" },
});
const pass = keyframes({
  "0%": { transform: "scaleX(0)" },
  "84%, 100%": { transform: "scaleX(1)" },
});

const useStyles = createStyles(() => ({
  svg: {
    width: "100%",
    height: "auto",
    display: "block",
    overflow: "visible",
    "& .chip": { transformBox: "fill-box", transformOrigin: "center", animation: `${chipDim} ${LOOP}s ease-in-out infinite` },
    "& .lock": { transformBox: "fill-box", transformOrigin: "center", animation: `${close} ${LOOP}s ease-out infinite` },
    "& .file": { animation: `${fly} var(--d) cubic-bezier(.3,.6,.3,1) infinite both` },
    "& .slot": { strokeWidth: 1.5, animation: `${light} ${LOOP}s linear infinite both` },
    "& .past": { transformBox: "fill-box", transformOrigin: "left center", animation: `${pass} ${LOOP}s linear infinite` },
    "& .cursor": { animation: `${sweep} ${LOOP}s linear infinite` },
    "& .label": { fill: ui.muted, fontSize: 12, fontFamily: ui.font },
    "@media (prefers-reduced-motion: reduce)": { "& *": { animation: "none !important" } },
  },
}));

export default function LinkModeScene({ mode, n = 3, days = 3, label = true }: { mode: "downloads" | "days"; n?: number; days?: number; label?: boolean }) {
  const { classes } = useStyles();
  const count = Math.max(1, Math.min(10, n));
  const d = Math.max(1, Math.min(3, days));
  // slots / day blocks share the space right of the link chip (x 170..500)
  const W = 330, X0 = 170;
  const step = (LOOP * 0.8) / count;   // each download takes an equal part of the first 80 % of the loop
  return (
    <svg className={classes.svg} viewBox="0 0 520 110" aria-hidden="true">
      <g className="chip">
        <rect x="10" y="32" width="128" height="40" rx="20" style={{ fill: ui.panel2, stroke: ui.accent }} strokeWidth="2" />
        <path d="M36 56l-3 3a5.5 5.5 0 0 1-7.8-7.8l4.6-4.6a5.5 5.5 0 0 1 7.8 0M44 48l3-3a5.5 5.5 0 0 1 7.8 7.8l-4.6 4.6a5.5 5.5 0 0 1-7.8 0" fill="none" style={{ stroke: ui.accent }} strokeWidth="2" strokeLinecap="round" />
        <text x="95" y="57" textAnchor="middle" style={{ fill: ui.accent300 }} fontSize="12.5" fontWeight="500" fontFamily={ui.mono}>/s/link</text>
      </g>
      <g className="lock">
        <rect x="62" y="12" width="24" height="18" rx="4" style={{ fill: ui.panel2, stroke: ui.accent2 }} strokeWidth="1.8" />
        <path d="M67 12V8a7 7 0 0 1 14 0v4" fill="none" style={{ stroke: ui.accent2 }} strokeWidth="1.8" />
      </g>
      {mode === "downloads" ? (
        <>
          {Array.from({ length: count }).map((_, i) => {
            const slotW = Math.min(30, (W - 8 * (count - 1)) / count);
            const x = X0 + i * (slotW + 8);
            const delay = `${i * step}s`;
            return (
              <g key={i}>
                <rect className="slot" x={x} y={38} width={slotW} height={28} rx={7} style={{ animationDelay: delay, animationDuration: `${LOOP}s` }} />
                <text x={x + slotW / 2} y={56.5} textAnchor="middle" fontSize="11" fontFamily={ui.mono} style={{ fill: ui.accent300 }}>{i + 1}</text>
                <g className="file" style={{ ["--to" as string]: `${x + slotW / 2 - 140}px`, ["--d" as string]: `${LOOP}s`, animationDelay: delay, animationDuration: `${LOOP}s` } as CSSProperties}>
                  <g transform="translate(140 40)">
                    <path d="M0 0h10l5 5v16H0z" style={{ fill: ui.panel2, stroke: ui.accent }} strokeWidth="1.6" strokeLinejoin="round" transform="scale(.9)" />
                  </g>
                </g>
              </g>
            );
          })}
          {label && <text className="label" x={X0} y={98}>{`Ends after ${count} download${count === 1 ? "" : "s"} - or 3 days`}</text>}
        </>
      ) : (
        <>
          {Array.from({ length: d }).map((_, i) => {
            const bw = (W - 10 * (d - 1)) / d;
            const x = X0 + i * (bw + 10);
            return (
              <g key={i}>
                <rect x={x} y={38} width={bw} height={28} rx={7} style={{ fill: "rgba(var(--uca-accent-rgb, 145, 132, 217), .4)", stroke: ui.accent }} strokeWidth="1.5" />
                <text x={x + bw / 2} y={56.5} textAnchor="middle" fontSize="11.5" fontFamily={ui.mono} style={{ fill: ui.text }}>{`day ${i + 1}`}</text>
              </g>
            );
          })}
          {/* the time that has passed: a dark veil that grows with the cursor */}
          <rect className="past" x={X0 - 2} y={36} width={W + 4} height={32} rx={8} style={{ fill: ui.bg, opacity: 0.62 }} />
          <g className="cursor" style={{ ["--to" as string]: `${W}px` } as CSSProperties}>
            <rect x={X0 - 1} y={30} width={2.5} height={44} rx={1.2} style={{ fill: ui.accent2, filter: "drop-shadow(0 0 6px rgba(var(--uca-accent-rgb, 145, 132, 217), .9))" }} />
          </g>
          {label && <text className="label" x={X0} y={98}>{`Ends after ${d} day${d === 1 ? "" : "s"} - any number of downloads`}</text>}
        </>
      )}
    </svg>
  );
}
