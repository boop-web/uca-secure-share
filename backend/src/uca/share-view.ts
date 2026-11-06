import { File, Share, ShareDownload } from "@prisma/client";

/** one share as the app API, the control API (ucagg.de/account) and the web show it (uca-share-v1 "Share") */
export type ShareRow = Share & { files: File[]; downloadLog?: Pick<ShareDownload, "n" | "at" | "device">[] };

export function shareView(s: ShareRow, appUrl: string, withDownloads = false) {
  const sizeBytes = s.files.reduce((t, f) => t + (Number(f.size) || 0), 0);
  let pending: { id: string; name: string; size: number }[] = [];
  try { pending = s.pending ? JSON.parse(s.pending) : []; } catch { pending = []; }
  const done = new Set(s.files.map((f) => f.id));
  const left = s.mode === "downloads" && s.maxDownloads ? Math.max(0, s.maxDownloads - s.downloads) : null;
  return {
    id: s.id,
    name: s.name || null,
    url: `${appUrl.replace(/\/+$/, "")}/s/${s.id}`,
    status: s.endedAt ? "ended" : s.uploadLocked ? "live" : "uploading",
    mode: s.mode || null,
    maxDownloads: s.maxDownloads ?? null,
    downloads: s.downloads,
    downloadsLeft: left,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiration.getTime() === 0 ? null : s.expiration.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    sizeBytes,
    files: [
      ...s.files.map((f) => ({ id: f.id, name: f.name, size: Number(f.size) || 0, done: true })),
      ...pending.filter((p) => !done.has(p.id)).map((p) => ({ id: p.id, name: p.name, size: p.size, done: false })),
    ],
    ...(withDownloads ? { downloadList: (s.downloadLog || []).map((d) => ({ n: d.n, at: new Date(d.at).toISOString(), device: d.device })) } : {}),
  };
}
