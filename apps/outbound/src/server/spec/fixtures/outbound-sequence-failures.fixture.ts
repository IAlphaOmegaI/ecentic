import { beforeEach, expect, mock, test } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { tables as schema } from "../../database/schema";
import { ConflictError, ValidationError } from "../../utils/error";
import { IntegrationError } from "../../utils/outbound/http";

// The coordinator runs against in-memory repositories; no database, DNS, or
// provider implementation is imported into this fixture.
mock.module("server-only", () => ({}));
const dialect = new PgDialect();
const prospect = {
  id: "11111111-1111-4111-8111-111111111111",
  campaignId: "22222222-2222-4222-8222-222222222222",
  revision: 1,
  playbookRevision: 1,
  approvalHash: "approved",
  sentStep: 1,
  details: { email: "recipient@merchant.test" },
  approvedBy: "automatic:fixture",
  status: "active",
  holdReason: null as string | null,
};
const input = {
  operation: "sequenceRefresh",
  prospectId: prospect.id,
  campaignId: prospect.campaignId,
  campaignRevision: 1,
  prospectRevision: 1,
  playbookRevision: 1,
  approvalHash: prospect.approvalHash,
  recipient: prospect.details.email,
  sentStep: 1,
  sourceEvidenceId: "33333333-3333-4333-8333-333333333333",
  actor: "fixture",
  needEmail: false,
  product: {
    name: "Mug",
    brand: "Merchant",
    url: "https://merchant.test/products/mug",
    description: "Ceramic mug",
    price: 20,
    currency: "USD",
  },
};
const initial = () => ({
  stage: "product",
  availableAt: new Date(0).toISOString(),
  lease: null,
  product: null,
  verification: null,
  verificationResult: null,
  verificationPolls: 0,
  mx: null,
});
const job = {
  id: "44444444-4444-4444-8444-444444444444",
  input,
  output: initial() as Record<string, unknown>,
  status: "pending",
  error: null as string | null,
};
const success = <Data>(data: Data) => ({ success: true as const, data });
mock.module("../../database", () => ({
  schema,
  db: {
    transaction: async (callback: (transaction: unknown) => unknown) =>
      callback({ execute: async () => [] }),
  },
}));
mock.module("../../utils/repository", () => ({
  repository: (table: unknown) => {
    if (table === schema.outboundIntegrationJob)
      return {
        get: async () => success(job),
        find: async (_: unknown, options: { where: SQL }) =>
          success(
            dialect.sqlToQuery(options.where).params.includes(job.status)
              ? [{ ...job }]
              : [],
          ),
        update: async (_: unknown, _identifier: string, values: object) =>
          success(Object.assign(job, values)),
      };
    if (table === schema.outboundProspect)
      return {
        find: async () => success([]),
        get: async () => success(prospect),
        update: async (_: unknown, _identifier: string, values: object) =>
          success(Object.assign(prospect, values)),
      };
    return {
      get: async () =>
        success({ id: prospect.campaignId, status: "active", revision: 1 }),
    };
  },
}));
mock.module("../../app/outbound/store", () => ({
  policy: async () => ({ revision: 1, settings: { automationEnabled: true } }),
}));
mock.module("../../utils/outbound/mx", () => ({}));
mock.module("../../utils/outbound/providers", () => ({}));
mock.module("../../utils/outbound/sequence-refresh-product", () => ({}));
const Refresh = await import("../../app/outbound/automatic-sequence-refresh");

beforeEach(() => {
  Object.assign(job, { status: "pending", error: null, output: initial() });
  Object.assign(prospect, { status: "active", holdReason: null });
});

test.each([
  [new ConflictError("changed"), "failed", "sequence-refresh-held"],
  [new ValidationError("invalid"), "failed", "sequence-refresh-held"],
  [
    new IntegrationError("apollo", "quota", "limited"),
    "failed",
    "provider-quota",
  ],
  [
    new IntegrationError("apollo", "uncertain", "unknown receipt"),
    "uncertain",
    "provider-uncertain",
  ],
  [new Error("transport failure"), "uncertain", "sequence-request-uncertain"],
] as const)(
  "records %s without retrying uncertain work",
  async (error, status, reason) => {
    const product = mock(async () => ({ success: false as const, error }));
    const unexpected = mock(async () => {
      throw new Error("Unexpected provider call");
    });
    const result = await Refresh.run(
      { maxSteps: 1 },
      {
        product,
        verify: unexpected,
        poll: unexpected,
        mx: unexpected,
        apply: unexpected,
      },
    );
    expect(result).toEqual(success({ enabled: true, processed: 1 }));
    expect(job).toMatchObject({
      status,
      error: reason,
      output: { lease: null },
    });
    expect(prospect).toMatchObject({ status: "held", holdReason: reason });
    expect(product).toHaveBeenCalledTimes(1);
    expect(unexpected).not.toHaveBeenCalled();
  },
);
