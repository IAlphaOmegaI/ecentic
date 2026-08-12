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

    /**
     * GA4 measurement ID (G-XXXXXXXXXX), running alongside PostHog. Optional on
     * purpose: unset omits the gtag script entirely, which is how local and
     * preview traffic is kept out of the property.
     */
    readonly NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;

    /**
     * BabyLoveGrowth blog integration key (Settings → Integrations → Next.js Blog).
     * Server-only. Unset skips CMS articles and keeps the DB-backed editorial posts.
     */
    readonly BABYLOVEGROWTH_BLOG_API_KEY?: string;
    /** Optional BabyLoveGrowth API base override (staging/local). */
    readonly BABYLOVEGROWTH_BLOG_API_URL?: string;
    /**
     * Bearer secret for `POST /api/webhooks/babylovegrowth` (Settings →
     * Publishing → Webhook). Used to auto-translate new EN articles to ES.
     */
    readonly BABYLOVEGROWTH_WEBHOOK_SECRET?: string;

    readonly ECENTIC_TRACKER_PROBE: string;
    readonly ECENTIC_TRACKER_PUBLIC_ORIGIN: string;

    readonly UPSTASH_REDIS_REST_URL: string;
    readonly UPSTASH_REDIS_REST_TOKEN: string;

    readonly CRON_SECRET: string;

    /** Azure OpenAI (ChatGPT) — every GPT call, billed direct to the subscription. */
    readonly AZURE_RESOURCE_NAME: string; // subdomain only, e.g. "my-resource"
    readonly AZURE_API_KEY: string;
    readonly AZURE_API_VERSION?: string; // defaults to "preview" (Azure v1 API surface)
    /**
     * Deployment serving the `gpt` seat on this resource, e.g. "gpt-5.4".
     * The name is the DEPLOYMENT's, not the model's. Unset means "no ChatGPT
     * deployment here" and the seat resolves through the gateway instead, since
     * a guessed deployment name only earns a 404 from Azure.
     */
    readonly AZURE_DEPLOYMENT_GPT?: string;

    /**
     * Vercel AI Gateway — every model Azure cannot serve (Claude, Gemini,
     * Perplexity) resolves through it, so no per-vendor key is required.
     */
    readonly AI_GATEWAY_API_KEY: string;

    readonly GOOGLE_CLIENT_ID: string;
    readonly GOOGLE_CLIENT_SECRET: string;

    /**
     * Google Merchant Center hybrid integration
     * (docs/integrations/google-merchant-center.md). Unset disables the
     * Google Shopping channel entirely.
     */
    readonly GOOGLE_MERCHANT_CLIENT_ID?: string;
    readonly GOOGLE_MERCHANT_CLIENT_SECRET?: string;
    readonly ECENTIC_MCA_ID?: string;
    /**
     * Refresh token for an admin of ecentic's OWN advanced account (MCA) —
     * the provider side of link handshakes. Obtained once by running the
     * merchant OAuth flow with that admin's Google login and copying the
     * stored refresh token. Unset means link proposals from real merchants
     * wait for manual approval in the MCA's Merchant Center UI.
     */
    readonly GOOGLE_MERCHANT_MCA_REFRESH_TOKEN?: string;

    /** EC P-256 private key (PEM) signing hosted UCP responses/webhooks (RFC 9421). */
    readonly UCP_SIGNING_PRIVATE_KEY?: string;

    readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly STRIPE_SUB_COMPETE: string;
    readonly STRIPE_SUB_SCALE: string;
    readonly STRIPE_SUB_DOMINATE: string;
    /** Stripe coupon ids for partner deals; unset disables the deal. */
    readonly STRIPE_DEAL_COUPON_YC?: string;
    readonly STRIPE_DEAL_COUPON_TECHSTARS?: string;

    /** Pay-as-you-go performance fee overrides; code falls back to built-in defaults. */
    readonly PERFORMANCE_FEE_RATE_BPS_DEFAULT?: string;
    readonly PERFORMANCE_FEE_CAP_CENTS_DEFAULT?: string;
    readonly PERFORMANCE_FEE_ATTRIBUTION_WINDOW_DAYS?: string;

    /**
     * Shopify Global Catalog MCP credentials (Dev Dashboard → Catalog). Unset
     * disables real agent-shelf rank measurement; see
     * docs/context/agent-visibility.md.
     */
    readonly SHOPIFY_CATALOG_CLIENT_ID?: string;
    readonly SHOPIFY_CATALOG_CLIENT_SECRET?: string;
    readonly SHOPIFY_CATALOG_TOKEN_URL?: string;
    readonly SHOPIFY_CATALOG_MCP_URL?: string;
    readonly UCP_AGENT_PROFILE_URL?: string;

    /**
     * ScrapeLLM — real AI-surface captures for the /dev/llm-scraping sandbox;
     * unset makes every capture fail with a config error. See
     * docs/tasks/llm-surface-scraping.md.
     */
    readonly SCRAPELLM_API_KEY?: string;

    /**
     * x402 pay-to address (EVM) for `/api` via `@x402/next`. Unset falls back
     * to the zero address for discovery-only probes; set a real wallet before
     * enabling settlement.
     */
    readonly X402_PAY_TO?: string;
    /** Optional x402 facilitator URL; defaults to https://x402.org/facilitator. */
    readonly X402_FACILITATOR_URL?: string;
    /**
     * Optional CAIP-2 network for x402 (e.g. eip155:84532 Base Sepolia,
     * eip155:8453 Base mainnet). Must be supported by the configured facilitator.
     */
    readonly X402_NETWORK?: string;

    readonly npm_package_name: string;
    readonly npm_package_version: string;
  }
}
