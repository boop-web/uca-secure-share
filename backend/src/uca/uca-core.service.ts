import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

/**
 * The UCA ecosystem bits every part of Share may call (no other Share service is needed here, so there is no cycle):
 *  - audit(): the control audit log (table UcaAudit) - every write from ucagg.de, the SSO doors, sign-ups
 *  - state(): small key/value facts (table UcaState)
 *  - hub: report accounts to the UCA ID hub, POST ${HUB_URL}/api/hub/v1/accounts (Bearer HUB_TOKEN), product "share".
 *    Fire and forget: failures stay in UcaHubQueue and are retried (1 min, 5 min, 30 min, then hourly for 7 days).
 *    Nothing here can ever break a sign-up.
 */
const DELAYS = [60_000, 5 * 60_000, 30 * 60_000];
const HOUR = 3_600_000;
const GIVE_UP_MS = 7 * 24 * HOUR;
export const MANAGE_URL = "https://share.ucagg.de/account";

@Injectable()
export class UcaCoreService implements OnModuleInit {
  private readonly logger = new Logger("UCA");
  private sending = new Set<number>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // the hub queue: anything due is retried every 10 minutes (cheap: one indexed query)
    this.timer = setInterval(() => this.retryDue().catch(() => {}), 10 * 60_000);
    this.timer.unref();
    setTimeout(() => this.backfillOnce().catch((e) => this.logger.warn("hub backfill: " + e.message)), 20_000).unref();
  }

  // ---------- audit ----------
  async audit(kind: string, actor: string | null, detail?: string | null, level: "info" | "warn" | "error" = "info") {
    try {
      await this.prisma.ucaAudit.create({ data: { kind: kind.slice(0, 80), actor: actor ? actor.slice(0, 254) : null, detail: detail ? String(detail).slice(0, 2000) : null, level } });
    } catch (e) {
      this.logger.error("audit failed: " + (e as Error).message);
    }
  }

  // ---------- state ----------
  async getState<T>(key: string, fallback: T): Promise<T> {
    const r = await this.prisma.ucaState.findUnique({ where: { key } });
    if (!r) return fallback;
    try { return JSON.parse(r.value) as T; } catch { return fallback; }
  }
  async setState(key: string, value: unknown) {
    const v = JSON.stringify(value);
    await this.prisma.ucaState.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
  }

  // ---------- last seen ----------
  /** sign-in / refresh: remember when the person was last here (at most one write per 10 minutes) */
  async seen(userId: string, force = false) {
    try {
      const cutoff = new Date(Date.now() - 10 * 60_000);
      await this.prisma.user.updateMany({ where: force ? { id: userId } : { id: userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }] }, data: { lastSeenAt: new Date() } });
    } catch { /* never block a sign-in */ }
  }

  // ---------- UCA ID hub ----------
  private hubUrl() {
    const u = String(process.env.HUB_URL || "").replace(/\/+$/, "");
    return !u ? "" : /\/accounts$/.test(u) ? u : `${u}/api/hub/v1/accounts`;
  }
  hubEnabled() {
    return !!(this.hubUrl() && String(process.env.HUB_TOKEN || "").length >= 16);
  }
  payloadFor(u: Pick<User, "email" | "username">, status: "active" | "deleted" = "active", backfill = false) {
    return {
      product: "share",
      email: String(u.email).toLowerCase(),
      name: u.username || null,
      plan: "free",
      planLabel: "Free",
      status,
      renewsAt: null,
      manageUrl: MANAGE_URL,
      features: ["Big files with a private link", "Expiry, password and download limit", "Upload links for others"],
      ...(backfill ? { backfill: true } : {}),
    };
  }
  /** queue the current state of one account and try to send it now (in the background) */
  syncUser(u: Pick<User, "email" | "username"> | null, deleted = false) {
    if (!u || !u.email) return;
    const payload = this.payloadFor(u, deleted ? "deleted" : "active");
    (async () => {
      await this.prisma.ucaHubQueue.deleteMany({ where: { email: payload.email, doneAt: null } });
      const row = await this.prisma.ucaHubQueue.create({ data: { email: payload.email, payload: JSON.stringify(payload), nextTryAt: new Date() } });
      await this.attempt(row.id);
    })().catch((e) => this.logger.warn("hub sync: " + e.message));
  }
  async attempt(id: number) {
    if (this.sending.has(id)) return;
    const row = await this.prisma.ucaHubQueue.findUnique({ where: { id } });
    if (!row || row.doneAt) return;
    if (!this.hubEnabled()) {
      await this.prisma.ucaHubQueue.update({ where: { id }, data: { lastError: "HUB_URL / HUB_TOKEN not set", nextTryAt: new Date(Date.now() + HOUR) } });
      return;
    }
    this.sending.add(id);
    const attempts = row.attempts + 1;
    try {
      const res = await fetch(this.hubUrl(), {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.HUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "share.ucagg.de" },
        body: row.payload,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const text = (await res.text().catch(() => "")).slice(0, 150);
        const e: Error & { final?: boolean } = new Error("HTTP " + res.status + (text ? " " + text : ""));
        e.final = res.status >= 400 && res.status < 500 && ![401, 403, 408, 429].includes(res.status);
        throw e;
      }
      await this.prisma.ucaHubQueue.update({ where: { id }, data: { attempts, doneAt: new Date(), lastError: null, nextTryAt: null } });
    } catch (e) {
      const err = e as Error & { final?: boolean };
      const old = err.final || Date.now() - row.createdAt.getTime() > GIVE_UP_MS;
      const delay = DELAYS[attempts - 1] || HOUR;
      await this.prisma.ucaHubQueue.update({ where: { id }, data: { attempts, lastError: String(err.message).slice(0, 200), nextTryAt: old ? null : new Date(Date.now() + delay) } });
      if (!old && delay < HOUR) setTimeout(() => this.attempt(id).catch(() => {}), delay).unref();
    } finally {
      this.sending.delete(id);
    }
  }
  async retryDue() {
    const due = await this.prisma.ucaHubQueue.findMany({ where: { doneAt: null, nextTryAt: { lte: new Date() } }, select: { id: true }, take: 200, orderBy: { id: "asc" } });
    for (const r of due) await this.attempt(r.id).catch(() => {});
  }
  async hubStats() {
    const [pending, givenUp, done] = await Promise.all([
      this.prisma.ucaHubQueue.count({ where: { doneAt: null, NOT: { nextTryAt: null } } }),
      this.prisma.ucaHubQueue.count({ where: { doneAt: null, nextTryAt: null } }),
      this.prisma.ucaHubQueue.count({ where: { NOT: { doneAt: null } } }),
    ]);
    return { enabled: this.hubEnabled(), pending, givenUp, done };
  }
  /** once per install: every existing account, silently (backfill: true = no welcome emails from the hub) */
  async backfillOnce() {
    if (!this.hubEnabled()) return;
    if (await this.getState("hub.backfillDone", false)) return;
    const users = await this.prisma.user.findMany({ select: { email: true, username: true } });
    let ok = 0, failed = 0;
    for (const u of users) {
      try {
        const res = await fetch(this.hubUrl(), {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.HUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "share.ucagg.de" },
          body: JSON.stringify(this.payloadFor(u, "active", true)),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    if (!failed) await this.setState("hub.backfillDone", { at: new Date().toISOString(), accounts: ok });
    await this.audit("hub.backfill", "system", `${ok} accounts reported${failed ? `, ${failed} failed (tried again at the next start)` : ""}`, failed ? "warn" : "info");
    this.logger.log(`UCA ID hub backfill: ${ok} ok, ${failed} failed`);
  }
}
