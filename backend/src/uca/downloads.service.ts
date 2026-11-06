import { HttpException, Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { EventEmitter } from "events";
import { Request } from "express";
import { PrismaService } from "src/prisma/prisma.service";

/**
 * UCA Share v2: the two link modes and the download log.
 *  - "downloads": ends after N real downloads (1-10) or after 3 days, whichever comes first
 *  - "days":      ends after 1, 2 or 3 days (no download limit)
 * A download = a file or the zip fetched by one visit (the visitor's share token); more files of the same share by the
 * same visit within VISIT_MS count once. A page view is not a download. The sender sees: number, time, device label
 * (from the user agent: "Android phone · Chrome"). No IP, no location is stored.
 * When the last allowed download starts the share is "ended": no new visitor gets in, the files go with the cleanup
 * (JobsService, every 5 minutes) once that visit had VISIT_MS to finish.
 */
export const VISIT_MS = 15 * 60_000;
export interface DownloadEvent { id: number; shareId: string; shareName: string | null; n: number; at: string; device: string; left: number | null; ended: boolean }

export function deviceLabel(ua: string | undefined) {
  const s = String(ua || "");
  if (!s) return "Unknown device";
  if (/curl|wget|python|okhttp|go-http|java\//i.test(s)) return "Download tool";
  let dev = "Computer";
  if (/iPad/.test(s) || (/Macintosh/.test(s) && /Mobile/.test(s))) dev = "iPad";
  else if (/iPhone|iPod/.test(s)) dev = "iPhone";
  else if (/Android/.test(s)) dev = /Mobile/.test(s) ? "Android phone" : "Android tablet";
  else if (/CrOS/.test(s)) dev = "Chromebook";
  else if (/Windows/.test(s)) dev = "Windows PC";
  else if (/Macintosh|Mac OS X/.test(s)) dev = "Mac";
  else if (/Linux/.test(s)) dev = "Linux PC";
  let br = "";
  if (/Edg\//.test(s)) br = "Edge";
  else if (/OPR\/|Opera/.test(s)) br = "Opera";
  else if (/SamsungBrowser/.test(s)) br = "Samsung Internet";
  else if (/Firefox\/|FxiOS/.test(s)) br = "Firefox";
  else if (/Chrome\/|CriOS/.test(s)) br = "Chrome";
  else if (/Safari\//.test(s)) br = "Safari";
  return br ? `${dev} · ${br}` : dev;
}

/**
 * an ended share (its last download started) still lets the visit that took it fetch its other files for VISIT_MS;
 * everyone else gets 410. Used by the share / file guards.
 */
export async function assertNotEnded(prisma: PrismaService, share: { id: string; endedAt?: Date | null } | null, req: Request) {
  if (!share?.endedAt) return;
  const t = req.cookies?.[`share_${share.id}_token`];
  if (t) {
    const visit = crypto.createHash("sha256").update("t:" + t).digest("hex").slice(0, 32);
    if (await prisma.shareDownload.findFirst({ where: { shareId: share.id, visit, at: { gt: new Date(Date.now() - VISIT_MS) } } })) return;
  }
  throw gone();
}

@Injectable()
export class DownloadsService {
  readonly events = new EventEmitter();

  constructor(private prisma: PrismaService) {
    this.events.setMaxListeners(500);
  }

  /** the visit: the share token cookie the share page got (one per visit), else this request alone */
  visitOf(req: Request, shareId: string) {
    const t = req.cookies?.[`share_${shareId}_token`];
    return crypto.createHash("sha256").update(t ? "t:" + t : "r:" + crypto.randomUUID()).digest("hex").slice(0, 32);
  }

  /**
   * called before a file / the zip is streamed. Counts the download (once per visit), refuses one over the limit.
   * Throws 410 when the link has no downloads left.
   */
  async record(shareId: string, req: Request) {
    const share = await this.prisma.share.findUnique({ where: { id: shareId }, select: { id: true, name: true, creatorId: true, mode: true, maxDownloads: true, downloads: true, endedAt: true } });
    if (!share) return;
    const visit = this.visitOf(req, shareId);
    const recent = await this.prisma.shareDownload.findFirst({ where: { shareId, visit, at: { gt: new Date(Date.now() - VISIT_MS) } } });
    if (recent) return;   // the same visit, another file: counted already
    const limited = share.mode === "downloads" && share.maxDownloads;
    if (share.endedAt) throw gone();
    // the counter goes up only while there is a download left (atomic: two visitors at once cannot both take the last one)
    const r = await this.prisma.share.updateMany({
      where: { id: shareId, endedAt: null, ...(limited ? { downloads: { lt: share.maxDownloads } } : {}) },
      data: { downloads: { increment: 1 } },
    });
    if (!r.count) throw gone();
    const now = await this.prisma.share.findUnique({ where: { id: shareId }, select: { downloads: true } });
    const n = now?.downloads ?? share.downloads + 1;
    const ended = !!limited && n >= share.maxDownloads;
    if (ended) await this.prisma.share.update({ where: { id: shareId }, data: { endedAt: new Date() } });
    const row = await this.prisma.shareDownload.create({ data: { shareId, ownerId: share.creatorId, n, device: deviceLabel(req.headers["user-agent"]), visit } });
    if (share.creatorId) {
      const ev: DownloadEvent = { id: row.id, shareId, shareName: share.name, n, at: row.at.toISOString(), device: row.device, left: limited ? Math.max(0, share.maxDownloads - n) : null, ended };
      this.events.emit("download:" + share.creatorId, ev);
    }
  }

  /** download events of one person after an event id (for the app's stream / long poll) */
  async eventsAfter(userId: string, afterId: number, take = 100): Promise<DownloadEvent[]> {
    const rows = await this.prisma.shareDownload.findMany({ where: { ownerId: userId, id: { gt: afterId } }, orderBy: { id: "asc" }, take,
      include: { share: { select: { name: true, mode: true, maxDownloads: true, endedAt: true } } } });
    return rows.map((r) => ({ id: r.id, shareId: r.shareId, shareName: r.share?.name ?? null, n: r.n, at: r.at.toISOString(), device: r.device,
      left: r.share?.mode === "downloads" && r.share.maxDownloads ? Math.max(0, r.share.maxDownloads - r.n) : null, ended: !!r.share?.endedAt }));
  }
}

const gone = () => new HttpException({ statusCode: 410, message: "This link has no downloads left.", error: "share_download_limit" }, 410);
