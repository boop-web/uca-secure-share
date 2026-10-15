import { createGetInitialProps } from "@mantine/next";
import Document, { Head, Html, Main, NextScript } from "next/document";

const getInitialProps = createGetInitialProps();

export default class _Document extends Document {
  static getInitialProps = getInitialProps;

  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/img/favicon-32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/img/favicon-16.png"
          />
          <link rel="alternate icon" href="/img/favicon.ico" sizes="any" />
          <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />

          <meta name="robots" content="noindex" />
          <meta name="theme-color" content="#0d0907" />
          <meta name="color-scheme" content="dark" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
