import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN !== "undefined" && !SENTRY_DSN.startsWith("__")) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
