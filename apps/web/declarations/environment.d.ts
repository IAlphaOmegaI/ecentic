declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: string;
    readonly CI: string;

    readonly BETTER_AUTH_BASE_URL: string;
    readonly BETTER_AUTH_SECRET: string;

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
    readonly NEXT_PUBLIC_CHATWOOT_BASE_URL: string;
    readonly NEXT_PUBLIC_CHATWOOT_WEBSITE_TOKEN: string;

    readonly ECENTIC_TRACKER_PROBE: string;
    readonly ECENTIC_TRACKER_PUBLIC_ORIGIN: string;

    readonly UPSTASH_REDIS_REST_URL: string;
    readonly UPSTASH_REDIS_REST_TOKEN: string;

    readonly CRON_SECRET: string;

    readonly AI_GATEWAY_API_KEY: string;
    readonly AZURE_RESOURCE_NAME: string;
    readonly AZURE_API_KEY: string;

    readonly GOOGLE_CLIENT_ID: string;
    readonly GOOGLE_CLIENT_SECRET: string;

    /** EC P-256 private key (PEM) signing hosted UCP responses/webhooks (RFC 9421). */
    readonly UCP_SIGNING_PRIVATE_KEY?: string;

    readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly STRIPE_SUB_COMPETE: string;
    readonly STRIPE_SUB_DOMINATE: string;
    /** Stripe coupon ids for partner deals; unset disables the deal. */
    readonly STRIPE_DEAL_COUPON_YC?: string;
    readonly STRIPE_DEAL_COUPON_TECHSTARS?: string;

    /** Pay-as-you-go performance fee overrides; code falls back to built-in defaults. */
    readonly PERFORMANCE_FEE_RATE_BPS_DEFAULT?: string;
    readonly PERFORMANCE_FEE_CAP_CENTS_DEFAULT?: string;
    readonly PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS?: string;

    readonly npm_package_name: string;
    readonly npm_package_version: string;
  }
}
