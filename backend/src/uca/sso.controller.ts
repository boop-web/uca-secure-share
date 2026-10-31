import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import * as crypto from "crypto";
import { Request, Response } from "express";
import { AuthService } from "src/auth/auth.service";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UcaCoreService } from "./uca-core.service";

/**
 * Two doors from ucagg.de into Share, each with its own secret and label (so one can never open the other):
 *  - GET /admin/sso?t=   (uca-admin-sso-v1, docs/admin-sso-v1.md)   ADMIN_SSO_SECRET   aud "<host>/admin"   -> /admin
 *  - GET /uca-id/sso?t=  (uca-id-sso-v1, docs/uca-id-sso-v1.md)     UCA_ID_SSO_SECRET  aud "<host>/uca-id"  -> next
 * The Caddyfile inside the image rewrites both paths to /api/uca/admin-sso and /api/uca/id-sso (the Next middleware
 * redirects there too when Caddy is off). Valid 60 s, the nonce is used once, only for an existing account (an existing
 * admin for /admin), never creates anyone. Success = Share's normal session cookies, exactly as sign-in sets them.
 */
const seen = new Map<string, number>();   // nonce -> keep until (ms)
const tries = new Map<string, { n: number; until: number }>();

function limited(ip: string) {
  const now = Date.now(), h = tries.get(ip);
  if (!h || h.until < now) { tries.set(ip, { n: 1, until: now + 5 * 60_000 }); return false; }
  if (tries.size > 1000) for (const [k, v] of tries) if (v.until < now) tries.delete(k);
  return ++h.n > 20;   // the same limit as Share's sign-in: 20 per 5 minutes
}
function verify(ticket: string, secret: string, label: string, aud: string, maxLifeMs = 60_000) {
  if (!ticket || ticket.length > 2000 || secret.length < 32) return null;
  const dot = ticket.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = ticket.slice(0, dot), sig = ticket.slice(dot + 1);
  const want = crypto.createHmac("sha256", secret).update(label + "\n" + payload).digest();
  let got: Buffer;
  try { got = Buffer.from(sig, "base64url"); } catch { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let p: { v?: number; aud?: string; email?: string; iat?: number; exp?: number; nonce?: string; product?: string; next?: string };
  try { p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  const now = Date.now();
  if (p.v !== 1 || p.aud !== aud || typeof p.exp !== "number" || typeof p.iat !== "number") return null;
  if (p.exp <= now || p.iat > now + 5000 || p.exp - p.iat > maxLifeMs) return null;
  if (typeof p.nonce !== "string" || !/^[0-9a-f]{16,64}$/i.test(p.nonce) || typeof p.email !== "string") return null;
  for (const [k, until] of seen) if (until < now) seen.delete(k);
  if (seen.has(p.nonce)) return null;
  seen.set(p.nonce, p.exp + 2 * 60_000);
  return p;
}

@SkipThrottle()
@Controller("uca")
export class SsoController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
    private prisma: PrismaService,
    private uca: UcaCoreService,
  ) {}

  private host() {
    try { return new URL(this.config.get("general.appUrl")).host; } catch { return "share.ucagg.de"; }
  }
  private async userByEmail(email: string) {
    const e = String(email || "").trim().toLowerCase();
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = ${e} LIMIT 1`;
    return rows.length ? this.prisma.user.findUnique({ where: { id: rows[0].id } }) : null;
  }
  private async signIn(res: Response, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const { refreshToken, refreshTokenId } = await this.auth.createRefreshToken(user.id);
    const accessToken = await this.auth.createAccessToken(user, refreshTokenId);
    this.auth.addTokensToResponse(res, refreshToken, accessToken);
  }
  private page(res: Response, status: number, title: string, text: string, link: string, linkText: string) {
    res.status(status).setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · UCA Share</title>
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#161826;color:#e9e9ed;font:400 15px/1.5 Inter,system-ui,sans-serif;padding:16px;box-sizing:border-box}
.c{max-width:420px;width:100%;background:linear-gradient(180deg,#232532,#1e2030);border:1px solid #2c2f3c;border-radius:14px;padding:26px}
h1{font-size:20px;font-weight:500;margin:0 0 8px}p{color:#9397ab;margin:0 0 18px}a{display:inline-flex;align-items:center;min-height:42px;padding:0 16px;border-radius:8px;border:1px solid #9184d9;color:#d2cefd;text-decoration:none;box-shadow:0 0 24px -12px rgba(145,132,217,.42)}a:hover{background:#2b2741}</style></head>
<body><div class="c"><h1>${esc(title)}</h1><p>${esc(text)}</p><a href="${esc(link)}">${esc(linkText)}</a></div></body></html>`);
  }

  /** uca-admin-sso-v1: ucagg.de/admin opens Share's own admin, signed in */
  @Get("admin-sso")
  async adminSso(@Query("t") t: string, @Req() req: Request, @Res() res: Response) {
    const expired = () => this.page(res, 401, "This link expired", "This link expired - open it again from ucagg.de/admin.", "/auth/signIn?redirect=%2Fadmin", "Sign in to Share");
    const secret = String(process.env.ADMIN_SSO_SECRET || "");
    if (secret.length < 32) return res.status(404).json({ error: "not found" });
    if (limited("a:" + (req.ip || ""))) return expired();
    const p = verify(String(t || ""), secret, "uca-admin-sso-v1", this.host() + "/admin");
    if (!p) { await this.uca.audit("admin.sso refused", null, `ip ${req.ip}`, "warn"); return expired(); }
    const u = await this.userByEmail(p.email);
    if (!u || !u.isAdmin) { await this.uca.audit("admin.sso refused", p.email, `not a Share admin · ip ${req.ip}`, "warn"); return expired(); }
    await this.signIn(res, u.id);
    await this.uca.audit("admin.sso", u.email.toLowerCase(), `signed in from ucagg.de/admin · ip ${req.ip}`);
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, "/admin");
  }

  /** uca-id-sso-v1: "Open · signed in" on the UCA ID account page */
  @Get("id-sso")
  async idSso(@Query("t") t: string, @Req() req: Request, @Res() res: Response) {
    const bad = () => this.page(res, 401, "This link expired", "Open UCA Share again from your UCA ID, or sign in here.", "/auth/signIn", "Sign in to Share");
    const secret = String(process.env.UCA_ID_SSO_SECRET || "");
    if (secret.length < 32) return res.status(404).json({ error: "not found" });
    if (limited("i:" + (req.ip || ""))) return bad();
    const p = verify(String(t || ""), secret, "uca-id-sso-v1", this.host() + "/uca-id");
    if (!p || (p.product && p.product !== "share")) return bad();
    const u = await this.userByEmail(p.email);
    if (!u) return bad();
    // an account protected by its own authenticator code keeps it: UCA ID's email code does not replace it
    if (u.totpVerified) return this.page(res, 403, "Sign in with your code", "This Share account uses an authenticator code, so sign in with your password and code.", "/auth/signIn", "Sign in to Share");
    await this.signIn(res, u.id);
    await this.uca.audit("account.uca-id-sso", u.email.toLowerCase(), `signed in via UCA ID · ip ${req.ip}`);
    const next = typeof p.next === "string" && /^\/(?!\/)/.test(p.next) && !p.next.includes("\\") ? p.next : "/account";
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, next);
  }
}
