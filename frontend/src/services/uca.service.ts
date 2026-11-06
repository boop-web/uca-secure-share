import api from "./api.service";

// UCA Share v2: the plans (UCA Pro / UCA Max), the signed-in person's plan and space, the server's disk state
export type DiskLevel = "ok" | "low" | "full";
export type UcaStatus = {
  disk: DiskLevel;
  message?: string;
  plans: { pro: { perLinkBytes: number; storageBytes: number }; max: { perLinkBytes: number; storageBytes: number } };
  maxDays: number;
  maxDownloads: number;
  upgrade: { text: string; url: string };
};
export type UcaMe = {
  email: string;
  plan: "admin" | "max" | "pro" | "none";
  planLabel: string;
  until: string | null;
  canSend: boolean;
  disk: DiskLevel;
  message?: string;
  limits: { perLinkBytes: number | null; storageBytes: number | null; maxDays: number; maxDownloads: number; chunkBytes: number };
  usedBytes: number;
  liveShares: number;
  upgrade?: { text: string; url: string };
  planUnavailable?: boolean;
};
export type UcaDisk = { level: DiskLevel; freeGB: number | null; lowGB: number; fullGB: number; lowPercent: number };

export const UPGRADE_URL = "https://ucagg.de/account#bundles";
export const FULL_TEXT = "Uploads are paused for a moment. We'll be back online very soon - support is already on it. Sorry for the trouble.";

const status = async (): Promise<UcaStatus> => (await api.get("uca/status")).data;
const me = async (): Promise<UcaMe> => (await api.get("uca/me")).data;
const disk = async (): Promise<UcaDisk> => (await api.get("uca/admin/disk")).data;

/** sizes the way UCA says them (binary, "250 MB", "2.5 GB") */
export function size(b: number | null | undefined) {
  if (b == null) return "no limit";
  if (b >= 1024 ** 3) return `${Math.round((b / 1024 ** 3) * 10) / 10} GB`;
  if (b >= 1024 ** 2) return `${Math.round(b / 1024 ** 2)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

export default { status, me, disk };
