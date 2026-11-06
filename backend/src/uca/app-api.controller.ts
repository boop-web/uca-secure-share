import { Body, CanActivate, Controller, Delete, ExecutionContext, Get, HttpCode, Injectable, Param, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { User } from "@prisma/client";
import * as crypto from "crypto";
import { Request, Response } from "express";
import * as fs from "fs/promises";
import { ConfigService } from "src/config/config.service";
import { SHARE_DIRECTORY } from "src/constants";
import { PrismaService } from "src/prisma/prisma.service";
import { ShareService } from "src/share/share.service";
import { CreateUserDTO } from "src/user/dto/createUser.dto";
import { UserService } from "src/user/user.service";
import { fail } from "./control.service";
import { DownloadEvent, DownloadsService } from "./downloads.service";
import { PlanService, UPGRADE_TEXT, UPGRADE_URL } from "./plan.service";
import { shareView } from "./share-view";
import { UcaCoreService } from "./uca-core.service";

/**
 * uca-share-v1 (ucagg-site docs/uca-share-v1.md): the API other UCA apps use to send files for their person.
 *   Authorization: Bearer <app token>
 * An app token is minted by the app's OWN server (UCA AI: ai.ucagg.de, later UCA Tidy: tidy.ucagg.de), which already
 * knows the email its licence belongs to and the PC it is activated on. No UCA ID sign-in is needed. Format:
 *   base64url(JSON payload) "." base64url(HMAC-SHA256(SHARE_APP_KEY_<ISS>, "uca-share-app-v1\n" + base64url payload))
 *   payload { v: 1, iss: "ai" | "tidy" | ..., aud: "share.ucagg.de", email, sub: the PC (activation id), iat, exp } (ms)
 * Valid at most 1 hour. Share then asks ucagg.de for that email's bundle (UCA Pro / UCA Max); without one the app gets
 * plan "none" and every send is refused with 402 + the hint line. Plain JSON only; files go up in raw chunks.
 */
const LABEL = "uca-share-app-v1";
const MAX_LIFE_MS = 3600_000;
const MAX_FILES = 50;
type AReq = Request & { ucaApp?: { iss: string; email: string; sub: string; user: User | null } };

const buckets = new Map<string, { n: number; until: number }>();
function over(key: string, max: number, windowMs: number) {
  const now = Date.now(), h = buckets.get(key);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  if (!h || h.until < now) { buckets.set(key, { n: 1, until: now + windowMs }); return false; }
  return ++h.n > max;
}

export function verifyAppToken(token: string, aud: string, now = Date.now()) {
  if (!token || token.length > 2000) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot), sig = token.slice(dot + 1);
  let p: { v?: number; iss?: string; aud?: string; email?: string; sub?: string; iat?: number; exp?: number };
  try { p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!p || typeof p.iss !== "string" || !/^[a-z0-9]{2,20}$/.test(p.iss)) return null;
  const key = String(process.env["SHARE_APP_KEY_" + p.iss.toUpperCase()] || "");
  if (key.length < 32) return null;
  const want = crypto.createHmac("sha256", key).update(LABEL + "\n" + payload).digest();
  let got: Buffer;
  try { got = Buffer.from(sig, "base64url"); } catch { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  if (p.v !== 1 || p.aud !== aud || typeof p.iat !== "number" || typeof p.exp !== "number") return null;
  if (p.exp <= now || p.iat > now + 30_000 || p.exp - p.iat > MAX_LIFE_MS) return null;
  const email = String(p.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return null;
  return { iss: p.iss, email, sub: String(p.sub || "").slice(0, 80) };
}

@Injectable()
export class AppTokenGuard implements CanActivate {
  constructor(private prisma: PrismaService, private config: ConfigService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<AReq>();
    const res = ctx.switchToHttp().getResponse<Response>();
    res.setHeader("Cache-Control", "no-store");
    const ip = req.ip || "";
    const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ""));
    let host = "share.ucagg.de";
    try { host = new URL(this.config.get("general.appUrl")).host; } catch { /* default */ }
    const t = m ? verifyAppToken(m[1], host) : null;
    if (!t) {
      if (over("bad:" + ip, 30, 5 * 60_000)) throw fail(429, "Too many requests.");
      throw fail(401, "A valid app token, please (uca-share-app-v1).");
    }
    // chunks are many and small: they have their own, higher limit
    const chunk = req.method === "PUT";
    if (over((chunk ? "put:" : "req:") + t.email, chunk ? 3000 : 600, 5 * 60_000)) throw fail(429, "Too many requests. Please wait a few minutes.");
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = ${t.email} LIMIT 1`;
    const user = rows.length ? await this.prisma.user.findUnique({ where: { id: rows[0].id } }) : null;
    req.ucaApp = { ...t, user };
    return true;
  }
}

@SkipThrottle()
@UseGuards(AppTokenGuard)
@Controller("app/v1")
export class AppApiController {
  private streams = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private plans: PlanService,
    private downloads: DownloadsService,
    private shares: ShareService,
    private users: UserService,
    private uca: UcaCoreService,
  ) {}

  private appUrl() { return String(this.config.get("general.appUrl") || "https://share.ucagg.de"); }

  /** the person's Share account, made on the first send (no email, a random password: they come in by the app or UCA ID) */
  private async account(req: AReq) {
    if (req.ucaApp.user) return req.ucaApp.user;
    const dto = new CreateUserDTO();
    dto.email = req.ucaApp.email; dto.isAdmin = false; dto.password = crypto.randomBytes(18).toString("base64url");
    let base = req.ucaApp.email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "_").replace(/^[._]+/, "").slice(0, 26);
    if (base.length < 3) base = (base + "_share").slice(0, 26);
    dto.username = base;
    for (let i = 2; await this.prisma.user.findUnique({ where: { username: dto.username } }); i++) dto.username = i < 200 ? `${base}${i}` : `${base.slice(0, 20)}_${crypto.randomBytes(3).toString("hex")}`;
    const u = await this.users.create(dto);
    await this.uca.audit("app.account", req.ucaApp.email, `Share account made for the ${req.ucaApp.iss} app (${dto.username})`);
    req.ucaApp.user = u;
    return u;
  }
  private async own(req: AReq, id: string) {
    const u = req.ucaApp.user;
    const s = u ? await this.prisma.share.findFirst({ where: { id: String(id || ""), creatorId: u.id }, include: { files: true, downloadLog: { orderBy: { id: "asc" } } } }) : null;
    if (!s) throw fail(404, "No such share.");
    return s;
  }

  @Get("me")
  async me(@Req() req: AReq) {
    const p = await this.plans.planOf(req.ucaApp.user || { email: req.ucaApp.email, isAdmin: false });
    const u = req.ucaApp.user;
    const used = u ? await this.plans.usedBytes(u.id) : 0;
    const live = u ? await this.prisma.share.count({ where: this.plans.liveWhere(u.id) }) : 0;
    return {
      email: req.ucaApp.email, plan: p.plan, planLabel: p.label, until: p.until, canSend: p.plan !== "none",
      limits: { perLinkBytes: p.perLinkBytes, storageBytes: p.storageBytes, maxDays: p.maxDays, maxDownloads: p.maxDownloads, chunkBytes: Number(this.config.get("share.chunkSize")) },
      usedBytes: used, liveShares: live,
      ...(p.plan === "none" ? { upgrade: { text: UPGRADE_TEXT, url: UPGRADE_URL } } : {}),
      ...(p.unavailable ? { planUnavailable: true } : {}),
    };
  }

  @Post("shares")
  @HttpCode(201)
  async create(@Req() req: AReq, @Body() b: { name?: string; description?: string; mode?: string; downloads?: number; days?: number; files?: { name?: string; size?: number }[] }) {
    if (!b || typeof b !== "object") throw fail(400, "JSON, please.");
    if (over("create:" + req.ucaApp.email, 30, 3600_000)) throw fail(429, "30 links an hour at most.");
    const plan = await this.plans.planOf(req.ucaApp.user || { email: req.ucaApp.email, isAdmin: false });
    this.plans.assertCanSend(plan);
    if (b.mode !== "downloads" && b.mode !== "days") throw fail(400, 'mode: "downloads" or "days".');
    const files = Array.isArray(b.files) ? b.files : [];
    if (!files.length || files.length > MAX_FILES) throw fail(400, `files: 1 to ${MAX_FILES}.`);
    const list = files.map((f) => {
      const name = String(f?.name || "").replace(/[\\/]+/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
      const size = Number(f?.size);
      if (!name || !Number.isInteger(size) || size < 0) throw fail(400, "Every file needs a name and a size (bytes).");
      return { id: crypto.randomUUID(), name, size };
    });
    const total = list.reduce((t, f) => t + f.size, 0);
    const name = b.name == null ? null : String(b.name).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 30) || null;
    const description = b.description == null ? null : String(b.description).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").slice(0, 512) || null;
    const user = await this.account(req);
    const rules = await this.shares.linkRules({ mode: b.mode, maxDownloads: b.downloads, days: b.days } as never, user);
    const id = crypto.randomBytes(8).toString("base64url").replace(/[-_]/g, "x");
    await this.plans.assertRoom(user, id, total);
    await fs.mkdir(`${SHARE_DIRECTORY}/${id}`, { recursive: true });
    const s = await this.prisma.share.create({
      data: { id, name, description, expiration: rules.expiration, mode: rules.mode, maxDownloads: rules.maxDownloads, creatorId: user.id,
        storageProvider: "LOCAL", pending: JSON.stringify(list), security: { create: {} } },
      include: { files: true },
    });
    await this.uca.audit("app.share", req.ucaApp.email, `${req.ucaApp.iss}: link ${id} (${rules.mode}${rules.maxDownloads ? " " + rules.maxDownloads : ""}, ${list.length} files, ${total} bytes)`);
    return { ...shareView(s, this.appUrl()), chunkBytes: Number(this.config.get("share.chunkSize")),
      uploadUrl: `${this.appUrl().replace(/\/+$/, "")}/api/app/v1/shares/${id}/files/{fileId}?offset={offset}` };
  }

  private async fileSlot(req: AReq, id: string, fileId: string) {
    const s = await this.own(req, id);
    let pending: { id: string; name: string; size: number }[] = [];
    try { pending = JSON.parse(s.pending || "[]"); } catch { /* none */ }
    const f = pending.find((x) => x.id === fileId);
    if (!f) throw fail(404, "No such file in this share.");
    const done = s.files.some((x) => x.id === fileId);
    const tmp = `${SHARE_DIRECTORY}/${s.id}/${f.id}.tmp-chunk`;
    let received = done ? f.size : 0;
    if (!done) try { received = (await fs.stat(tmp)).size; } catch { received = 0; }
    return { s, f, done, tmp, received };
  }

  @Get("shares/:id/files/:fileId")
  async fileState(@Req() req: AReq, @Param("id") id: string, @Param("fileId") fileId: string) {
    const x = await this.fileSlot(req, id, fileId);
    return { id: x.f.id, name: x.f.name, size: x.f.size, received: x.received, done: x.done };
  }

  /** one raw chunk (Content-Type: application/octet-stream, at most chunkBytes) at ?offset= = bytes received so far */
  @Put("shares/:id/files/:fileId")
  async chunk(@Req() req: AReq, @Param("id") id: string, @Param("fileId") fileId: string, @Query("offset") offset: string) {
    const x = await this.fileSlot(req, id, fileId);
    if (x.s.uploadLocked) throw fail(409, "This share is already complete.");
    if (x.done) return { id: x.f.id, size: x.f.size, received: x.f.size, done: true };
    const body = req.body;
    if (!Buffer.isBuffer(body)) throw fail(415, "Send the chunk as application/octet-stream.");
    if (Number(offset) !== x.received) throw fail(409, `Expected offset ${x.received}.`);
    if (x.received + body.length > x.f.size) throw fail(400, "More bytes than the file announced.");
    // the announced sizes were checked at create; this keeps the plan's limits if the plan changed meanwhile
    const doneBytes = x.s.files.reduce((t, f) => t + (Number(f.size) || 0), 0);
    await this.plans.assertRoom(req.ucaApp.user, x.s.id, doneBytes + x.received + body.length);
    const space = await fs.statfs(SHARE_DIRECTORY);
    if (space.bavail * space.bsize < body.length + 1e9) throw fail(507, "The server is out of space right now.");
    if (body.length) await fs.appendFile(x.tmp, body);
    const received = x.received + body.length;
    if (received === x.f.size) await this.finish(x.s.id, x.f, x.tmp);
    return { id: x.f.id, size: x.f.size, received, done: received === x.f.size };
  }
  private async finish(shareId: string, f: { id: string; name: string; size: number }, tmp: string) {
    const dest = `${SHARE_DIRECTORY}/${shareId}/${f.id}`;
    if (f.size === 0) await fs.writeFile(dest, Buffer.alloc(0)); else await fs.rename(tmp, dest);
    const size = (await fs.stat(dest)).size;
    await this.prisma.file.create({ data: { id: f.id, name: f.name, size: String(size), shareId } });
  }

  @Post("shares/:id/complete")
  @HttpCode(200)
  async complete(@Req() req: AReq, @Param("id") id: string) {
    const s = await this.own(req, id);
    if (s.uploadLocked) throw fail(409, "This share is already complete.");
    let pending: { id: string; name: string; size: number }[] = [];
    try { pending = JSON.parse(s.pending || "[]"); } catch { /* none */ }
    const have = new Set(s.files.map((f) => f.id));
    for (const f of pending) if (!have.has(f.id) && f.size === 0) { await this.finish(s.id, f, ""); have.add(f.id); }
    const missing = pending.filter((f) => !have.has(f.id));
    if (missing.length) throw fail(409, `Not uploaded yet: ${missing.map((f) => f.name).slice(0, 5).join(", ")}.`);
    await this.shares.complete(s.id);
    await this.prisma.share.update({ where: { id: s.id }, data: { pending: null } });
    return shareView(await this.own(req, id), this.appUrl(), true);
  }

  @Get("shares")
  async list(@Req() req: AReq) {
    const u = req.ucaApp.user;
    if (!u) return { shares: [] };
    const rows = await this.prisma.share.findMany({ where: { ...this.plans.listWhere(u.id) }, orderBy: { createdAt: "desc" }, take: 200,
      include: { files: true } });
    return { shares: rows.map((s) => shareView(s, this.appUrl())) };
  }

  @Get("shares/:id")
  async one(@Req() req: AReq, @Param("id") id: string) {
    return shareView(await this.own(req, id), this.appUrl(), true);
  }

  @Delete("shares/:id")
  async remove(@Req() req: AReq, @Param("id") id: string) {
    const s = await this.own(req, id);
    await this.shares.remove(s.id);
    await this.uca.audit("app.share.delete", req.ucaApp.email, `${req.ucaApp.iss}: link ${s.id} deleted`);
    return { ok: true, usedBytes: await this.plans.usedBytes(req.ucaApp.user.id) };
  }

  /**
   * download events: "your file was downloaded". Accept: text/event-stream = a stream (event "download", id = event
   * id, ": ping" every 25 s); otherwise a long poll: ?after=<last id>&wait=<seconds, max 25> -> { events, last }.
   * Both replay what came after `after` / Last-Event-ID first (events live as long as their share).
   */
  @Get("events")
  async events(@Req() req: AReq, @Res() res: Response, @Query("after") afterQ?: string, @Query("wait") waitQ?: string) {
    const u = req.ucaApp.user;
    const after = Math.max(0, Number(req.headers["last-event-id"] || afterQ) || 0);
    const sse = /text\/event-stream/.test(String(req.headers.accept || ""));
    if (!sse) {
      const first = u ? await this.downloads.eventsAfter(u.id, after) : [];
      const wait = Math.max(0, Math.min(25, Number(waitQ) || 0)) * 1000;
      if (first.length || !wait || !u) { res.json({ events: first, last: first.length ? first[first.length - 1].id : after }); return; }
      const got = await new Promise<DownloadEvent[]>((resolve) => {
        const on = (e: DownloadEvent) => { clearTimeout(t); this.downloads.events.off("download:" + u.id, on); resolve([e]); };
        const t = setTimeout(() => { this.downloads.events.off("download:" + u.id, on); resolve([]); }, wait);
        this.downloads.events.on("download:" + u.id, on);
        res.on("close", () => { clearTimeout(t); this.downloads.events.off("download:" + u.id, on); });
      });
      res.json({ events: got, last: got.length ? got[got.length - 1].id : after });
      return;
    }
    const key = req.ucaApp.email;
    if ((this.streams.get(key) || 0) >= 5) { res.status(429).json({ error: "5 streams at most per person." }); return; }
    this.streams.set(key, (this.streams.get(key) || 0) + 1);
    res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders?.();
    const send = (e: DownloadEvent) => res.write(`id: ${e.id}\nevent: download\ndata: ${JSON.stringify(e)}\n\n`);
    res.write(`retry: 5000\n: uca-share-v1 events for ${key}\n\n`);
    if (u) for (const e of await this.downloads.eventsAfter(u.id, after)) send(e);
    const on = (e: DownloadEvent) => send(e);
    // the account may be made later (first send): listen by id once it exists
    let uid = u?.id;
    if (uid) this.downloads.events.on("download:" + uid, on);
    const ping = setInterval(async () => {
      res.write(": ping\n\n");
      if (!uid) {
        const rows = await this.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = ${key} LIMIT 1`.catch(() => []);
        if (rows.length) { uid = rows[0].id; this.downloads.events.on("download:" + uid, on); }
      }
    }, 25_000);
    res.on("close", () => {
      clearInterval(ping);
      if (uid) this.downloads.events.off("download:" + uid, on);
      const n = (this.streams.get(key) || 1) - 1;
      if (n <= 0) this.streams.delete(key); else this.streams.set(key, n);
    });
  }
}
