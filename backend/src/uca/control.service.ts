import { HttpException, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ConfigService } from "src/config/config.service";
import { DATA_DIRECTORY, SHARE_DIRECTORY } from "src/constants";
import { EmailService } from "src/email/email.service";
import { JobsService } from "src/jobs/jobs.service";
import { PrismaService } from "src/prisma/prisma.service";
import { stringToTimespan } from "src/utils/date.util";
import { PlanService } from "./plan.service";
import { UcaCoreService } from "./uca-core.service";

export const STARTED = Date.now();
const DAY = 86_400_000;
const IMG_DIR = process.env.UCA_IMG_DIR || path.resolve(process.cwd(), "../frontend/public/img");
export const fail = (status: number, error: string) => new HttpException({ error }, status);
export const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);
const pkgVersion = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).version as string; } catch { return null; }
})();

// ---------- the limits and switches ucagg.de may change (uca-control-v1 "settings") ----------
type SettingType = "number" | "bytes" | "duration" | "boolean" | "text" | "select";
interface SettingDef { key: `${string}.${string}`; label: string; type: SettingType; min?: number; max?: number; help?: string; email?: boolean }
export const SETTINGS: SettingDef[] = [
  { key: "share.maxSize", label: "Largest share", type: "bytes", min: 1_000_000, max: 1_000_000_000_000, help: "All files of one share together." },
  { key: "share.maxExpiration", label: "Longest expiry", type: "duration", min: 0, max: 10 * 365 * 86400, help: "0 = no limit (people may also pick \"never\")." },
  { key: "share.chunkSize", label: "Upload chunk size", type: "bytes", min: 1_000_000, max: 90_000_000, help: "One upload request carries one chunk; nginx accepts up to 100 MB." },
  { key: "plans.proPerLink", label: "UCA Pro: largest link", type: "bytes", min: 1_000_000, max: 1_000_000_000_000, help: "All files of one link." },
  { key: "plans.proStorage", label: "UCA Pro: space for live links", type: "bytes", min: 1_000_000, max: 10_000_000_000_000 },
  { key: "plans.maxPerLink", label: "UCA Max: largest link", type: "bytes", min: 1_000_000, max: 1_000_000_000_000 },
  { key: "plans.maxStorage", label: "UCA Max: space for live links", type: "bytes", min: 1_000_000, max: 10_000_000_000_000 },
  { key: "plans.lowDiskGB", label: "Low disk below (GB)", type: "number", min: 0, max: 10000, help: "New links get smaller limits." },
  { key: "plans.fullDiskGB", label: "Uploads paused below (GB)", type: "number", min: 0, max: 10000 },
  { key: "plans.lowDiskPercent", label: "Limits on low disk (%)", type: "number", min: 1, max: 100 },
  { key: "share.zipCompressionLevel", label: "ZIP compression", type: "number", min: 0, max: 9, help: "0 = store only (fastest), 9 = smallest files." },
  { key: "share.allowRegistration", label: "Anyone can sign up", type: "boolean" },
  { key: "share.allowUnauthenticatedShares", label: "Share without an account", type: "boolean", help: "Visitors may upload without signing in." },
  { key: "email.enableShareEmailRecipients", label: "Email the link to recipients", type: "boolean" },
  { key: "general.showHomePage", label: "Show the home page", type: "boolean", help: "Off = visitors land on the upload page." },
  { key: "smtp.enabled", label: "Send emails (SMTP)", type: "boolean", help: "Invites, password resets and recipient emails." },
  { key: "smtp.host", label: "SMTP host", type: "text" },
  { key: "smtp.port", label: "SMTP port", type: "number", min: 1, max: 65535, help: "587 = STARTTLS, 465 = TLS." },
  { key: "smtp.email", label: "Sender address", type: "text", email: true },
];
const UNIT_S: Record<string, number> = { minutes: 60, hours: 3600, days: 86400, weeks: 604800, months: 2592000, years: 31536000 };
const toSeconds = (v: string) => { const t = stringToTimespan(String(v || "0 days")); return (Number(t.value) || 0) * (UNIT_S[t.unit] || 86400); };
const fromSeconds = (s: number) => {
  if (!s) return "0 days";
  for (const u of ["weeks", "days", "hours", "minutes"]) if (s % UNIT_S[u] === 0) return `${s / UNIT_S[u]} ${u}`;
  return `${Math.max(1, Math.round(s / 60))} minutes`;
};

