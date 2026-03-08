declare namespace NodeJS {
  interface ProcessEnv {
    BETTER_AUTH_BASE_URL: string;
    NEXT_PUBLIC_SENTRY_DSN: string;
    DATABASE_URL: string;
    RESEND_API_KEY: string;
    FROM_EMAIL?: string;
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    npm_package_name: string;
    npm_package_version: string;
  }
}
