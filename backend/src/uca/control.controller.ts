import { All, Body, CanActivate, Controller, Delete, ExecutionContext, Get, HttpCode, Injectable, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import * as crypto from "crypto";
import { Request } from "express";
import { ConfigService } from "src/config/config.service";
import { EmailService } from "src/email/email.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDTO } from "src/user/dto/createUser.dto";
import { UserService } from "src/user/user.service";
import { ControlService, fail, iso } from "./control.service";
import { UcaCoreService } from "./uca-core.service";

/**
 * uca-control-v1 (ucagg-site docs/uca-control-v1.md): the JSON API ucagg.de/admin calls server to server over the
 * private Docker network (http://transfer-pingvin-share-1:3000/api/control/v1/...). nginx answers 404 for /api/control/
 * from the internet. Bearer CONTROL_TOKEN (>= 32 characters, constant-time compare); without it the whole API is 404.
 * Every write goes into the UcaAudit table as "control.<action> via ucagg.de" with the X-UCA-Admin header.
 */
type CReq = Request & { controlAdmin?: string };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const hits = new Map<string, { n: number; until: number }>();

@Injectable()
export class ControlGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<CReq>();
    const res = ctx.switchToHttp().getResponse();
    const t = String(process.env.CONTROL_TOKEN || "");
    if (t.length < 32) throw fail(404, "not found");
    res.setHeader("Cache-Control", "no-store");
    const ip = req.ip || "";
    const now = Date.now();
    const h = hits.get(ip);
    if (!h || h.until < now) hits.set(ip, { n: 1, until: now + 15 * 60_000 });
    else if (++h.n > 600) throw fail(429, "too many requests");
    if (hits.size > 1000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
    const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ""));
    const a = crypto.createHash("sha256").update(m ? m[1] : "").digest();
    const b = crypto.createHash("sha256").update(t).digest();
    if (!m || !crypto.timingSafeEqual(a, b)) throw fail(401, "not allowed");
    req.controlAdmin = String(req.headers["x-uca-admin"] || "").trim().toLowerCase().slice(0, 254) || "unknown";
    return true;
  }
}

