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

    /** Azure OpenAI (ChatGPT) — every GPT call, billed direct to the subscription. */
    readonly AZURE_RESOURCE_NAME: string; // subdomain only, e.g. "my-resource"
    readonly AZURE_API_KEY: string;
    readonly AZURE_API_VERSION?: string; // defaults to "preview" (Azure v1 API surface)
    readonly AZURE_DEPLOYMENT_GPT4O?: string; // your GPT deployment name (e.g. "gpt-5.3-chat")

    /**
     * Vercel AI Gateway — every model Azure cannot serve (Claude, Gemini,
     * Perplexity) resolves through it, so no per-vendor key is required.
     */
    readonly AI_GATEWAY_API_KEY: string;

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
     * x402 pay-to address (EVM) advertised in the `/api` Payment Required
     * challenge. Unset falls back to the zero address for discovery only.
     */
    readonly X402_PAY_TO?: string;

    readonly npm_package_name: string;
    readonly npm_package_version: string;
  }
}
