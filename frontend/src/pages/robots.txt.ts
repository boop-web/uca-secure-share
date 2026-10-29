import { GetServerSidePropsContext } from "next";
import configService from "../services/config.service";
import { PRIVATE_PATHS, siteUrl } from "../utils/seo.util";

// /robots.txt: the homepage and legal pages may be crawled; shared files,
// uploads, accounts, admin and the API never.
export async function getServerSideProps({ res }: GetServerSidePropsContext) {
  const apiUrl = process.env.API_URL || "http://localhost:8080";
  let appUrl = "";
  try {
    const configs = await (await fetch(`${apiUrl}/api/configs`)).json();
    appUrl = configService.get("general.appUrl", configs);
  } catch {
    /* fall back to the production URL */
  }

  const body = [
    "User-agent: *",
    "Allow: /",
    ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${siteUrl(appUrl)}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.write(body);
  res.end();
  return { props: {} };
}

export default function Robots() {
  return null;
}
