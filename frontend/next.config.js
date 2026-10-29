/** @type {import('next').NextConfig} */
const { version } = require('./package.json');

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkOnly',
    },
  ],
  reloadOnOnline: false,
});

// Shared files, uploads, accounts and admin must never end up in a search
// index: send X-Robots-Tag on top of the <meta name="robots"> in _app.tsx.
const NOINDEX = [
  "/share/:path*",
  "/s/:path*",
  "/upload",
  "/upload/:path*",
  "/account",
  "/account/:path*",
  "/admin",
  "/admin/:path*",
  "/auth/:path*",
  "/error",
];

module.exports = withPWA({
  output: "standalone", env: {
    VERSION: version,
  },
  async headers() {
    return NOINDEX.map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }));
  },
});
