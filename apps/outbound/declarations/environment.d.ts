declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL: string;
    readonly APP_HOST: string;
    readonly BETTER_AUTH_SECRET: string;
    readonly BETTER_AUTH_BASE_URL: string;
    readonly CRON_SECRET?: string;
    readonly CREDENTIAL_ENCRYPTION_KEY?: string;
    readonly CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS?: string;
    readonly CREDENTIAL_ENCRYPTION_ALLOW_LEGACY?: string;
    readonly AZURE_RESOURCE_NAME?: string;
    readonly AZURE_API_KEY?: string;
    readonly AZURE_API_VERSION?: string;
    readonly AZURE_DEPLOYMENT_GPT?: string;
    readonly AZURE_DEPLOYMENT_GPT4O?: string;
    readonly OUTBOUND_APOLLO_API_KEY?: string;
    readonly OUTBOUND_CLAY_API_KEY?: string;
    readonly OUTBOUND_UNIPILE_API_KEY?: string;
    readonly OUTBOUND_CLAY_ROUTINE_ID?: string;
    readonly OUTBOUND_GOOGLE_CLIENT_ID?: string;
    readonly OUTBOUND_GOOGLE_CLIENT_SECRET?: string;
    readonly OUTBOUND_GOOGLE_REDIRECT_URI?: string;
    readonly OUTBOUND_TEST_DATABASE_URL?: string;
  }
}
