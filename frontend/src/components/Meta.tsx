import Head from "next/head";
import useConfig from "../hooks/config.hook";

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

  const metaTitle = fullTitle
    ? title
    : `${title} - ${config.get("general.appName")}`;
  const metaDescription = description ?? DEFAULT_DESCRIPTION;

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
    </Head>
  );
};

export default Meta;