@SkipThrottle()
@UseGuards(ControlGuard)
@Controller("control/v1")
export class ControlController {
  constructor(
    private control: ControlService,
    private uca: UcaCoreService,
    private prisma: PrismaService,
    private users: UserService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  private audit(req: CReq, action: string, detail: string, level: "info" | "warn" = "info") {
    return this.uca.audit(`control.${action} via ucagg.de`, req.controlAdmin, detail, level);
  }
  private async userByEmail(email: string) {
    const e = String(email || "").trim().toLowerCase();
    if (!e) return null;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = ${e} LIMIT 1`;
    return rows.length ? this.prisma.user.findUnique({ where: { id: rows[0].id } }) : null;
  }
  /** bytes and share counts per creator, in one pass */
  private async usage() {
    const files = await this.prisma.file.findMany({ select: { size: true, share: { select: { creatorId: true } } } });
    const shares = await this.prisma.share.groupBy({ by: ["creatorId"], _count: { _all: true } });
    const bytes = new Map<string, number>();
    for (const f of files) if (f.share?.creatorId) bytes.set(f.share.creatorId, (bytes.get(f.share.creatorId) || 0) + (Number(f.size) || 0));
    return { bytes, shares: new Map(shares.filter((s) => s.creatorId).map((s) => [s.creatorId as string, s._count._all])) };
  }
  private row(u: { id: string; email: string; username: string; isAdmin: boolean; createdAt: Date; lastSeenAt: Date | null }, use: { bytes: Map<string, number>; shares: Map<string, number> }) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    return { email: u.email.toLowerCase(), name: u.username, plan: "access", planLabel: u.isAdmin ? "Account · admin" : "Account", status: "active",
      createdAt: iso(u.createdAt), lastSeenAt: iso(u.lastSeenAt), online: !!(u.lastSeenAt && u.lastSeenAt >= today),
      isAdmin: u.isAdmin, shares: use.shares.get(u.id) || 0, storageBytes: use.bytes.get(u.id) || 0 };
  }

  @Get("health")
  health() { return this.control.health(); }

  @Get("stats")
  stats() { return this.control.stats(); }

  // ---------- people ----------
  @Get("people")
  async people(@Query("q") q?: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    const s = String(q || "").trim().slice(0, 100);
    const where = s ? { OR: [{ email: { contains: s } }, { username: { contains: s } }] } : {};
    const take = Math.max(1, Math.min(500, Number(limit) || 50)), skip = Math.max(0, Number(offset) || 0);
    const [total, rows, use] = await Promise.all([this.prisma.user.count({ where }), this.prisma.user.findMany({ where, orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }], take, skip }), this.usage()]);
    return { total, people: rows.map((u) => this.row(u, use)) };
  }
  @Get("people/:email")
  async person(@Param("email") email: string) {
    const u = await this.userByEmail(email);
    if (!u) throw fail(404, "unknown email");
    const use = await this.usage();
    const shares = await this.prisma.share.findMany({ where: { creatorId: u.id }, orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, name: true, createdAt: true, expiration: true, views: true, _count: { select: { files: true } } } });
    return { ...this.row(u, use), twofa: u.totpVerified, signIn: u.ldapDN ? "ldap" : u.password ? "password" : "sign-in provider",
      reverseShares: await this.prisma.reverseShare.count({ where: { creatorId: u.id } }),
      recentShares: shares.map((s) => ({ id: s.id, name: s.name || null, createdAt: iso(s.createdAt), expiresAt: s.expiration.getTime() === 0 ? null : iso(s.expiration), views: s.views, files: s._count.files })) };
  }

  // ---------- plans, grant, revoke ----------
  @Get("plans")
  plans() { return { plans: [{ id: "access", label: "Account", kind: "access" }], note: "UCA Share is free: a grant creates the account (with Share's own invite email)." }; }

  private async freeUsername(email: string) {
    let base = email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "_").replace(/^[._]+/, "").slice(0, 26);
    if (base.length < 3) base = (base + "_share").slice(0, 26);
    for (let i = 0; i < 200; i++) {
      const name = i ? `${base}${i + 1}` : base;
      if (!(await this.prisma.user.findUnique({ where: { username: name } }))) return name;
    }
    return `${base.slice(0, 20)}_${crypto.randomBytes(3).toString("hex")}`;
  }
  /** create an account; with invite, Pingvin's own path: a temporary password in the "invite" email template */
  private async createAccount(email: string, invite: boolean, isAdmin: boolean) {
    const dto = new CreateUserDTO();
    dto.email = email; dto.username = await this.freeUsername(email); dto.isAdmin = isAdmin;
    if (!invite) dto.password = crypto.randomBytes(18).toString("base64url");
    if (invite && !this.control.smtpConfigured()) throw fail(409, "SMTP is off in Share, so the invite cannot be sent.");
    try {
      const u = await this.users.create(dto);
      if (!u) throw fail(500, "the account could not be created");
      return u;
    } catch (e) {
      const err = e as Error & { status?: number };
      throw fail(err.status && err.status < 500 ? err.status : 502, /email/i.test(err.message) ? "The invite email could not be sent; nothing was created." : err.message);
    }
  }

  @Post("grant")
  @HttpCode(200)
  async grant(@Req() req: CReq, @Body() b: { email?: string; plan?: string; invite?: boolean; note?: string }) {
    const email = String(b?.email || "").trim().toLowerCase();
    if (!EMAIL.test(email)) throw fail(400, "email is not valid");
    if (b.plan && b.plan !== "access") throw fail(400, "plan must be access (UCA Share is free)");
    const existing = await this.userByEmail(email);
    if (existing) {
      await this.audit(req, "grant", `${email}: access (already had an account)${b.note ? " - " + String(b.note).slice(0, 200) : ""}`);
      return { ok: true, email, plan: "access", until: null, created: false, inviteSent: false, note: "already has an account" };
    }
    const u = await this.createAccount(email, b.invite !== false, false);
    await this.audit(req, "grant", `${email}: access, account created as ${u.username}${b.invite !== false ? ", invite sent" : ""}${b.note ? " - " + String(b.note).slice(0, 200) : ""}`);
    return { ok: true, email, plan: "access", until: null, created: true, inviteSent: b.invite !== false, username: u.username };
  }

  /**
   * Share is free, so "revoke access" means deleting the account. That would delete the person's shares too, so it is
   * only done when there is nothing to lose: no shares, not an admin. Otherwise 409 with what to do instead.
   */
  @Post("revoke")
  @HttpCode(200)
  async revoke(@Req() req: CReq, @Body() b: { email?: string; note?: string }) {
    const u = await this.userByEmail(String(b?.email || ""));
    if (!u) throw fail(404, "unknown email");
    if (u.isAdmin) throw fail(409, "This is a Share admin: remove the admin role first.");
    const n = await this.prisma.share.count({ where: { creatorId: u.id } });
    const rs = await this.prisma.reverseShare.count({ where: { creatorId: u.id } });
    if (n || rs) throw fail(409, `This account has ${n} share(s) and ${rs} upload link(s); removing it would delete them. Delete it in Share's own admin (Users) if you mean that.`);
    await this.users.delete(u.id);
    await this.audit(req, "revoke", `${u.email}: account deleted (it had no shares)${b.note ? " - " + String(b.note).slice(0, 200) : ""}`);
    return { ok: true, deleted: true };
  }

  // ---------- admins ----------
  private readonly ADMIN_NOTE = "UCA Share has one admin level: admin = everything (users, shares, settings). support and viewer do not exist in Share and are refused rather than turned into full admins. Admins sign in with password (+ their own authenticator code if they set one up) or through ucagg.de/admin.";
  @Get("admins")
  async admins() {
    const rows = await this.prisma.user.findMany({ where: { isAdmin: true }, orderBy: { createdAt: "asc" } });
    return { admins: rows.map((u) => ({ email: u.email.toLowerCase(), role: "admin", twofa: u.totpVerified, lastLoginAt: iso(u.lastSeenAt), name: u.username })), roles: ["admin"], note: this.ADMIN_NOTE };
  }
  @Post("admins")
  @HttpCode(200)
  async addAdmin(@Req() req: CReq, @Body() b: { email?: string; role?: string }) {
    const email = String(b?.email || "").trim().toLowerCase(), role = String(b?.role || "admin");
    if (!EMAIL.test(email)) throw fail(400, "email is not valid");
    if (role !== "admin") throw fail(400, "UCA Share has only the admin role (full access); support and viewer do not exist here.");
    let u = await this.userByEmail(email);
    let invited = false;
    if (!u) { u = await this.createAccount(email, true, true); invited = true; }
    else if (!u.isAdmin) await this.prisma.user.update({ where: { id: u.id }, data: { isAdmin: true } });
    await this.audit(req, "admins.set", `${email}: admin${invited ? " (account created, invite sent)" : ""}`);
    return { ok: true, email, role: "admin", invited, note: this.ADMIN_NOTE };
  }
  @Delete("admins/:email")
  async removeAdmin(@Req() req: CReq, @Param("email") email: string) {
    const u = await this.userByEmail(email);
    if (!u || !u.isAdmin) throw fail(404, "not an admin");
    if ((await this.prisma.user.count({ where: { isAdmin: true } })) <= 1) throw fail(409, "this is the last admin");
    await this.prisma.user.update({ where: { id: u.id }, data: { isAdmin: false } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: u.id } });   // their sessions end (access tokens live 15 min at most)
    await this.audit(req, "admins.remove", u.email.toLowerCase());
    return { ok: true };
  }

