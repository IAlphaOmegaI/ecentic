import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { outboundProviderCredential } from "@/server/database/outbound";
import {
  decryptCredential,
  isEncryptedCredential,
} from "@/server/utils/credential-encryption";
import { IntegrationError } from "@/server/utils/outbound/http";

mock.module("server-only", () => ({}));
const { createCredentialStore } = await import(
  "@/server/app/outbound/provider-credentials"
);
const original = {
  encryption: process.env.CREDENTIAL_ENCRYPTION_KEY,
  fallback: process.env.OUTBOUND_UNIPILE_API_KEY,
  clayKey: process.env.OUTBOUND_CLAY_API_KEY,
  clayRoutine: process.env.OUTBOUND_CLAY_ROUTINE_ID,
  scrapellm: process.env["OUTBOUND_SCRAPELLM_API_KEY"],
  firecrawl: process.env["OUTBOUND_FIRECRAWL_API_KEY"],
};
const encryption = Buffer.alloc(32, 17).toString("base64");
const records = new Map<
  string,
  {
    ciphertext: string;
    configuration: { routineId?: string; clientId?: string };
  }
>();
const state = {
  ciphertext: "",
  reads: 0,
  writes: 0,
  probes: 0,
  actor: "",
  failure: null as IntegrationError | null,
  persistenceFailure: false,
};
const credentials = createCredentialStore(
  {
    metadata: async (provider) => {
      const record = records.get(provider);
      return record
        ? {
            validatedAt: new Date(),
            updatedAt: new Date(),
            configuration: record.configuration,
          }
        : null;
    },
    read: async (provider) => {
      state.reads += 1;
      const record = records.get(provider);
      return record
        ? {
            apiKey: outboundProviderCredential.apiKey.mapFromDriverValue(
              record.ciphertext,
            ),
            configuration: record.configuration,
          }
        : null;
    },
    write: async (provider, actor, apiKey, configuration) => {
      if (state.persistenceFailure)
        throw new Error(`Driver failed with secret ${apiKey}`);
      const ciphertext =
        outboundProviderCredential.apiKey.mapToDriverValue(apiKey);
      state.ciphertext = ciphertext;
      records.set(provider, { ciphertext, configuration });
      state.actor = actor;
      state.writes += 1;
    },
  },
  async () => {
    state.probes += 1;
    if (state.failure) return { success: false, error: state.failure };
    return { success: true, data: { valid: true } };
  },
);

beforeEach(() => {
  records.clear();
  Object.assign(state, {
    ciphertext: "",
    reads: 0,
    writes: 0,
    probes: 0,
    actor: "",
    failure: null,
    persistenceFailure: false,
  });
  Object.assign(process.env, {
    CREDENTIAL_ENCRYPTION_KEY: encryption,
    OUTBOUND_UNIPILE_API_KEY: "environment-test-key",
  });
});
afterEach(() => {
  if (original.encryption === undefined)
    Reflect.deleteProperty(process.env, "CREDENTIAL_ENCRYPTION_KEY");
  else
    Object.assign(process.env, {
      CREDENTIAL_ENCRYPTION_KEY: original.encryption,
    });
  if (original.fallback === undefined)
    Reflect.deleteProperty(process.env, "OUTBOUND_UNIPILE_API_KEY");
  else
    Object.assign(process.env, { OUTBOUND_UNIPILE_API_KEY: original.fallback });
  for (const [key, value] of [
    ["OUTBOUND_CLAY_API_KEY", original.clayKey],
    ["OUTBOUND_CLAY_ROUTINE_ID", original.clayRoutine],
    ["OUTBOUND_SCRAPELLM_API_KEY", original.scrapellm],
    ["OUTBOUND_FIRECRAWL_API_KEY", original.firecrawl],
  ] as const) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else Object.assign(process.env, { [key]: value });
  }
});

