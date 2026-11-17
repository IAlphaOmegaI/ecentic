import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { defaultPlaybook, prospectSchema } from "../outbound";
import {
  originalRefreshProduct,
  sequenceRefreshInputSchema,
  sequenceRefreshStateSchema,
  validateSequenceRefreshReceipts,
} from "../outbound-sequence-refresh";

const fixture = () => {
  const now = Date.now();
  const checkedAt = new Date(now - 1000).toISOString();
  const product = {
    name: "Ceramic Mug",
    brand: "Example Goods",
    url: "https://example.test/products/mug",
    description: "A ceramic mug",
    price: 24,
    currency: "USD",
  };
  const sourceEvidenceId = randomUUID();
  const details = prospectSchema.parse({
    company: "Example Goods",
    country: "US",
    domain: "example.test",
    name: "Alex",
    email: "alex@example.test",
    product: product.name,
    productUrl: product.url,
    gap: "product-published-data",
    automationEvidenceId: sourceEvidenceId,
    emailStatus: "verified",
    emailVerifiedAt: checkedAt,
    evidence: `Automatic positive product observation; raw HTML only, no absence or rendered-page claim. Product: ${JSON.stringify(product)}. URL: ${product.url}. SHA256: ${"a".repeat(64)}. Checked: ${checkedAt}.`,
  });
  const input = sequenceRefreshInputSchema.parse({
    operation: "sequenceRefresh",
    prospectId: randomUUID(),
    campaignId: randomUUID(),
    campaignRevision: 1,
    prospectRevision: 2,
    playbookRevision: 1,
    approvalHash: "hash",
    recipient: details.email,
    sentStep: 1,
    sourceEvidenceId,
    actor: "test",
    needEmail: true,
    product,
  });
  const state = sequenceRefreshStateSchema.parse({
    stage: "apply",
    availableAt: checkedAt,
    lease: null,
    product: {
      status: "same",
      reason: null,
      observed: product,
      receipt: {
        url: product.url,
        kind: "product",
        checkedAt,
        sha256: "b".repeat(64),
        excerpt: "Ceramic Mug by Example Goods",
        mode: "raw-html-positive-observation",
      },
    },
    verification: {
      requestId: "request",
      requestedAt: checkedAt,
      records: [{ record_id: "record", input: { email: details.email } }],
    },
    verificationResult: {
      requestId: "request",
      status: "complete",
      retryAfterSeconds: 30,
      results: [
        {
          recordId: "record",
          email: details.email,
          status: "verified",
          verifiedAt: checkedAt,
          source: "apollo",
          verdict: "valid",
        },
      ],
    },
    verificationPolls: 1,
    mx: { provider: "google", checkedAt },
  });
  return { input, state, details, now };
};
describe("automatic sequence refresh receipts", () => {
  test("renews only receipt fields for unchanged original facts", () => {
    const f = fixture();
    const result = validateSequenceRefreshReceipts(
      f.input,
      f.state,
      f.details,
      defaultPlaybook,
      f.now,
    );
    expect("patch" in result).toBe(true);
    if (!("patch" in result)) return;
    expect(Object.keys(result.patch).sort()).toEqual([
      "emailSource",
      "emailStatus",
      "emailVerifiedAt",
      "evidenceCheckedAt",
      "mxCheckedAt",
      "mxProvider",
    ]);
    expect(originalRefreshProduct(f.details)).toEqual(f.input.product);
  });
  test("holds changed name, brand, URL, description, price or currency", () => {
    for (const [key, value] of Object.entries({
      name: "Other",
      brand: "Other",
      url: "https://example.test/products/other",
      description: "Changed",
      price: 25,
      currency: "EUR",
    })) {
      const f = fixture();
      if (!f.state.product?.observed) throw new Error("fixture");
      Object.assign(f.state.product.observed, { [key]: value });
      expect(
        validateSequenceRefreshReceipts(
          f.input,
          f.state,
          f.details,
          defaultPlaybook,
          f.now,
        ),
      ).toEqual({ reason: "sequence-product-changed" });
    }
  });
  test("renewal keeps a specific insight only while its exact quote is still in the fresh product receipt", () => {
    const f = fixture();
    const description =
      "A ceramic mug with a removable stainless steel infuser for loose leaf tea.";
    const product = { ...f.input.product };
    f.input.product = product;
    f.details.evidence = `Automatic positive product observation; raw HTML only, no absence or rendered-page claim. Product: ${JSON.stringify(product)}. URL: ${product.url}. SHA256: ${"a".repeat(64)}. Checked: ${new Date(f.now).toISOString()}.`;
    f.details.productInsight = {
      sourceUrl: product.url,
      sourceQuote: description,
      feature: "a removable stainless steel infuser",
      kind: "design",
      relevance:
        "A shopper looking for a mug for loose leaf tea may need a removable infuser.",
    };
    if (!f.state.product?.receipt) throw new Error("fixture");
    f.state.product.observed = product;
    f.state.product.receipt.excerpt = description;
    expect(
      "patch" in
        validateSequenceRefreshReceipts(
          f.input,
          f.state,
          f.details,
          defaultPlaybook,
          f.now,
        ),
    ).toBe(true);
    f.state.product.receipt.excerpt = "Ceramic Mug";
    expect(
      validateSequenceRefreshReceipts(
        f.input,
        f.state,
        f.details,
        defaultPlaybook,
        f.now,
      ),
    ).toEqual({ reason: "sequence-product-changed" });
  });
  test("requires request and record correlation for exactly this recipient", () => {
    for (const change of ["email", "record", "request"]) {
      const f = fixture();
      const result = f.state.verificationResult;
      if (!result?.results[0]) throw new Error("fixture");
      if (change === "email") result.results[0].email = "other@example.test";
      if (change === "record") result.results[0].recordId = "other";
      if (change === "request") result.requestId = "other";
      expect(
        validateSequenceRefreshReceipts(
          f.input,
          f.state,
          f.details,
          defaultPlaybook,
          f.now,
        ),
      ).toEqual({ reason: "sequence-verification-held" });
    }
  });
  test("request time cannot replace missing, stale or future verification time", () => {
    for (const date of [
      null,
      new Date(Date.now() - 9 * 86400000).toISOString(),
      new Date(Date.now() + 86400000).toISOString(),
    ]) {
      const f = fixture();
      const record = f.state.verificationResult?.results[0];
      if (!record) throw new Error("fixture");
      record.verifiedAt = date;
      expect(
        validateSequenceRefreshReceipts(
          f.input,
          f.state,
          f.details,
          defaultPlaybook,
          f.now,
        ),
      ).toEqual({ reason: "sequence-verification-held" });
    }
  });
  test("keeps the correlated provider completion timestamp and its provenance", () => {
    const f = fixture();
    const record = f.state.verificationResult?.results[0];
    if (!record?.verifiedAt) throw new Error("fixture");
    record.timestampProof = {
      kind: "request-completed",
      requestId: "request",
      action: "email_verifier",
      initiatedAt: new Date(f.now - 15000).toISOString(),
      completedAt: record.verifiedAt,
    };
    const parsed = sequenceRefreshStateSchema.parse(f.state);
    expect(parsed.verificationResult?.results[0]?.timestampProof).toEqual(
      record.timestampProof,
    );
    expect(
      "patch" in
        validateSequenceRefreshReceipts(
          f.input,
          parsed,
          f.details,
          defaultPlaybook,
          f.now,
        ),
    ).toBe(true);
    record.timestampProof.requestId = "wrong";
    expect(
      validateSequenceRefreshReceipts(
        f.input,
        f.state,
        f.details,
        defaultPlaybook,
        f.now,
      ),
    ).toEqual({ reason: "sequence-verification-held" });
  });
  test("does not renew evidence or email when source observations remain unknown", () => {
    const f = fixture();
    f.state.product = null;
    expect(
      validateSequenceRefreshReceipts(
        f.input,
        f.state,
        f.details,
        defaultPlaybook,
        f.now,
      ),
    ).toEqual({ reason: "sequence-product-changed" });
    const g = fixture();
    g.input.needEmail = false;
    g.details.emailVerifiedAt = "";
    expect(
      validateSequenceRefreshReceipts(
        g.input,
        g.state,
        g.details,
        defaultPlaybook,
        g.now,
      ),
    ).toEqual({ reason: "sequence-verification-held" });
  });
  test("holds a changed recipient and an ineligible email host", () => {
    const f = fixture();
    f.details.email = "new@example.test";
    expect(
      validateSequenceRefreshReceipts(
        f.input,
        f.state,
        f.details,
        defaultPlaybook,
        f.now,
      ),
    ).toEqual({ reason: "sequence-changed" });
    const g = fixture();
    if (!g.state.mx) throw new Error("fixture");
    g.state.mx.provider = "microsoft";
    expect(
      validateSequenceRefreshReceipts(
        g.input,
        g.state,
        g.details,
        defaultPlaybook,
        g.now,
      ),
    ).toEqual({ reason: "sequence-mx-held" });
  });
});
