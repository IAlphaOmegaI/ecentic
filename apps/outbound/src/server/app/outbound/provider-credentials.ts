import "server-only";

import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  type ClaudeModel,
  claudeConfigurationSchema,
  claudeModelSchema,
  DEFAULT_CLAUDE_MODEL,
} from "@/lib/outbound-claude";
import type { TransactionScope } from "@/server/database";
import { outboundProviderCredential } from "@/server/database/outbound";
import { credentialKeyIdentifier } from "@/server/utils/credential-encryption";
import { ValidationError } from "@/server/utils/error";
import type { IntegrationError } from "@/server/utils/outbound/http";

export type Provider =
  | "unipile"
  | "apollo"
  | "clay"
  | "google"
  | "warmbly"
  | "claude"
  | "scrapellm"
  | "firecrawl"
  | "hubspot";
export type Configuration = {
  routineId?: string;
  clientId?: string;
  model?: ClaudeModel;
  workspaceId?: string;
};
type Credential = { apiKey: string | null; configuration: Configuration };
type Metadata = {
  validatedAt: Date;
  updatedAt: Date;
  configuration: Configuration;
};
type Persistence = {
  metadata: (
    provider: Provider,
    transaction?: TransactionScope,
  ) => Promise<Metadata | null>;
  read: (provider: Provider) => Promise<Credential | null>;
  write: (
    provider: Provider,
    actor: string,
    apiKey: string,
    configuration: Configuration,
  ) => Promise<void>;
};
type Validation = (
  provider: Provider,
  apiKey: string,
  configuration: Configuration,
) => Promise<Result<{ valid: true }, IntegrationError>>;
const providerSchema = z.enum([
  "unipile",
  "apollo",
  "clay",
  "google",
  "warmbly",
  "claude",
  "scrapellm",
  "firecrawl",
  "hubspot",
]);
const keySchema = z
  .object({
    provider: providerSchema.default("unipile"),
    apiKey: z
      .string()
      .trim()
      .min(1)
      .max(4096)
      .regex(/^[\x21-\x7e]+$/),
    configuration: z
      .object({
        routineId: z.string().optional(),
        clientId: z.string().optional(),
        model: claudeModelSchema.optional(),
        workspaceId: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
const configurationSchema = (provider: Provider) => {
  switch (provider) {
    case "claude":
      return claudeConfigurationSchema;
    case "clay":
      return z
        .object({
          routineId: z
            .string()
            .trim()
            .max(64)
            .regex(/^$|^[A-Za-z0-9_:.-]+$/)
            .default(""),
        })
        .strict();
    case "google":
      return z
        .object({
          clientId: z
            .string()
            .trim()
            .max(500)
            .regex(/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/),
        })
        .strict();
    default:
      return z.object({}).strict();
  }
};
const projectConfiguration = (
  provider: Provider,
  configuration: Configuration,
): Configuration => {
  if (provider === "clay") return { routineId: configuration.routineId ?? "" };
  if (provider === "google") return { clientId: configuration.clientId ?? "" };
  if (provider === "claude")
    return {
      model: configuration.model ?? DEFAULT_CLAUDE_MODEL,
      workspaceId: configuration.workspaceId ?? "",
    };
  return {};
};
const environment = (provider: Provider): Credential => {
  switch (provider) {
    case "hubspot":
      return {
        apiKey: process.env["OUTBOUND_HUBSPOT_API_KEY"]?.trim() ?? null,
        configuration: {},
      };
    case "scrapellm":
      return {
        apiKey: process.env["OUTBOUND_SCRAPELLM_API_KEY"]?.trim() ?? null,
        configuration: {},
      };
    case "firecrawl":
      return {
        apiKey: process.env["OUTBOUND_FIRECRAWL_API_KEY"]?.trim() ?? null,
        configuration: {},
      };
    case "claude":
      return {
        apiKey: process.env["OUTBOUND_CLAUDE_API_KEY"]?.trim() ?? null,
        configuration: {
          model: DEFAULT_CLAUDE_MODEL,
          workspaceId:
            process.env["OUTBOUND_CLAUDE_WORKSPACE_ID"]?.trim() ?? "",
        },
      };
    case "warmbly":
      return {
        apiKey: process.env["OUTBOUND_WARMBLY_API_KEY"]?.trim() ?? null,
        configuration: {},
      };
    case "unipile":
      return {
        apiKey: process.env.OUTBOUND_UNIPILE_API_KEY?.trim() ?? null,
        configuration: {},
      };
    case "apollo":
      return {
        apiKey: process.env.OUTBOUND_APOLLO_API_KEY?.trim() ?? null,
        configuration: {},
      };
    case "clay":
      return {
        apiKey: process.env.OUTBOUND_CLAY_API_KEY?.trim() ?? null,
        configuration: {
          routineId: process.env.OUTBOUND_CLAY_ROUTINE_ID ?? "",
        },
      };
    case "google":
      return {
        apiKey: process.env.OUTBOUND_GOOGLE_CLIENT_SECRET?.trim() ?? null,
        configuration: {
          clientId: process.env.OUTBOUND_GOOGLE_CLIENT_ID ?? "",
        },
      };
  }
};
const failure = (
  provider: Provider,
  code: "invalid" | "encryption" | "unavailable" | "save-failed",
) => ({
  success: false as const,
  error: new ValidationError(
    `${provider === "unipile" ? "unipile" : "provider"}-key-${code}`,
  ),
});

/** Metadata never reads encrypted columns; key/config pairs come from one row. */
export const createCredentialStore = (
  persistence: Persistence,
  validate: Validation,
) => {
  const resolve = async (provider: Provider = "unipile") => {
    const result = await resultify(() => persistence.read(provider));
    if (!result.success) return failure(provider, "encryption");
    return {
      success: true as const,
      data: result.data ?? environment(provider),
    };
  };
  return {
    metadata: async (
      provider: Provider = "unipile",
      transaction?: TransactionScope,
      includeVersion = false,
    ) => {
      const result = await resultify(() =>
        persistence.metadata(provider, transaction),
      );
      if (!result.success) return failure(provider, "save-failed");
      const fallback = environment(provider);
      const configuration = projectConfiguration(
        provider,
        result.data?.configuration ?? fallback.configuration,
      );
      const configured = Boolean(result.data || fallback.apiKey);
      const credentialStatus = result.data
        ? provider === "google" || provider === "scrapellm"
          ? ("saved" as const)
          : ("verified" as const)
        : configured
          ? ("environment" as const)
          : ("missing" as const);
      return {
        success: true as const,
        data: {
          configured,
          configuration,
          credentialStatus,
          ...(includeVersion
            ? {
                version: createHash("sha256")
                  .update(
                    JSON.stringify(
                      result.data
                        ? {
                            updatedAt: result.data.updatedAt.toISOString(),
                            validatedAt: result.data.validatedAt.toISOString(),
                            configuration: result.data.configuration,
                          }
                        : fallback,
                    ),
                  )
                  .digest("hex"),
              }
            : {}),
        },
      };
    },
    resolve,
    resolveKey: async (provider: Provider = "unipile") => {
      const result = await resolve(provider);
      if (!result.success) return result;
      return { success: true as const, data: result.data.apiKey };
    },
    save: async (
      actor: string,
      input: {
        provider?: Provider;
        apiKey: string;
        configuration?: Configuration;
      },
    ) => {
      const parsed = keySchema.safeParse(input);
      const supplied = providerSchema.safeParse(input?.provider ?? "unipile");
      const provider = supplied.success ? supplied.data : "apollo";
      if (!parsed.success) return failure(provider, "invalid");
      const configuration = configurationSchema(provider).safeParse(
        parsed.data.configuration ?? {},
      );
      if (!configuration.success) return failure(provider, "invalid");
      const encryption = resultify(() => credentialKeyIdentifier());
      if (!encryption.success) return failure(provider, "encryption");
      if (provider !== "google") {
        const validation = await resultify(() =>
          validate(provider, parsed.data.apiKey, configuration.data),
        );
        if (!validation.success) return failure(provider, "unavailable");
        if (!validation.data.success) {
          const error = validation.data.error;
          const invalid =
            error.code === "input" ||
            (error.code === "access" &&
              error.providerCode !== "api/inactive_subscription") ||
            error.providerCode === "api/invalid_auth_format";
          return failure(provider, invalid ? "invalid" : "unavailable");
        }
      }
      const saved = await resultify(() =>
        persistence.write(
          provider,
          actor,
          parsed.data.apiKey,
          configuration.data,
        ),
      );
      if (!saved.success) return failure(provider, "save-failed");
      return { success: true as const, data: { configured: true as const } };
    },
  };
};

const persistence: Persistence = {
  metadata: async (provider, transaction) => {
    const { db } = await import("@/server/database");
    const { resultifyRead } = await import("@/server/utils/repository");
    const result = await resultifyRead(
      async () =>
        (transaction ?? db)
          .select({
            validatedAt: outboundProviderCredential.validatedAt,
            updatedAt: outboundProviderCredential.updatedAt,
            configuration: outboundProviderCredential.configuration,
          })
          .from(outboundProviderCredential)
          .where(eq(outboundProviderCredential.provider, provider))
          .limit(1),
      { tx: transaction },
    );
    if (!result.success) throw new Error("provider-key-save-failed");
    return result.data[0] ?? null;
  },
  read: async (provider) => {
    const { db } = await import("@/server/database");
    const { resultifyRead } = await import("@/server/utils/repository");
    const result = await resultifyRead(async () =>
      db
        .select({
          apiKey: outboundProviderCredential.apiKey,
          configuration: outboundProviderCredential.configuration,
        })
        .from(outboundProviderCredential)
        .where(eq(outboundProviderCredential.provider, provider))
        .limit(1),
    );
    if (!result.success) throw new Error("provider-key-encryption");
    return result.data[0] ?? null;
  },
  write: async (provider, actor, apiKey, configuration) => {
    const { db } = await import("@/server/database");
    const now = new Date();
    // Repository errors include write arguments. This atomic encrypted upsert
    // never logs or returns raw errors or the key; callers receive fixed codes.
    await db
      .insert(outboundProviderCredential)
      .values({
        provider,
        apiKey,
        configuration,
        createdBy: actor,
        updatedBy: actor,
        validatedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: outboundProviderCredential.provider,
        set: {
          apiKey,
          configuration,
          updatedBy: actor,
          validatedAt: now,
          updatedAt: now,
        },
      });
  },
};
const store = createCredentialStore(
  persistence,
  async (provider, apiKey, configuration) => {
    if (provider === "hubspot") {
      const HubSpot = await import("@/server/utils/outbound/hubspot");
      return HubSpot.validateKey(apiKey);
    }
    if (provider === "scrapellm" || provider === "firecrawl") {
      const Research = await import("@/server/utils/outbound/live-shopping");
      const checked = await (provider === "scrapellm"
        ? Research.validateScrapellmCredentials({ apiKey })
        : Research.validateFirecrawlCredentials({ apiKey }));
      if (!checked.success) return checked;
      return { success: true as const, data: { valid: true as const } };
    }
    if (provider === "claude") {
      const Claude = await import("@/server/utils/outbound/claude");
      return Claude.validateKey(apiKey, configuration);
    }
    if (provider === "warmbly") {
      const Warmbly = await import("@/server/utils/outbound/warmbly");
      return Warmbly.validateWarmblyKey(apiKey);
    }
    if (provider === "clay") {
      const Providers = await import("@/server/utils/outbound/providers");
      return Providers.validateClayKey(apiKey);
    }
    if (provider === "apollo") {
      const Providers = await import("@/server/utils/outbound/providers");
      return Providers.validateApolloKey(apiKey);
    }
    const Unipile = await import("@/server/utils/outbound/unipile");
    return Unipile.validateApiKey(apiKey);
  },
);
export const metadata = store.metadata;
export const resolve = store.resolve;
export const resolveKey = store.resolveKey;
export const save = store.save;
