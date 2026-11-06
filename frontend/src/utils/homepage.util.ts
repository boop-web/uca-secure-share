import { HomepageDto } from "../types/homepage.type";

// Built-in homepage copy. The admin editor (/admin/homepage) can override
// every field; until an admin has saved once, these are shown.
export const HOMEPAGE_DEFAULTS: Required<HomepageDto> = {
  title: "Send a file to someone.\nOne link, then it ends.",
  description:
    "UCA Share is the sending tool of the UCA ecosystem: drop a file or a photo, get one link, send it to anyone. The link ends after the downloads you chose or after 1 to 3 days - and you see every download. Part of UCA Pro and UCA Max.",
  bullet1Name: "Ends when you say",
  bullet1Desc:
    "After 1 to 10 downloads or after 1, 2 or 3 days. Then the files are deleted - nothing stays behind.",
  bullet2Name: "See every download",
  bullet2Desc:
    "Download 2, today 14:32, Android phone - number, time and device type. No IP address, no location.",
  bullet3Name: "In UCA Pro and UCA Max",
  bullet3Desc:
    "Share comes with the UCA bundles on ucagg.de, and works from UCA AI on your PC too.",
  buttonText: "Send a file",
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