describe("encrypted Unipile key settings", () => {
  test("HubSpot service keys use encrypted storage and secret-free metadata", async () => {
    const result = await credentials.save("staff", {
      provider: "hubspot",
      apiKey: "hubspot-test-secret",
    });
    expect(result.success).toBe(true);
    expect(state.probes).toBe(1);
    expect(state.writes).toBe(1);
    expect(state.ciphertext).not.toContain("hubspot-test-secret");
    expect(isEncryptedCredential(state.ciphertext)).toBe(true);
    const metadata = await credentials.metadata("hubspot");
    expect(metadata.success).toBe(true);
    expect(JSON.stringify(metadata)).not.toContain("hubspot-test-secret");
    expect(state.reads).toBe(0);
  });
  test("validated keys encrypt at the actual column boundary and take precedence over env", async () => {
    expect(
      await credentials.save("staff-fixture", { apiKey: "  saved-test-key  " }),
    ).toEqual({ success: true, data: { configured: true } });
    expect(state.probes).toBe(1);
    expect(state.writes).toBe(1);
    expect(state.actor).toBe("staff-fixture");
    expect(isEncryptedCredential(state.ciphertext)).toBe(true);
    expect(state.ciphertext).not.toContain("saved-test-key");
    expect(
      decryptCredential(
        state.ciphertext,
        "outbound_provider_credential.apiKey",
        { key: encryption },
      ),
    ).toBe("saved-test-key");
    expect(await credentials.resolveKey()).toEqual({
      success: true,
      data: "saved-test-key",
    });
  });

  test("safe status reads do not decrypt a stored secret", async () => {
    await credentials.save("staff-fixture", { apiKey: "saved-test-key" });
    Reflect.deleteProperty(process.env, "CREDENTIAL_ENCRYPTION_KEY");
    expect(await credentials.metadata()).toEqual({
      success: true,
      data: {
        configured: true,
        configuration: {},
        credentialStatus: "verified",
      },
    });
    expect(state.reads).toBe(0);
    expect(await credentials.resolveKey()).toMatchObject({
      success: false,
      error: { message: "unipile-key-encryption" },
    });
  });

  test("an absent saved key uses the existing environment fallback", async () => {
    expect(await credentials.resolveKey()).toEqual({
      success: true,
      data: "environment-test-key",
    });
    Reflect.deleteProperty(process.env, "OUTBOUND_UNIPILE_API_KEY");
    expect(await credentials.resolveKey()).toEqual({
      success: true,
      data: null,
    });
  });

  test.each(["", " ", "bad\nheader", "x".repeat(4097)])(
    "invalid input never probes or writes",
    async (apiKey) => {
      expect(await credentials.save("staff-fixture", { apiKey })).toMatchObject(
        { success: false, error: { message: "unipile-key-invalid" } },
      );
      expect(state.probes).toBe(0);
      expect(state.writes).toBe(0);
    },
  );

  test("rejected replacement preserves the previously saved key", async () => {
    await credentials.save("staff-fixture", { apiKey: "original-test-key" });
    const ciphertext = state.ciphertext;
    state.failure = new IntegrationError(
      "unipile",
      "access",
      "Provider might echo candidate-test-key",
      403,
      null,
      "api/insufficient_permissions",
    );
    expect(
      await credentials.save("staff-fixture", { apiKey: "candidate-test-key" }),
    ).toMatchObject({
      success: false,
      error: { message: "unipile-key-invalid" },
    });
    expect(state.ciphertext).toBe(ciphertext);
    expect(state.writes).toBe(1);
  });

  test("inactive subscriptions and provider outages do not masquerade as invalid keys", async () => {
    state.failure = new IntegrationError(
      "unipile",
      "access",
      "private provider detail",
      403,
      null,
      "api/inactive_subscription",
    );
    expect(
      await credentials.save("staff-fixture", { apiKey: "candidate-test-key" }),
    ).toMatchObject({
      success: false,
      error: { message: "unipile-key-unavailable" },
    });
    expect(state.writes).toBe(0);
  });

  test("missing encryption configuration never probes or writes", async () => {
    Reflect.deleteProperty(process.env, "CREDENTIAL_ENCRYPTION_KEY");
    expect(
      await credentials.save("staff-fixture", { apiKey: "candidate-test-key" }),
    ).toMatchObject({
      success: false,
      error: { message: "unipile-key-encryption" },
    });
    expect(state.probes).toBe(0);
    expect(state.writes).toBe(0);
  });

  test("persistence errors return no input, raw error or cause and preserve the saved key", async () => {
    await credentials.save("staff-fixture", { apiKey: "original-test-key" });
    const ciphertext = state.ciphertext;
    state.persistenceFailure = true;
    const result = await credentials.save("staff-fixture", {
      apiKey: "candidate-test-key",
    });
    expect(result).toMatchObject({
      success: false,
      error: { message: "unipile-key-save-failed" },
    });
    expect(JSON.stringify(result)).not.toContain("candidate-test-key");
    if (!result.success) expect(result.error.cause).toBeUndefined();
    expect(state.ciphertext).toBe(ciphertext);
  });
});

