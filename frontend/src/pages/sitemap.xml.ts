import { GetServerSidePropsContext } from "next";
import configService from "../services/config.service";
import { CONTENT_UPDATED, siteUrl } from "../utils/seo.util";

// /sitemap.xml: only the public, indexable pages. Imprint and privacy are
// listed only when the admin has filled them in (otherwise they redirect).
export async function getServerSideProps({ res }: GetServerSidePropsContext) {
  const apiUrl = process.env.API_URL || "http://localhost:8080";
  let configs: any[] = [];
  try {
    configs = await (await fetch(`${apiUrl}/api/configs`)).json();
  } catch {
    /* fall back to the homepage only */
  }
  const get = (key: string) => {
    try {
      return configService.get(key, configs);
    } catch {
      return null;
    }
  };

  const base = siteUrl(get("general.appUrl"));
  const pages: [string, string][] = [];
  if (get("general.showHomePage") !== false) pages.push(["/", "1.0"]);
  if (get("legal.enabled")) {
    if (get("legal.imprintText")) pages.push(["/imprint", "0.3"]);
    if (get("legal.privacyPolicyText")) pages.push(["/privacy", "0.3"]);
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages
      .map(
        ([path, priority]) =>
          `<url><loc>${base}${path}</loc><lastmod>${CONTENT_UPDATED}</lastmod><priority>${priority}</priority></url>`,
      )
      .join("\n") +
    "\n</urlset>\n";

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.write(body);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
