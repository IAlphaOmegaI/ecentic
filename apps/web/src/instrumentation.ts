import * as Sentry from "@sentry/nextjs";

export const register = async () => {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Enable logs to be sent to Sentry
    enableLogs: true,
    environment: process.env.NODE_ENV,

    // Do not collect default personal data such as IP addresses and request headers
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: false,
  });
};

export const onRequestError = Sentry.captureRequestError;