describe("provider settings", () => {
  test.each(["scrapellm", "firecrawl"] as const)(
    "%s keys are encrypted with truthful verification metadata",
    async (provider) => {
      expect(
        await credentials.save("staff-fixture", {
          provider,
          apiKey: `${provider}-fixture-key`,
        }),
      ).toMatchObject({ success: true });
      expect(state.probes).toBe(1);
      expect(
        isEncryptedCredential(records.get(provider)?.ciphertext ?? ""),
      ).toBe(true);
      expect(await credentials.metadata(provider)).toEqual({
        success: true,
        data: {
          configured: true,
          configuration: {},
          credentialStatus: provider === "scrapellm" ? "saved" : "verified",
        },
      });
      expect(state.reads).toBe(0);
      expect(await credentials.resolveKey(provider)).toEqual({
        success: true,
        data: `${provider}-fixture-key`,
      });
    },
  );
  test.each([
    ["scrapellm", "OUTBOUND_SCRAPELLM_API_KEY"],
    ["firecrawl", "OUTBOUND_FIRECRAWL_API_KEY"],
  ] as const)(
    "%s environment configuration does not claim a verified key",
    async (provider, variable) => {
      Reflect.deleteProperty(process.env, variable);
      expect(await credentials.metadata(provider)).toMatchObject({
        data: { configured: false, credentialStatus: "missing" },
      });
      Object.assign(process.env, {
        [variable]: ` ${provider}-environment-key `,
      });
      expect(await credentials.metadata(provider)).toMatchObject({
        data: { configured: true, credentialStatus: "environment" },
      });
      expect(await credentials.resolveKey(provider)).toEqual({
        success: true,
        data: `${provider}-environment-key`,
      });
      expect(state.probes).toBe(0);
      expect(state.writes).toBe(0);
    },
  );
  test.each(["scrapellm", "firecrawl"] as const)(
    "%s invalid replacements preserve the working key without returning provider details",
    async (provider) => {
      await credentials.save("staff-fixture", {
        provider,
        apiKey: "previous-fixture-key",
      });
      const previous = records.get(provider)?.ciphertext;
      state.failure = new IntegrationError(
        provider,
        "input",
        "Invalid candidate-private-key",
      );
      const result = await credentials.save("staff-fixture", {
        provider,
        apiKey: "candidate-private-key",
      });
      expect(result).toMatchObject({
        success: false,
        error: { message: "provider-key-invalid" },
      });
      expect(JSON.stringify(result)).not.toContain("candidate-private-key");
      expect(records.get(provider)?.ciphertext).toBe(previous);
      expect(state.writes).toBe(1);
    },
  );
  test("Apollo and Clay validate before saving; Google saves without a token exchange", async () => {
    expect(
      (
        await credentials.save("staff-fixture", {
          provider: "apollo",
          apiKey: "apollo-test-key",
        })
      ).success,
    ).toBe(true);
    expect(
      (
        await credentials.save("staff-fixture", {
          provider: "clay",
          apiKey: "clay-test-key",
          configuration: { routineId: "function:t_fixture" },
        })
      ).success,
    ).toBe(true);
    expect(state.probes).toBe(2);
    expect(
      (
        await credentials.save("staff-fixture", {
          provider: "google",
          apiKey: "google-test-secret",
          configuration: { clientId: "123-fixture.apps.googleusercontent.com" },
        })
      ).success,
    ).toBe(true);
    expect(state.probes).toBe(2);
    expect(await credentials.metadata("clay")).toMatchObject({
      success: true,
      data: {
        credentialStatus: "verified",
        configuration: { routineId: "function:t_fixture" },
      },
    });
    expect(await credentials.metadata("google")).toMatchObject({
      success: true,
      data: {
        credentialStatus: "saved",
        configuration: { clientId: "123-fixture.apps.googleusercontent.com" },
      },
    });
  });

  test("Clay can verify and encrypt a key before an enrichment routine exists", async () => {
    for (const configuration of [
      undefined,
      {},
      { routineId: "" },
      { routineId: "   " },
    ]) {
      expect(
        await credentials.save("staff-fixture", {
          provider: "clay",
          apiKey: "clay-key-only",
          configuration,
        }),
      ).toEqual({ success: true, data: { configured: true } });
    }
    expect(state.probes).toBe(4);
    expect(state.writes).toBe(4);
    expect(isEncryptedCredential(records.get("clay")?.ciphertext ?? "")).toBe(
      true,
    );
    expect(await credentials.metadata("clay")).toMatchObject({
      success: true,
      data: {
        configured: true,
        credentialStatus: "verified",
        configuration: { routineId: "" },
      },
    });
  });

  test("a key-only Clay save never inherits a routine from the previous key or environment", async () => {
    Object.assign(process.env, {
      OUTBOUND_CLAY_API_KEY: "environment-clay-key",
      OUTBOUND_CLAY_ROUTINE_ID: "function:t_environment",
    });
    await credentials.save("staff-fixture", {
      provider: "clay",
      apiKey: "previous-clay-key",
      configuration: { routineId: "function:t_previous" },
    });
    expect(
      (
        await credentials.save("staff-fixture", {
          provider: "clay",
          apiKey: "replacement-key-only",
        })
      ).success,
    ).toBe(true);
    expect(await credentials.resolve("clay")).toEqual({
      success: true,
      data: {
        apiKey: "replacement-key-only",
        configuration: { routineId: "" },
      },
    });
    expect(await credentials.metadata("clay")).toMatchObject({
      success: true,
      data: { configured: true, configuration: { routineId: "" } },
    });
  });

  test("a failed Clay key-only check preserves the previous credential pair", async () => {
    await credentials.save("staff-fixture", {
      provider: "clay",
      apiKey: "previous-clay-key",
      configuration: { routineId: "function:t_previous" },
    });
    state.failure = new IntegrationError(
      "clay",
      "access",
      "Private provider error: rejected-key-only",
      401,
    );
    expect(
      await credentials.save("staff-fixture", {
        provider: "clay",
        apiKey: "rejected-key-only",
      }),
    ).toMatchObject({
      success: false,
      error: { message: "provider-key-invalid" },
    });
    expect(state.writes).toBe(1);
    expect(await credentials.resolve("clay")).toEqual({
      success: true,
      data: {
        apiKey: "previous-clay-key",
        configuration: { routineId: "function:t_previous" },
      },
    });
  });

  test("a provider save does not replace a separately saved LinkedIn key", async () => {
    await credentials.save("staff-fixture", { apiKey: "linkedin-test-key" });
    const previous = records.get("unipile")?.ciphertext;
    await credentials.save("staff-fixture", {
      provider: "clay",
      apiKey: "clay-test-key",
      configuration: { routineId: "function:t_fixture" },
    });
    expect(records.get("unipile")?.ciphertext).toBe(previous);
    expect(await credentials.resolveKey()).toEqual({
      success: true,
      data: "linkedin-test-key",
    });
    expect(await credentials.resolve("clay")).toEqual({
      success: true,
      data: {
        apiKey: "clay-test-key",
        configuration: { routineId: "function:t_fixture" },
      },
    });
  });

  test("malformed or extra provider configuration is rejected without network work", async () => {
    const inputs = [
      {
        provider: "google",
        apiKey: "secret",
        configuration: { clientId: "not-a-google-client" },
      },
      {
        provider: "google",
        apiKey: "secret",
        configuration: {
          clientId: "123.apps.googleusercontent.com",
          redirectUri: "https://attacker.example/callback",
        },
      },
      {
        provider: "clay",
        apiKey: "key",
        configuration: { routineId: "../routine" },
      },
      {
        provider: "apollo",
        apiKey: "key",
        configuration: { clientId: "unexpected" },
      },
    ];
    for (const input of inputs)
      expect(
        await credentials.save(
          "staff-fixture",
          input as Parameters<typeof credentials.save>[1],
        ),
      ).toMatchObject({
        success: false,
        error: { message: "provider-key-invalid" },
      });
    expect(state.probes).toBe(0);
    expect(state.writes).toBe(0);
  });

  test("generic provider failures preserve the previous key and expose no provider text", async () => {
    await credentials.save("staff-fixture", {
      provider: "apollo",
      apiKey: "original-key",
    });
    state.failure = new IntegrationError(
      "apollo",
      "unavailable",
      "secret provider details",
      503,
    );
    expect(
      await credentials.save("staff-fixture", {
        provider: "apollo",
        apiKey: "replacement-key",
      }),
    ).toMatchObject({
      success: false,
      error: { message: "provider-key-unavailable" },
    });
    expect(await credentials.resolveKey("apollo")).toEqual({
      success: true,
      data: "original-key",
    });
  });
});
