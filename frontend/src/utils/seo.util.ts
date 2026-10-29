// Search-engine helpers: which pages may be indexed, the public base URL,
// and the paths that must never be crawled (shared files, uploads, accounts).

export const DEFAULT_SITE_URL = "https://share.ucagg.de";

// Public, indexable pages (Next.js route patterns). Everything else is noindex.
export const INDEXABLE_PATHS = ["/", "/imprint", "/privacy"];

// Never crawled: shared file / download pages, uploads and reverse shares,
// accounts, admin, sign-in flows and the API (incl. file downloads).
export const PRIVATE_PATHS = [
  "/share/",
  "/s/",
  "/upload",
  "/account",
  "/admin",
  "/auth/",
  "/api/",
  "/error",
];

export const isIndexable = (pathname: string) =>
  INDEXABLE_PATHS.includes(pathname);

// general.appUrl from the config, or the production URL when it is not a
// public https URL (e.g. http://localhost:3000 in development).
export const siteUrl = (appUrl?: string | null) => {
  const url = String(appUrl || "").replace(/\/+$/, "");
  return /^https:\/\//.test(url) ? url : DEFAULT_SITE_URL;
};

// The last time the public pages' content changed (sitemap <lastmod>).
export const CONTENT_UPDATED = "2026-10-30";
