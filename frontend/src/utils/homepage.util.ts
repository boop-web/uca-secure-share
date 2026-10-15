import { HomepageDto } from "../types/homepage.type";

// Built-in homepage copy. The admin editor (/admin/homepage) can override
// every field; until an admin has saved once, these are shown.
export const HOMEPAGE_DEFAULTS: Required<HomepageDto> = {
  title: "Send files with a link.\nPrivate and free.",
  description:
    "Upload a file, get a link, send it to anyone. Set an expiry, a password or a download limit. No account needed, no paywall.",
  bullet1Name: "Encrypted transfer",
  bullet1Desc:
    "Files travel over TLS to our own server and can only be opened with the share link.",
  bullet2Name: "No paywall",
  bullet2Desc:
    "Free to use: no subscription, no ads, no tracking. Built for personal use as part of UCA.",
  bullet3Name: "You stay in control",
  bullet3Desc:
    "Choose how long a share lives and who can open it. Expired shares are removed automatically.",
  buttonText: "Upload",
};

export type HomepageRecord = HomepageDto & { updatedBy?: string | null };

// Use the stored text only once an admin has edited it (the database row is
// created with the old placeholder defaults on first read).
export const resolveHomepage = (
  data?: HomepageRecord | null,
): Required<HomepageDto> => {
  if (!data || !data.updatedBy) return HOMEPAGE_DEFAULTS;
  const out = { ...HOMEPAGE_DEFAULTS };
  (Object.keys(HOMEPAGE_DEFAULTS) as (keyof HomepageDto)[]).forEach((k) => {
    const v = data[k];
    if (typeof v === "string" && v.trim() !== "") out[k] = v;
  });
  return out;
};

export const pickHomepageFields = (
  data: Required<HomepageDto>,
): HomepageDto => {
  const out: HomepageDto = {};
  (Object.keys(HOMEPAGE_DEFAULTS) as (keyof HomepageDto)[]).forEach((k) => {
    out[k] = data[k];
  });
  return out;
};