  // ---------- messages: Share has no in-app inbox, so they go out as email through Share's own mailer ----------
  @Post("messages")
  @HttpCode(200)
  async messages(@Req() req: CReq, @Body() b: { audience?: string; emails?: string[]; title?: string; body?: string; cta?: { label?: string; url?: string } }) {
    const title = String(b?.title || "").trim().slice(0, 200), text = String(b?.body || "").slice(0, 10000);
    if (!title || !text.trim()) throw fail(400, "title and body, please");
    if (!this.control.smtpConfigured()) throw fail(409, "SMTP is off in Share: messages go out by email only.");
    const audience = ["all", "plans", "emails"].includes(String(b.audience)) ? String(b.audience) : "all";
    let to: string[];
    if (audience === "emails") {
      const want = new Set((Array.isArray(b.emails) ? b.emails : []).map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL.test(e)));
      // only people who have a Share account: Share is not a general mailer
      to = (await this.prisma.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase()).filter((e) => want.has(e));
    } else {
      to = (await this.prisma.user.findMany({ select: { email: true } })).map((u) => u.email.toLowerCase());
    }
    to = [...new Set(to)];
    const cta = b.cta && /^https:\/\//.test(String(b.cta.url || "")) ? `\n\n${String(b.cta.label || "Open").slice(0, 40)}: ${String(b.cta.url).slice(0, 500)}` : "";
    const mail = `${text.trim()}${cta}\n\n--\nYou get this because you have a UCA Share account (${this.config.get("general.appUrl")}).`;
    const row = await this.prisma.ucaAudit.create({ data: { kind: "control.messages via ucagg.de", actor: req.controlAdmin, detail: `"${title.slice(0, 80)}" to ${to.length} (${audience}) - sending` } });
    // send in the background (ucagg.de waits 8 s at most); the audit row gets the result
    (async () => {
      let sent = 0, failed = 0;
      for (const e of to) { try { await this.email.sendPlain(e, title, mail); sent++; } catch { failed++; } }
      await this.prisma.ucaAudit.update({ where: { id: row.id }, data: { detail: `"${title.slice(0, 80)}" to ${to.length} (${audience}) - ${sent} sent${failed ? `, ${failed} failed` : ""}`, level: failed ? "warn" : "info" } });
    })().catch(() => {});
    return { ok: true, id: String(row.id), recipients: to.length, note: "email only - Share has no in-app inbox" };
  }

  // ---------- settings: Share's limits and switches ----------
  @Get("settings")
  settings() { return { settings: this.control.settings() }; }
  @Post("settings")
  @HttpCode(200)
  saveSettings(@Req() req: CReq, @Body() body: Record<string, unknown>) { return this.control.saveSettings(body, req.controlAdmin); }

  // ---------- the daily job and "check now" ----------
  @Get("daily")
  async daily() { return { everyHours: 24, report: await this.control.lastReport() }; }
  @Post("daily")
  @HttpCode(200)
  async runDaily(@Req() req: CReq) {
    const report = await this.control.runDaily(req.controlAdmin);
    return { report };
  }
  @Post("check")
  @HttpCode(200)
  async check(@Req() req: CReq) {
    const r = await this.control.runChecks(req.controlAdmin);
    await this.audit(req, "check", r.ok ? "all ok" : r.problems.join(" | "), r.ok ? "info" : "warn");
    return { at: r.at, ok: r.ok, problems: r.problems, checks: r.checks, checked: r.checks.length };
  }

  // ---------- the log ucagg.de's fleet view shows ----------
  @Get("logs")
  async logs(@Query("since") since?: string, @Query("level") level?: string, @Query("kind") kind?: string, @Query("limit") limit?: string) {
    const s = since ? new Date(isNaN(Number(since)) ? since : Number(since)) : null;
    const rows = await this.prisma.ucaAudit.findMany({
      where: { ...(s && !isNaN(s.getTime()) ? { at: { gt: s } } : {}), ...(level ? { level: String(level) } : {}), ...(kind ? { kind: { contains: String(kind).slice(0, 40) } } : {}) },
      orderBy: { id: "desc" }, take: Math.max(1, Math.min(500, Number(limit) || 100)),
    });
    return { app: "share", logs: rows.map((l) => ({ id: String(l.id), at: iso(l.at), level: l.level, kind: l.kind, actor: l.actor, message: l.detail || l.kind })) };
  }

  // threads (no "report a problem" in Share), registrations (accounts already reach ucagg.de through the UCA ID hub),
  // devices and the rest: not built - ucagg.de hides those parts for Share
  @All("*path")
  notBuilt() { throw fail(501, "not built"); }
}

