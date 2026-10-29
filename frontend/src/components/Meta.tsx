import Head from "next/head";
import { useRouter } from "next/router";
import useConfig from "../hooks/config.hook";
import { isIndexable, siteUrl } from "../utils/seo.util";

const DEFAULT_DESCRIPTION =
  "Private file sharing by UCA: send files with a link, set an expiry and an optional password. No paywall.";

const Meta = ({
  title,
  description,
  fullTitle = false,
}: {
  title: string;
  description?: string;
  // true: use `title` as the whole <title> (e.g. on the homepage)
  fullTitle?: boolean;
}) => {
  const config = useConfig();
  const router = useRouter();

  const appName = config.get("general.appName") || "UCA Share";
  const metaTitle = fullTitle ? title : `${title} | ${appName}`;
  const metaDescription = description ?? DEFAULT_DESCRIPTION;

  // Only the public marketing / legal pages are indexable. Shares, uploads,
  // accounts and admin pages are noindex (see _app.tsx) and get no canonical.
  const base = siteUrl(config.get("general.appUrl"));
  const indexable = isIndexable(router.pathname);
  const url = base + (router.pathname === "/" ? "/" : router.pathname);
  const image = `${base}/og.png`;
  const imageAlt = "UCA Share - secure file sharing with a link";

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} key="description" />
      {indexable && <link rel="canonical" href={url} key="canonical" />}
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:site_name" content="UCA Share" key="og:site_name" />
      <meta property="og:title" content={metaTitle} key="og:title" />
      <meta
        property="og:description"
        content={metaDescription}
        key="og:description"
      />
      {indexable && <meta property="og:url" content={url} key="og:url" />}
      <meta property="og:image" content={image} key="og:image" />
      <meta property="og:image:width" content="1200" key="og:image:width" />
      <meta property="og:image:height" content="630" key="og:image:height" />
      <meta property="og:image:alt" content={imageAlt} key="og:image:alt" />
      <meta
        name="twitter:card"
        content="summary_large_image"
        key="twitter:card"
      />
      <meta name="twitter:title" content={metaTitle} key="twitter:title" />
      <meta
        name="twitter:description"
        content={metaDescription}
        key="twitter:description"
      />
      <meta name="twitter:image" content={image} key="twitter:image" />
      <meta
        name="twitter:image:alt"
        content={imageAlt}
        key="twitter:image:alt"
      />
    </Head>
  );
};

export default Meta;
