import * as Sentry from "@sentry/nextjs";

export const register = async () => {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Enable logs to be sent to Sentry
    enableLogs: true,
    environment: process.env.NODE_ENV,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  });

  // Configure OpenTelemetry
  // For self-hosted OTel, set these environment variables:
  // - OTEL_EXPORTER_OTLP_ENDPOINT: The URL of your OTel Collector (e.g., "http://localhost:4318")
  // - OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf" or "http/json" (default: "http/protobuf")
  // - OTEL_EXPORTER_OTLP_HEADERS: Optional headers (e.g., "Authorization=Bearer token")
  //
  // If OTEL_EXPORTER_OTLP_ENDPOINT is not set, it will use Vercel's managed OTel service
  //   registerOTel({
  //     serviceName: "metaprof/web",
  //     traceExporter: "auto", // Uses OTEL_EXPORTER_OTLP_ENDPOINT if set, otherwise Vercel's service
  //   });
};

export const onRequestError = Sentry.captureRequestError;
