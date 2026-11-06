import { HttpException, Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import { ConfigService } from "src/config/config.service";
import { DATA_DIRECTORY } from "src/constants";
import { PrismaService } from "src/prisma/prisma.service";

/**
 * UCA Share v2 (owner, 6 Nov 2026): Share is a tool of the UCA ecosystem for UCA Pro and UCA Max (the ucagg.de bundles).
 * The plan of an email is asked of ucagg.de over the private network:
 *   GET ${HUB_URL}/api/hub/v1/bundle?email=  (Bearer HUB_TOKEN)  ->  { plan: "pro" | "max" | "none", until, owner }
 * cached 60 s per email (a failure keeps using the last answer for up to a day). Share admins: no limit at all.
 * Space counts only live shares (not expired, not ended); an expired share is deleted with its files.
 */
export type PlanId = "admin" | "max" | "pro" | "none";
export interface Plan {
  plan: PlanId;
  label: string;
  until: string | null;
  perLinkBytes: number | null;   // null = no limit (admins)
  storageBytes: number | null;
  maxDays: number;
  maxDownloads: number;
  unavailable?: boolean;         // ucagg.de could not be asked and nothing was cached
  disk: DiskLevel;               // low = the limits above are already reduced; full = uploads paused
}
export type DiskLevel = "ok" | "low" | "full";
export const FULL_TEXT = "Uploads are paused for a moment. We'll be back online very soon - support is already on it. Sorry for the trouble.";
export const UPGRADE_URL = "https://ucagg.de/account#bundles";
export const UPGRADE_TEXT = "Send files with one link: UCA Pro";
const LABEL: Record<PlanId, string> = { admin: "Admin", max: "UCA Max", pro: "UCA Pro", none: "No plan" };
const FRESH_MS = 60_000, STALE_MS = 24 * 3600_000;

export const planError = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ statusCode: status, message: error, error, ...extra }, status);

@Injectable()
export class PlanService {
  private readonly logger = new Logger("UCA plan");
  private cache = new Map<string, { at: number; plan: "pro" | "max" | "none"; until: number | null }>();

  private diskCache: { at: number; freeBytes: number | null } | null = null;

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  // ---------- the server's free disk ----------
  /**
   * free bytes on the data volume (statfs), measured at most every 2 minutes and again before each upload chunk
   * (fresh = true is still cheap: one syscall). Tests may fake it: UCA_DISK_FAKE_FILE = a file holding free GB.
   */
  freeBytes(fresh = false): number | null {
    const fake = process.env.UCA_DISK_FAKE_FILE;
    if (fake) { try { const gb = Number(fs.readFileSync(fake, "utf8").trim()); if (Number.isFinite(gb)) return gb * 1e9; } catch { /* no fake */ } }
    if (!fresh && this.diskCache && Date.now() - this.diskCache.at < 120_000) return this.diskCache.freeBytes;
    let free: number | null = null;
    try { const st = fs.statfsSync(DATA_DIRECTORY); free = st.bavail * st.bsize; } catch { free = null; }
    this.diskCache = { at: Date.now(), freeBytes: free };
    return free;
  }
  diskThresholds() {
    const n = (k: string, d: number) => { const v = Number(this.config.get(k as `${string}.${string}`)); return Number.isFinite(v) && v >= 0 ? v : d; };
    const full = n("plans.fullDiskGB", 5), low = Math.max(full, n("plans.lowDiskGB", 10));
    return { lowGB: low, fullGB: full, lowPercent: Math.max(1, Math.min(100, n("plans.lowDiskPercent", 50))) };
  }
  disk(fresh = false): { level: DiskLevel; freeGB: number | null; lowGB: number; fullGB: number; lowPercent: number } {
    const t = this.diskThresholds();
    const b = this.freeBytes(fresh);
    const gb = b == null ? null : Math.round((b / 1e9) * 10) / 10;
    const level: DiskLevel = gb == null ? "ok" : gb < t.fullGB ? "full" : gb < t.lowGB ? "low" : "ok";
    return { level, freeGB: gb, ...t };
  }
  /** refuse new uploads while the disk is full (everyone, admins too) */
  assertDiskOpen(fresh = true) {
    if (this.disk(fresh).level === "full") throw planError(503, FULL_TEXT, { code: "uploads_paused" });
  }

  private hubBase() {
    return String(process.env.HUB_URL || "").replace(/\/+$/, "").replace(/\/api\/hub\/v1\/accounts$/, "");
  }
  limits() {
    const n = (k: string, d: number) => { const v = Number(this.config.get(k as `${string}.${string}`)); return Number.isFinite(v) && v > 0 ? v : d; };
    return {
      pro: { perLink: n("plans.proPerLink", 250 * 1024 ** 2), storage: n("plans.proStorage", 1024 ** 3) },
      max: { perLink: n("plans.maxPerLink", 750 * 1024 ** 2), storage: n("plans.maxStorage", 2.5 * 1024 ** 3) },
      maxDays: Math.min(30, n("plans.maxDays", 3)),
      maxDownloads: Math.min(1000, n("plans.maxDownloads", 10)),
    };
  }

