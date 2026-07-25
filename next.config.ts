import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zzrubdbngjfwurdwxtwf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const configWithIntl = withNextIntl(nextConfig);

// 🔒 FIX: build-ul local ramanea "agatat" fara eroare clara, pentru ca
// plugin-ul Sentry incerca activ sa comunice cu serverul lor (creare
// release, upload source maps) la FIECARE "npm run build", nu doar in
// productie — deoarece "silent: !process.env.CI" il face activ local,
// unde "CI" nu e setat. Local nu exista SENTRY_AUTH_TOKEN, deci plugin-ul
// nu se putea autentifica si ramanea blocat/lent pe apeluri de retea.
//
// Acum activam withSentryConfig DOAR daca exista SENTRY_AUTH_TOKEN (adica
// doar in productie/CI, unde ar trebui setat ca variabila de mediu pe
// Vercel). Local, build-ul sare complet peste Sentry — mai rapid, fara
// blocaje, fara sa afecteze functionarea reala a Sentry in productie.
export default (process.env.VERCEL && process.env.SENTRY_AUTH_TOKEN)
  ? withSentryConfig(configWithIntl, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options
      org: "sc-explore-world-srl",
      project: "chronos",
      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,
      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,
      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match withyour Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: "/monitoring",
      webpack: {
        // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
        // See the following for more information:
        // https://docs.sentry.io/product/crons/
        // https://vercel.com/docs/cron-jobs
        automaticVercelMonitors: true,
        // Tree-shaking options for reducing bundle size
        treeshake: {
          // Automatically tree-shake Sentry logger statements to reduce bundle size
          removeDebugLogging: true,
        },
      }
    })
  : configWithIntl;
