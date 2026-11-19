import { mock, spyOn } from "bun:test";
import assert from "node:assert/strict";
import { Environment } from "@/server/utils/environment";
import { ValidationError } from "@/server/utils/error";

// This process has only a deliberately unreachable database and fake auth.
const state = { role: null as string | null };
mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("next/server", () => ({ connection: async () => undefined }));
mock.module("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () =>
        state.role
          ? {
              user: { id: "staff-fixture", role: state.role },
              session: { id: "fixture-session" },
            }
          : null,
    },
  },
}));
const Credentials = await import("@/server/app/outbound/provider-credentials");
const save = spyOn(Credentials, "save").mockResolvedValue({
  success: true,
  data: { configured: true },
});
const Actions = await import("@/server/app/outbound/integrations");
assert.equal(
  (await Actions.saveUnipileKey({ apiKey: "synthetic-key" })).success,
  false,
);
assert.equal(
  (
    await Actions.saveProviderCredentials({
      provider: "apollo",
      apiKey: "synthetic-key",
    })
  ).success,
  false,
);
state.role = "owner";
assert.equal(
  (
    await Actions.saveUnipileKey(Environment.SERVER, {
      apiKey: "synthetic-key",
    })
  ).success,
  false,
);
assert.equal(
  (
    await Actions.saveProviderCredentials(Environment.SERVER, {
      provider: "apollo",
      apiKey: "synthetic-key",
    })
  ).success,
  false,
);
assert.equal(save.mock.calls.length, 0);
for (const provider of ["scrapellm", "firecrawl"] as const) {
  assert.equal(
    (
      await Actions.saveProviderCredentials({
        provider,
        apiKey: "synthetic-key",
      })
    ).success,
    false,
  );
}
assert.equal(save.mock.calls.length, 0);
state.role = "staff";
assert.deepEqual(await Actions.saveUnipileKey({ apiKey: "synthetic-key" }), {
  success: true,
  data: { configured: true },
});
assert.deepEqual(
  await Actions.saveProviderCredentials({
    provider: "google",
    apiKey: "synthetic-secret",
    configuration: { clientId: "fixture.apps.googleusercontent.com" },
  }),
  { success: true, data: { configured: true } },
);
assert.equal(save.mock.calls[0]?.[0], "staff-fixture");
assert.equal(save.mock.calls[1]?.[0], "staff-fixture");
await Actions.saveUnipileKey({
  apiKey: "synthetic-key",
  provider: "apollo",
} as never);
assert.equal(save.mock.calls[2]?.[1]?.provider, "unipile");
for (const provider of ["scrapellm", "firecrawl"] as const) {
  assert.deepEqual(
    await Actions.saveProviderCredentials({
      provider,
      apiKey: "synthetic-key",
    }),
    { success: true, data: { configured: true } },
  );
  assert.equal(save.mock.lastCall?.[0], "staff-fixture");
  assert.equal(save.mock.lastCall?.[1]?.provider, provider);
}
save.mockResolvedValue({
  success: false,
  error: new ValidationError("provider-key-save-failed"),
});
assert.deepEqual(
  await Actions.saveProviderCredentials({
    provider: "apollo",
    apiKey: "synthetic-key",
  }),
  {
    success: false,
    error: { name: "validation-error", message: "provider-key-save-failed" },
  },
);
assert.equal(
  (
    await Actions.saveProviderCredentials({
      provider: "unknown",
      apiKey: "synthetic-key",
    } as never)
  ).success,
  false,
);
const Mailboxes = await import("@/server/app/outbound/transport-store");
const connectDirect = spyOn(Mailboxes, "connectDirect").mockResolvedValue({
  success: true,
  data: { inboxId: "synthetic-inbox", email: "xhuri@joinecentic.com" },
});
const directInput = {
  email: "xhuri@joinecentic.com",
  appPassword: "abcdefghijklmnop",
};
state.role = null;
assert.equal((await Actions.connectDirectMailbox(directInput)).success, false);
state.role = "owner";
assert.equal(
  (await Actions.connectDirectMailbox(Environment.SERVER, directInput)).success,
  false,
);
assert.equal(connectDirect.mock.calls.length, 0);
state.role = "staff";
assert.deepEqual(await Actions.connectDirectMailbox(directInput), {
  success: true,
  data: { inboxId: "synthetic-inbox", email: directInput.email },
});
assert.equal(connectDirect.mock.calls[0]?.[0], "staff-fixture");
connectDirect.mockResolvedValue({
  success: false,
  error: new ValidationError("direct-mailbox-authentication"),
});
assert.deepEqual(await Actions.connectDirectMailbox(directInput), {
  success: false,
  error: { name: "validation-error", message: "direct-mailbox-authentication" },
});
const metadata = spyOn(Credentials, "metadata").mockResolvedValue({
  success: true,
  data: {
    configured: true,
    credentialStatus: "verified",
    configuration: { routineId: "" },
  },
});
state.role = null;
assert.equal((await Actions.getClayStatus()).success, false);
state.role = "owner";
assert.equal((await Actions.getClayStatus(Environment.SERVER)).success, false);
assert.equal(metadata.mock.calls.length, 0);
state.role = "staff";
assert.deepEqual(await Actions.getClayStatus(), {
  success: true,
  data: { configured: true, routineConfigured: false },
});
const Jobs = await import("@/server/app/outbound/jobs");
const Providers = await import("@/server/utils/outbound/providers");
const reserve = spyOn(Jobs, "reserve").mockImplementation(async () => {
  throw new Error("No enrichment job may be reserved without a routine");
});
const startClay = spyOn(Providers, "startClayEnrichment").mockImplementation(
  async () => {
    throw new Error("No enrichment request may be sent without a routine");
  },
);
const missingRoutine = await Actions.startClay({
  prospectIds: ["d3013043-3e41-40e5-b97f-833886827380"],
});
assert.deepEqual(missingRoutine, {
  success: false,
  error: {
    name: "validation-error",
    message:
      "Connect a Clay API key and configure an enrichment routine before running enrichment.",
  },
});
assert.equal(reserve.mock.calls.length, 0);
assert.equal(startClay.mock.calls.length, 0);
metadata.mockResolvedValue({
  success: true,
  data: {
    configured: false,
    credentialStatus: "missing",
    configuration: { routineId: "function:t_fixture" },
  },
});
assert.equal(
  (
    await Actions.startClay({
      prospectIds: ["d3013043-3e41-40e5-b97f-833886827380"],
    })
  ).success,
  false,
);
assert.equal(reserve.mock.calls.length, 0);
assert.equal(startClay.mock.calls.length, 0);
metadata.mockResolvedValue({
  success: true,
  data: {
    configured: true,
    credentialStatus: "verified",
    configuration: { routineId: "function:t_fixture" },
  },
});
assert.deepEqual(await Actions.getClayStatus(), {
  success: true,
  data: { configured: true, routineConfigured: true },
});
console.log("Credential action authorization passed");