export interface Check { name: string; ok: boolean; detail?: string; level?: string }
export interface Report {
  at: string; ok: boolean; seconds: number; by: string; problems: string[]; checks: Check[];
  people: number; new24h: number; active24h: number; disk: { freeGB: number | null; freePct: number | null };
  shares: { active: number; expiredLeft: number; orphanDirs: number; missingDirs: number; uploadsMB: number };
  summary: string;
}

@Injectable()
export class ControlService {
  private readonly logger = new Logger("UCA control");
  private sizeCache: { at: number; bytes: number } | null = null;
  private lastSmtp: { at: number; ok: boolean; detail: string } | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private email: EmailService,
    private uca: UcaCoreService,
    private plans: PlanService,
  ) {}

  // ---------- small facts ----------
  disk() {
    try {
      const s = fs.statfsSync(DATA_DIRECTORY);
      return { freeGB: Math.round(((s.bavail * s.bsize) / 1e9) * 10) / 10, freePct: Math.round((s.bavail / s.blocks) * 100) };
    } catch { return { freeGB: null, freePct: null }; }
  }
  /** the uploads folder on disk (cached 10 min: walking it is the only expensive part) */
  uploadsBytes(fresh = false) {
    if (!fresh && this.sizeCache && Date.now() - this.sizeCache.at < 10 * 60_000) return this.sizeCache.bytes;
    let bytes = 0;
    const walk = (d: string) => {
      let es: fs.Dirent[] = [];
      try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
      for (const e of es) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else try { bytes += fs.statSync(p).size; } catch { /* gone meanwhile */ }
      }
    };
    walk(path.join(DATA_DIRECTORY, "uploads"));
    this.sizeCache = { at: Date.now(), bytes };
    return bytes;
  }
  smtpConfigured() {
    return !!(this.config.get("smtp.enabled") && this.config.get("smtp.host") && this.config.get("smtp.email"));
  }
  host() {
    const d = this.disk();
    return { os: os.platform(), kernel: os.release(), runtime: "node " + process.versions.node, cpus: os.cpus().length,
      load1: Math.round(os.loadavg()[0] * 100) / 100, memUsedPct: Math.round((1 - os.freemem() / os.totalmem()) * 100), diskFreePct: d.freePct };
  }
  version() { return pkgVersion; }
  revision() { return process.env.UCA_REVISION || null; }
  activeShareWhere() {
    return { uploadLocked: true, OR: [{ expiration: { gt: new Date() } }, { expiration: new Date(0) }] };
  }

  // ---------- health ----------
  async health() {
    const checks: Check[] = [];
    let dbOk = true;
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }
    checks.push({ name: "database", ok: dbOk });
    const smtpOn = this.smtpConfigured();
    checks.push({ name: "smtp", ok: smtpOn && (!this.lastSmtp || this.lastSmtp.ok),
      detail: !smtpOn ? "not configured" : `${this.config.get("smtp.host")}:${this.config.get("smtp.port")}${this.lastSmtp ? ` · login ${this.lastSmtp.ok ? "ok" : "failed"} ${ago(this.lastSmtp.at)}` : ""}` });
    const d = this.disk();
    checks.push({ name: "storage", ok: d.freePct == null || d.freePct >= 10, detail: `${d.freeGB ?? "?"} GB free (${d.freePct ?? "?"}%) · uploads ${mb(this.uploadsBytes())} MB` });
    // the free disk as Share sees it (owner, 6 Nov 2026): low = smaller new links, full = uploads paused
    const dk = this.plans.disk(true);
    checks.push({ name: "disk", ok: dk.level === "ok", level: dk.level, detail: dk.freeGB == null ? "unknown" : `${dk.freeGB} GB free${dk.level === "low" ? ` - under ${dk.lowGB} GB: new links get ${dk.lowPercent}% of the plan limits` : dk.level === "full" ? ` - under ${dk.fullGB} GB: uploads paused` : ""}` });
    const c = JobsService.lastExpiredCleanup;
    const upMin = (Date.now() - STARTED) / 60_000;
    checks.push({ name: "expired-share cleanup", ok: c ? Date.now() - c.at < 2 * 3600_000 : upMin < 70,
      detail: c ? `ran ${ago(c.at)}, removed ${c.deleted}` : "hourly; not run since this start yet" });
    const hs = await this.uca.hubStats();
    checks.push({ name: "UCA ID hub", ok: hs.enabled && hs.givenUp === 0 && hs.pending < 50, detail: hs.enabled ? `${hs.done} reported · ${hs.pending} pending${hs.givenUp ? ` · ${hs.givenUp} given up` : ""}` : "HUB_URL / HUB_TOKEN missing" });
    return { ok: dbOk, app: "share", version: this.version(), revision: this.revision(), uptimeS: Math.round((Date.now() - STARTED) / 1000), host: this.host(), checks };
  }

  // ---------- stats ----------
  async stats() {
    const now = Date.now();
    const users = await this.prisma.user.findMany({ select: { createdAt: true, lastSeenAt: true } });
    const since = (t: number) => users.filter((u) => u.createdAt.getTime() > now - t).length;
    const seen = (t: number) => users.filter((u) => u.lastSeenAt && u.lastSeenAt.getTime() > now - t).length;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) days.push(new Date(now - i * DAY).toISOString().slice(0, 10));
    const perDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
    for (const u of users) { const d = u.createdAt.toISOString().slice(0, 10); if (d in perDay) perDay[d]++; }
    const shares = await this.prisma.share.findMany({ select: { createdAt: true, creatorId: true, views: true, uploadLocked: true, expiration: true } });
    const sharesPerDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
    for (const s of shares) { const d = s.createdAt.toISOString().slice(0, 10); if (d in sharesPerDay) sharesPerDay[d]++; }
    const isActive = (s: { uploadLocked: boolean; expiration: Date }) => s.uploadLocked && (s.expiration.getTime() === 0 || s.expiration.getTime() > now);
    const active = shares.filter(isActive);
    const files = await this.prisma.file.findMany({ select: { size: true } });
    const dbBytes = files.reduce((t, f) => t + (Number(f.size) || 0), 0);
    return {
      people: users.length, new7: since(7 * DAY), new30: since(30 * DAY),
      active1: seen(DAY), active7: seen(7 * DAY), active30: seen(30 * DAY),
      online: users.filter((u) => u.lastSeenAt && u.lastSeenAt >= today).length, onlineLabel: "active today",
      activeLabel: "signed in or used",
      sharesActive: active.length, sharesCreated7: shares.filter((s) => s.createdAt.getTime() > now - 7 * DAY).length,
      sharesCreated30: shares.filter((s) => s.createdAt.getTime() > now - 30 * DAY).length,
      sharesAnonymous: active.filter((s) => !s.creatorId).length, sharesSignedIn: active.filter((s) => s.creatorId).length,
      files: files.length, storageGB: Math.round((dbBytes / 1e9) * 100) / 100, storageBytes: dbBytes,
      shareViews: shares.reduce((t, s) => t + (s.views || 0), 0),
      reverseShares: await this.prisma.reverseShare.count({ where: { shareExpiration: { gt: new Date() } } }),
      signups30: days.map((day) => ({ day, n: perDay[day] })),
      sharesPerDay30: days.map((day) => ({ day, n: sharesPerDay[day] })),
    };
  }

  // ---------- settings ----------
  settings() {
    return SETTINGS.map((s) => {
      const raw = this.config.get(s.key);
      const value = s.type === "duration" ? toSeconds(this.rawValue(s.key)) : raw;
      return { key: s.key, label: s.label, type: s.type, value, ...(s.min != null ? { min: s.min } : {}), ...(s.max != null ? { max: s.max } : {}), ...(s.help ? { help: s.help } : {}) };
    });
  }
  private rawValue(key: string) {
    const [category, name] = key.split(".");
    // ConfigService.get() turns a timespan into { value, unit }; give it back as text
    const t = this.config.get(`${category}.${name}` as `${string}.${string}`);
    return t && typeof t === "object" ? `${t.value} ${t.unit}` : String(t);
  }
  /** validate everything first, then write through ConfigService.update (it reloads its cache and emits "update") */
  async saveSettings(body: Record<string, unknown>, by: string) {
    if (!body || typeof body !== "object" || Array.isArray(body)) throw fail(400, "Send { key: value, ... }.");
    const changes: { def: SettingDef; value: string | number | boolean; shown: string }[] = [];
    for (const [key, v] of Object.entries(body)) {
      const def = SETTINGS.find((s) => s.key === key);
      if (!def) throw fail(400, `Unknown setting: ${key.slice(0, 60)}`);
      if (def.type === "boolean") {
        if (typeof v !== "boolean") throw fail(400, `${def.label}: true or false.`);
        changes.push({ def, value: v, shown: String(v) });
      } else if (def.type === "text") {
        const s = String(v ?? "").trim();
        if (!s || s.length > 200 || /[\r\n]/.test(s)) throw fail(400, `${def.label}: 1 to 200 characters on one line.`);
        if (def.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) throw fail(400, `${def.label}: an email address.`);
        changes.push({ def, value: s, shown: s });
      } else {
        const n = Number(v);
        if (typeof v === "boolean" || v === "" || v === null || !Number.isFinite(n) || Math.round(n) !== n) throw fail(400, `${def.label}: a whole number.`);
        if ((def.min != null && n < def.min) || (def.max != null && n > def.max)) throw fail(400, `${def.label}: from ${def.min} to ${def.max}.`);
        if (def.type === "duration") changes.push({ def, value: fromSeconds(n), shown: fromSeconds(n) });
        else changes.push({ def, value: n, shown: String(n) });
      }
    }
    if (!changes.length) throw fail(400, "Nothing to change.");
    const chunk = changes.find((c) => c.def.key === "share.chunkSize");
    const max = changes.find((c) => c.def.key === "share.maxSize");
    if (chunk && Number(chunk.value) > Number(max ? max.value : this.config.get("share.maxSize"))) throw fail(400, "The chunk size cannot be larger than the largest share.");
    const done: string[] = [];
    for (const c of changes) {
      const before = c.def.type === "duration" ? this.rawValue(c.def.key) : String(this.config.get(c.def.key));
      if (before === c.shown) continue;
      try { await this.config.update(c.def.key, c.value); }
      catch (e) { throw fail(400, `${c.def.label}: ${(e as Error).message}`); }
      done.push(`${c.def.key}: ${before} -> ${c.shown}`);
    }
    if (done.length) await this.uca.audit("control.settings via ucagg.de", by, done.join("; "));
    return { ok: true, changed: done.length, settings: this.settings() };
  }

  // ---------- the daily check (also "check now") ----------
  async runChecks(by: string): Promise<Report> {
    const t0 = Date.now();
    const checks: Check[] = [];
    let dbOk = true;
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { dbOk = false; }
    checks.push({ name: "database", ok: dbOk });
    const smtp = await this.email.verifySmtp().catch((e) => ({ ok: false, detail: String(e.message).slice(0, 120) }));
    this.lastSmtp = { at: Date.now(), ok: smtp.ok, detail: smtp.detail };
    checks.push({ name: "smtp login", ok: smtp.ok, detail: smtp.detail });
    const disk = this.disk();
    checks.push({ name: "disk", ok: disk.freePct == null || disk.freePct >= 10, detail: `${disk.freeGB ?? "?"} GB free (${disk.freePct ?? "?"}%)` });
    // expired shares must be gone (the hourly job removes them; 2 h of slack)
    const expiredLeft = await this.prisma.share.count({ where: { AND: [{ expiration: { lt: new Date(Date.now() - 2 * 3600_000) } }, { expiration: { not: new Date(0) } }] } });
    checks.push({ name: "expired shares removed", ok: expiredLeft === 0, detail: expiredLeft ? `${expiredLeft} expired shares still there` : "none left" });
    // folders on disk vs shares in the database (nothing is deleted here - only reported)
    let dirs: string[] = [];
    try { dirs = fs.readdirSync(SHARE_DIRECTORY, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { /* no uploads yet */ }
    const shares = await this.prisma.share.findMany({ select: { id: true, uploadLocked: true, storageProvider: true, _count: { select: { files: true } } } });
    const ids = new Set(shares.map((s) => s.id));
    const orphanDirs = dirs.filter((d) => !ids.has(d)).length;
    const dirSet = new Set(dirs);
    const missingDirs = shares.filter((s) => s.uploadLocked && s.storageProvider === "LOCAL" && s._count.files > 0 && !dirSet.has(s.id)).length;
    checks.push({ name: "files on disk match the database", ok: orphanDirs === 0 && missingDirs === 0,
      detail: `${orphanDirs} folders without a share · ${missingDirs} shares without their folder` });
    let imgOk = false;
    try { imgOk = fs.existsSync(path.join(IMG_DIR, "logo.svg")) || fs.existsSync(path.join(IMG_DIR, "logo.png")); } catch { /* not mounted */ }
    checks.push({ name: "logo and icons volume", ok: imgOk, detail: imgOk ? "present" : "logo missing in the images volume" });
    const h = await this.uca.hubStats();
    checks.push({ name: "UCA ID hub", ok: h.enabled && h.givenUp === 0, detail: h.enabled ? `${h.pending} pending, ${h.givenUp} given up` : "not connected" });
    const now = Date.now();
    const people = await this.prisma.user.count();
    const new24h = await this.prisma.user.count({ where: { createdAt: { gt: new Date(now - DAY) } } });
    const active24h = await this.prisma.user.count({ where: { lastSeenAt: { gt: new Date(now - DAY) } } });
    const active = await this.prisma.share.count({ where: this.activeShareWhere() });
    const uploadsMB = mb(this.uploadsBytes(true));
    const problems = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail || "failed"}`);
    const report: Report = {
      at: new Date().toISOString(), ok: !problems.length, seconds: Math.round((Date.now() - t0) / 100) / 10, by, problems, checks,
      people, new24h, active24h, disk, shares: { active, expiredLeft, orphanDirs, missingDirs, uploadsMB },
      summary: `${active} active shares · ${uploadsMB} MB uploaded · ${people} accounts (+${new24h} in 24 h)`,
    };
    return report;
  }
  async runDaily(by: string) {
    const report = await this.runChecks(by);
    await this.uca.setState("daily.report", report);
    await this.uca.audit("daily", by, report.ok ? "ok · " + report.summary : "problems: " + report.problems.join(" | "), report.ok ? "info" : "warn");
    return report;
  }
  lastReport() { return this.uca.getState<Report | null>("daily.report", null); }

  @Cron("17 4 * * *")
  async dailyJob() {
    try { await this.runDaily("schedule"); } catch (e) { this.logger.error("daily job: " + (e as Error).message); }
  }
}

function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 90 ? `${s} s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} days ago`;
}
const mb = (b: number) => Math.round((b / 1e6) * 10) / 10;
