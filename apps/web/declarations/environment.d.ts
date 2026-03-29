declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: string;
    readonly CI: string;

    readonly BETTER_AUTH_BASE_URL: string;

    readonly NEXT_PUBLIC_SENTRY_DSN: string;
    readonly SENTRY_AUTH_TOKEN: string;

    readonly DATABASE_URL: string;
    readonly APP_HOST: string;

    readonly RESEND_API_KEY: string;
    readonly FROM_EMAIL?: string;

    readonly SHOPIFY_API_KEY: string;
    readonly SHOPIFY_API_SECRET: string;

    readonly NEXT_PUBLIC_POSTHOG_KEY: string;
    readonly NEXT_PUBLIC_POSTHOG_HOST: string;

    readonly ECENTIC_TRACKER_PROBE: string;
    readonly ECENTIC_TRACKER_PUBLIC_ORIGIN: string;

    readonly UPSTASH_REDIS_REST_URL: string;
    readonly UPSTASH_REDIS_REST_TOKEN: string;

    readonly CRON_SECRET: string;

    readonly AI_GATEWAY_API_KEY: string;
    readonly AZURE_RESOURCE_NAME: string;
    readonly AZURE_API_KEY: string;

    readonly npm_package_name: string;
    readonly npm_package_version: string;
  }
}