  /** the bundle of an email at ucagg.de (cached) */
  async bundleOf(email: string): Promise<{ plan: "pro" | "max" | "none"; until: number | null; unavailable?: boolean }> {
    const e = String(email || "").trim().toLowerCase();
    const hit = this.cache.get(e);
    if (hit && Date.now() - hit.at < FRESH_MS) return hit;
    const base = this.hubBase(), token = String(process.env.HUB_TOKEN || "");
    try {
      if (!base || token.length < 16) throw new Error("HUB_URL / HUB_TOKEN not set");
      const r = await fetch(`${base}/api/hub/v1/bundle?email=${encodeURIComponent(e)}`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "share.ucagg.de" }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as { plan?: string; until?: number | null; owner?: boolean };
      const plan = j.owner ? "max" : j.plan === "max" ? "max" : j.plan === "pro" ? "pro" : "none";
      const v = { at: Date.now(), plan: plan as "pro" | "max" | "none", until: typeof j.until === "number" ? j.until : null };
      this.cache.set(e, v);
      if (this.cache.size > 5000) for (const [k, x] of this.cache) if (Date.now() - x.at > STALE_MS) this.cache.delete(k);
      return v;
    } catch (err) {
      this.logger.warn(`bundle check failed: ${(err as Error).message}`);
      if (hit && Date.now() - hit.at < STALE_MS) return hit;
      return { plan: "none", until: null, unavailable: true };
    }
  }
  forget(email: string) { this.cache.delete(String(email || "").trim().toLowerCase()); }

  async planOf(user: { email: string; isAdmin: boolean } | null | undefined): Promise<Plan> {
    const l = this.limits();
    const d = this.disk();
    const base = { maxDays: l.maxDays, maxDownloads: l.maxDownloads, disk: d.level };
    if (!user) return { plan: "none", label: LABEL.none, until: null, perLinkBytes: 0, storageBytes: 0, ...base };
    if (user.isAdmin) return { plan: "admin", label: LABEL.admin, until: null, perLinkBytes: null, storageBytes: null, ...base };
    const b = await this.bundleOf(user.email);
    const lim = b.plan === "none" ? { perLink: 0, storage: 0 } : l[b.plan];
    // little room on the server: new links get a part of the plan's limits (default half)
    const f = d.level === "ok" ? 1 : d.lowPercent / 100;
    return { plan: b.plan, label: LABEL[b.plan], until: b.until ? new Date(b.until).toISOString() : null, perLinkBytes: Math.floor(lim.perLink * f), storageBytes: Math.floor(lim.storage * f), ...base, ...(b.unavailable ? { unavailable: true } : {}) };
  }

  /** refuse when the person has no plan (402 with the hint) or ucagg.de could not be asked (503) */
  assertCanSend(p: Plan) {
    if (p.plan !== "none") return;
    if (p.unavailable) throw planError(503, "Your plan could not be checked right now. Please try again in a minute.", { code: "plan_unavailable" });
    throw planError(402, `${UPGRADE_TEXT} (or UCA Max). Get it at ${UPGRADE_URL}`, { code: "plan_required", upgradeUrl: UPGRADE_URL });
  }

  /** what the sender sees: not expired (an ended link stays listed as "ended" until the cleanup takes it) */
  listWhere(userId: string) {
    return { creatorId: userId, OR: [{ expiration: { gt: new Date() } }, { expiration: new Date(0) }] };
  }
  /** live = finished or still uploading, not expired, not ended */
  liveWhere(userId: string) {
    return { creatorId: userId, endedAt: null, OR: [{ expiration: { gt: new Date() } }, { expiration: new Date(0) }] };
  }
  /** bytes the person stores right now (live shares only) */
  async usedBytes(userId: string, exceptShareId?: string) {
    const files = await this.prisma.file.findMany({ where: { share: { ...this.liveWhere(userId), ...(exceptShareId ? { NOT: { id: exceptShareId } } : {}) } }, select: { size: true } });
    return files.reduce((t, f) => t + (Number(f.size) || 0), 0);
  }

  /**
   * one more chunk: the link stays within its plan's size and the person's space. shareBytes = what the share will hold
   * after this chunk (files done + the file being uploaded so far + the chunk)
   */
  async assertRoom(user: { id: string; email: string; isAdmin: boolean }, shareId: string, shareBytes: number) {
    this.assertDiskOpen();
    const p = await this.planOf(user);
    if (p.plan === "admin") return;
    this.assertCanSend(p);
    if (shareBytes > (p.perLinkBytes as number))
      throw planError(413, `${p.label} sends up to ${fmt(p.perLinkBytes as number)} per link${p.disk === "low" ? " right now (the server is short of space for a while)" : ""}.`, { code: "link_too_large", limitBytes: p.perLinkBytes });
    const used = await this.usedBytes(user.id, shareId);
    if (used + shareBytes > (p.storageBytes as number))
      throw planError(413, `Your UCA Share space is full: ${fmt(used)} of ${fmt(p.storageBytes as number)} in live links. Delete a link or wait until one ends.`, { code: "storage_full", usedBytes: used, limitBytes: p.storageBytes });
  }
}

export function fmt(b: number) {
  if (b >= 1024 ** 3) return `${Math.round((b / 1024 ** 3) * 10) / 10} GB`;
  if (b >= 1024 ** 2) return `${Math.round(b / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}
