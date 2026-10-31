import { CSSProperties, useEffect, useRef } from "react";

// The UCA Core orb (the same breathing particle sphere as ucagg.de/account and the Command Deck), in the page colour
// --orb-rgb. One canvas, 320 points, no allocations per frame beyond two gradients; slower (not stopped) for people
// who prefer reduced motion. pulseOrb() gives it a burst of energy (a hover on the main button, a file dropped).
let energy = 0;
export const pulseOrb = (n = 0.6) => {
  energy = Math.min(1.2, energy + n);
};

const FIB: [number, number, number][] = [];
for (let i = 0, N = 320; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
  FIB.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
}
const beat = (t: number) => {
  const p = (t % 1.05) / 1.05;
  return Math.exp(-Math.pow((p - 0.06) / 0.028, 2)) + 0.55 * Math.exp(-Math.pow((p - 0.2) / 0.032, 2));
};

export default function CoreOrb({ size = 160, style }: { size?: number; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const css = (n: string, d: number[]) => {
      const a = getComputedStyle(document.documentElement).getPropertyValue(n).trim().split(",").map(Number);
      return a.length === 3 && a.every((x) => x >= 0 && x <= 255) ? a : d;
    };
    const [r, g, bl] = css("--orb-rgb", [145, 132, 217]);
    const light = css("--orb-light", [210, 206, 253]);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.3 : 1;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const d = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      const W = Math.round(w * d), H = Math.round(h * d);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const x = c.getContext("2d");
      if (!x) return;
      x.setTransform(d, 0, 0, d, 0, 0);
      x.clearRect(0, 0, w, h);
      const t = (now - t0) / 1000;
      energy *= 0.965;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3, b = beat(t), e = energy;
      let gr = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.7);
      gr.addColorStop(0, `rgba(${r},${g},${bl},${0.42 + 0.22 * b + 0.3 * e})`);
      gr.addColorStop(0.45, `rgba(${r},${g},${bl},${0.12 + 0.08 * b})`);
      gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R * 1.7, 0, 6.283); x.fill();
      const a = t * 0.35 * motion * (1 + e * 4), ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(0.45), st = Math.sin(0.45), sc = R * (1 + 0.07 * b + 0.18 * e);
      for (let i = 0; i < FIB.length; i++) {
        const p = FIB[i], X = p[0] * ca + p[2] * sa, Z0 = -p[0] * sa + p[2] * ca, Y = p[1] * ct - Z0 * st, Z = p[1] * st + Z0 * ct;
        const wob = 1 + 0.05 * Math.sin(t * 2.2 * motion + i * 0.7), dep = (1 - Z) / 2;
        x.fillStyle = `rgba(${light[0]},${(light[1] - 20 + 40 * dep) | 0},${(light[2] - 30 + 60 * dep) | 0},${0.15 + 0.75 * dep})`;
        const sz = 1.5 * (0.5 + dep);
        x.fillRect(cx + X * sc * wob - sz / 2, cy + Y * sc * wob - sz / 2, sz, sz);
      }
      gr = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      gr.addColorStop(0, `rgba(${light[0]},${Math.min(255, light[1] + 20)},${Math.min(255, light[2] + 40)},${0.85 + 0.15 * b})`);
      gr.addColorStop(0.5, `rgba(${r},${g},${bl},${0.5 + 0.3 * b})`);
      gr.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R * 0.55, 0, 6.283); x.fill();
      x.lineWidth = 1.2;
      const rr = R * 1.42;
      for (let k = 0; k < 3; k++) {
        const s0 = t * (0.5 - k * 0.3) * motion * (1 + e * 2) + k * 2;
        x.strokeStyle = `rgba(${r},${g},${bl},${0.55 - k * 0.14})`;
        x.beginPath(); x.arc(cx, cy, rr + k * 7, s0, s0 + 1.1 + k * 0.6); x.stroke();
      }
      x.strokeStyle = `rgba(${r},${g},${bl},.18)`;
      x.beginPath();
      for (let k = 0; k < 60; k++) {
        const an = (k / 60) * 6.283 + t * 0.05 * motion, r1 = rr + 22, r2 = r1 + (k % 5 ? 3 : 7);
        x.moveTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); x.lineTo(cx + Math.cos(an) * r2, cy + Math.sin(an) * r2);
      }
      x.stroke();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden="true" style={{ display: "block", width: size, height: size, ...style }} />;
}
