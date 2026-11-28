import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  assembleSequence,
  canonicalSequenceInput,
  LEGACY_WRITING_CONTRACT_VERSION,
  legacyWritingSnapshotSchema,
} from "@/lib/outbound-composition";
import {
  applyRound3CopyEdits,
  type CopyRulesContext,
  ROUND3_COPY_RULES_VERSION,
  spokenMerchantName,
} from "@/lib/outbound-round3-copy";
import { validateWriterParts } from "@/lib/outbound-writing";
import {
  buildSyntheticShoppingCapture,
  buildSyntheticShoppingEvidence,
  type FactSelection,
} from "./helpers/outbound-shopping-fixture";
import {
  passingCopyJudge,
  writerFixture,
} from "./helpers/outbound-writer-fixture";

mock.module("server-only", () => ({}));
const Proof = await import("@/server/utils/outbound/round3-copy-evidence");
const Assessment = await import("@/server/utils/outbound/shopping-assessment");
const Browser = await import("@/server/utils/outbound/live-shopping-browser");
const Draft = await import("@/server/utils/outbound/draft");
const Quality = await import("@/server/utils/outbound/copy-quality");
const Policy = await import("@/server/utils/outbound/shopping-policy");
const Capture = await import("@/server/utils/outbound/live-shopping");
const Discovery = await import(
  "@/server/utils/outbound/shopping-discovery-review"
);
const Presence = await import("@/server/utils/outbound/shopping-presence");
const rules: CopyRulesContext = {
  copyRulesVersion: ROUND3_COPY_RULES_VERSION,
};
const value = <T>(
  result: { success: true; data: T } | { success: false; error: Error },
): T => {
  if (!result.success) throw result.error;
  return result.data;
};
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");

/** Synthetic copies and raw responses only; no fixture is an actual merchant observation. */
const synthetic = async (
  company = "Peepers by PeeperSpecs",
  domain = "peepers.example",
  noBrands = false,
) => {
  const fixture = writerFixture();
  const product = "Marlow Tote";
  const options = {
    prospect: {
      company,
      domain,
      product,
      productUrl: `https://${domain}/products/tote`,
    },
    ...(company ===
    "Midwinter Co. Alternative Bridal Rings and Modern Fine Jewelry"
      ? {
          pageText: `${product} is a large linen bag.\nShop Midwinter Co.\nReturn to shop\nMIDWINTER CO. WILMINGTON, DE.`,
        }
      : {}),
    ...(noBrands
      ? {
          listed: [],
          answerText:
            "A reusable bag carries groceries. Choose a bag with comfortable handles.",
        }
      : {}),
  };
  const captured = await (async () => {
    if (!noBrands) return buildSyntheticShoppingEvidence(options);
    const capture = await buildSyntheticShoppingCapture(options);
    const query = capture.evidence.answer.job.query;
    if (!query.merchant) throw new Error("Synthetic merchant missing");
    const queryReview = value(
      await Capture.reviewShopperQuery(
        {
          query,
          product: query.product,
          category: query.category,
          merchant: query.merchant,
          browser: capture.evidence.browser,
          deadline: Date.now() + 40000,
        },
        {
          review: async ({ prompt }) => ({
            status: "valid",
            reason: "Synthetic obvious product fit.",
            checks: {
              naturalWordOrder: true,
              obviousProductCandidate: true,
              unbranded: true,
              productGrounding: true,
            },
            excerptIds: [JSON.parse(prompt).excerpts[0].id],
          }),
        },
      ),
    );
    const evidence = { ...capture.evidence, queryReview };
    const projected = Discovery.projectUnrankedDiscoveryAbsence(evidence);
    if (projected.status !== "researched") throw new Error(projected.reason);
    return { ...capture, evidence, receipt: projected.receipt };
  })();
  const prospect = {
    ...fixture.prospect,
    company,
    domain,
    product,
    productUrl: captured.receipt.product.url,
    productCategory: "linen bags",
  };
  const parts = {
    subject: "linen bags",
    opening: 'A cousin needed a tote, so I asked "large linen bags".',
    result: `It picked Canvas Works and Harbor Label. ${spokenMerchantName(prospect)} didn't come up in that answer.`,
    relevance: "That's the kind of search a new customer starts with.",
  };
  return {
    ...captured,
    prospect,
    parts,
    policy: { ...fixture.policy, relevanceLines: [parts.relevance] },
  };
};
const reviewedNone = (input: Awaited<ReturnType<typeof synthetic>>) => {
  const discovery = input.receipt.discovery;
  if (!discovery) throw new Error("Synthetic discovery is missing.");
  return {
    reviewedBy: "synthetic-operator",
    reviewedAt: new Date(input.now).toISOString(),
    reason:
      "Explicit synthetic saved-answer review: no product brands are named.",
    expectedAnswerHash: discovery.answerHash,
    expectedLinksHash: discovery.linksHash,
  };
};

describe("explicit round-three copy rules", () => {
  test("mechanical edits preserve all other text and never mutate the saved parts", () => {
    const parts = {
      subject: "home gym search",
      opening: 'I asked "large linen bags".',
      result:
        "When I asked, it picked Alder and Birch. Alice Lane Home Collection didn't come up.",
      relevance: "That's the kind of search a new customer starts with.",
    };
    const saved = JSON.stringify(parts);
    const edited = applyRound3CopyEdits({
      prospect: { company: "Alice Lane Home Collection" },
      parts,
    });
    expect(edited.status).toBe("ready");
    if (edited.status !== "ready") throw new Error(edited.reason);
    expect(edited.parts).toEqual({
      ...parts,
      subject: "home gym",
      result: "It picked Alder and Birch. Alice Lane didn't come up.",
    });
    expect(edited.edits.map((edit) => edit.field)).toEqual([
      "subject",
      "result",
    ]);
    expect(JSON.stringify(parts)).toBe(saved);
    expect(
      applyRound3CopyEdits({
        prospect: { company: "Sample Goods" },
        parts: { ...parts, subject: "search" },
      }).status,
    ).toBe("held");
    const substring = applyRound3CopyEdits({
      prospect: { company: "Sample Goods" },
      parts: { ...parts, subject: "research bags" },
    });
    expect(substring.status === "ready" && substring.parts.subject).toBe(
      "research bags",
    );
  });

  test("spoken names need new proof, an exact result prefix and no whole-word subject search", async () => {
    for (const company of [
      "Alice Lane Home Collection",
      "Peepers by PeeperSpecs",
      "Só Dança USA",
      "Midwinter Co. Alternative Bridal Rings and Modern Fine Jewelry",
    ]) {
      const input = await synthetic(company);
      const receipt = value(
        Proof.projectRound3CopyProof(input.evidence, input.receipt),
      );
      expect(
        validateWriterParts({
          ...rules,
          prospect: input.prospect,
          receipt,
          playbook: input.policy,
          parts: input.parts,
        }),
      ).toEqual([]);
      expect(
        validateWriterParts({
          ...rules,
          prospect: input.prospect,
          receipt: input.receipt,
          playbook: input.policy,
          parts: input.parts,
        }).length,
      ).toBeGreaterThan(0);
      for (const parts of [
        { ...input.parts, subject: "linen search" },
        {
          ...input.parts,
          result: input.parts.result.replace(
            "It picked",
            "When I asked, it picked",
          ),
        },
        {
          ...input.parts,
          result: input.parts.result.replace(
            spokenMerchantName(input.prospect),
            company,
          ),
        },
        {
          ...input.parts,
          result: input.parts.result.replace("Canvas Works", "Invented Brand"),
        },
      ])
        expect(
          validateWriterParts({
            ...rules,
            prospect: input.prospect,
            receipt,
            playbook: input.policy,
            parts,
          }).length,
        ).toBeGreaterThan(0);
    }
  });

  test("a missing brand projection never authorizes a brandless email", async () => {
    const input = await synthetic("Diamond Dotz", "diamonddotz.com", true);
    const parts = {
      ...input.parts,
      result: "Diamond Dotz didn't come up in that answer.",
    };
    const ordinary = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    expect(
      validateWriterParts({
        ...rules,
        prospect: input.prospect,
        receipt: ordinary,
        playbook: input.policy,
        parts,
      }).length,
    ).toBeGreaterThan(0);
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt, {
        noProductBrands: reviewedNone(input),
      }),
    );
    expect(
      validateWriterParts({
        ...rules,
        prospect: input.prospect,
        receipt,
        playbook: input.policy,
        parts,
      }),
    ).toEqual([]);
    expect(
      Assessment.validateAutomaticResearch(input.evidence, receipt, 7),
    ).toBeNull();
    for (const result of [
      "It picked Seller Market. Diamond Dotz didn't come up.",
      "It picked invented brands. Diamond Dotz didn't come up.",
      "Diamond Dotz wasn't anywhere online.",
    ])
      expect(
        validateWriterParts({
          ...rules,
          prospect: input.prospect,
          receipt,
          playbook: input.policy,
          parts: { ...parts, result },
        }).length,
      ).toBeGreaterThan(0);
    expect(
      Proof.projectRound3CopyProof(input.evidence, input.receipt, {
        noProductBrands: {
          ...reviewedNone(input),
          expectedAnswerHash: "0".repeat(64),
        },
      }).success,
    ).toBe(false);
    const other = await synthetic(
      "Unrelated Merchant",
      "unrelated.example",
      true,
    );
    expect(
      Proof.projectRound3CopyProof(other.evidence, other.receipt, {
        noProductBrands: reviewedNone(other),
      }).success,
    ).toBe(false);
  });

  test("new rules bind canonical content and policy while unchanged old judgments use old text", async () => {
    const input = await synthetic();
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    const oldParts = {
      ...input.parts,
      result: input.parts.result
        .replace("Peepers", input.prospect.company)
        .replace("It picked", "That answer picked"),
      subject: "linen bags search",
    };
    const old = assembleSequence(
      input.prospect,
      input.receipt,
      input.policy,
      oldParts,
    );
    if (old.status !== "ready") throw new Error(old.reason);
    const original = JSON.stringify(old.messages);
    const judged = value(
      await Quality.judgeSequenceCopy(
        {
          prospect: input.prospect,
          receipt: input.receipt,
          playbook: input.policy,
          parts: oldParts,
          messages: old.messages,
        },
        {
          generate: async (request) => {
            const prompt = JSON.parse(request.prompt);
            expect(prompt.parts).toEqual(oldParts);
            expect(prompt.messages).toEqual(old.messages);
            expect(prompt.copyRulesVersion).toBeUndefined();
            return passingCopyJudge();
          },
        },
      ),
    );
    expect(judged.passed).toBe(true);
    expect(JSON.stringify(old.messages)).toBe(original);
    const counts = { writer: 0, judge: 0 };
    const composed = value(
      await Draft.composeSequence(input.prospect, receipt, input.policy, {
        ...rules,
        suppliedParts: input.parts,
        generate: async () => {
          counts.writer++;
          throw new Error("No writer allowed");
        },
        judge: async () => {
          counts.judge++;
          return passingCopyJudge();
        },
      }),
    );
    expect(counts).toEqual({ writer: 0, judge: 1 });
    const writing = composed.messages[0]?.writing;
    if (!writing || !("copyRulesVersion" in writing))
      throw new Error("The current copy rules must be stored.");
    expect(writing.copyRulesVersion).toBe(ROUND3_COPY_RULES_VERSION);
    const canonical = canonicalSequenceInput(composed.messages);
    if (canonical.status !== "ready") throw new Error(canonical.reason);
    expect(digest(canonical.canonicalText)).toBe(writing?.contentHash);
    const legacy = {
      ...writing,
      version: LEGACY_WRITING_CONTRACT_VERSION,
      parts: { ...writing.parts, followupFact: "" },
    };
    expect(legacyWritingSnapshotSchema.safeParse(legacy).success).toBe(false);
    const { copyRulesVersion: _copyRulesVersion, ...historical } = legacy;
    const savedLegacy = legacyWritingSnapshotSchema.parse(historical);
    const historicalMessages = composed.messages.map((message, index) =>
      index === 0 ? { ...message, writing: savedLegacy } : message,
    );
    expect(canonicalSequenceInput(historicalMessages).status).toBe("ready");
    expect(canonicalSequenceInput(historicalMessages, rules).status).toBe(
      "held",
    );
    expect(Policy.writingPolicyHash(input.policy, rules)).not.toBe(
      Policy.writingPolicyHash(input.policy),
    );
    expect(
      composed.messages
        .slice(1)
        .map(({ body, afterDays }) => ({ body, afterDays })),
    ).toEqual([
      { body: "Bumping this!", afterDays: 3 },
      { body: "Jamie?", afterDays: 7 },
    ]);
  });
});

describe("full-answer and saved-citation spoken-name proof", () => {
  const rootsOptions = {
    prospect: {
      company: "Roots Farm Fresh",
      domain: "rootsfarmfresh.com",
      product: "Classic Cut",
      productUrl: "https://www.rootsfarmfresh.com/products/classic-cut-fries",
    },
    shopper: {
      question: "frozen potato fries",
      category: "potato fries",
      attribute: "frozen",
    },
    pageText:
      "Classic Cut Fries are frozen potato fries. Roots was born as a sustainability mission. The Roots' collective makes eight Roots products.",
    answerText:
      "1. [Canvas Works — Frozen fries](https://canvas.example/products/fries).\n2. [Harbor Label — Frozen potato fries](https://harbor.example/products/fries).",
    select: (selection: FactSelection) => ({
      ...selection,
      productAttributes: [],
    }),
  };

  test("Roots is an own-domain absence-only alias without changing saved names or proof shape", async () => {
    const input = await buildSyntheticShoppingEvidence(rootsOptions);
    const discovery = input.receipt.discovery;
    if (!discovery) throw new Error("Synthetic discovery missing");
    const original = JSON.stringify(input);
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    expect(spokenMerchantName(rootsOptions.prospect)).toBe("Roots Farm Fresh");
    expect(receipt.discovery?.round3CopyProof).toEqual({
      version: "round3-copy-proof-v1",
      sourceId: input.evidence.answer.source.id,
      answerHash: discovery.answerHash,
      linksHash: discovery.linksHash,
      fullName: "Roots Farm Fresh",
      spokenName: "Roots Farm Fresh",
      domain: "rootsfarmfresh.com",
      namesAbsent: true,
      citedSources: [],
    });
    expect(Proof.validateRound3CopyProof(input.evidence, receipt)).toBeNull();
    expect(input.evidence.answer.job.query.merchant?.aliases).toEqual([]);
    expect(JSON.stringify(input)).toBe(original);

    const variant = await buildSyntheticShoppingEvidence({
      ...rootsOptions,
      prospect: { ...rootsOptions.prospect, company: "  ROOTS FARM FRESH  " },
      pageText: "Classic Cut Fries are frozen potato fries.",
    });
    const variantProof = Proof.projectRound3CopyProof(
      variant.evidence,
      variant.receipt,
    );
    expect(variantProof.success).toBe(false);
    if (!variantProof.success)
      expect(variantProof.error.message).toContain("Roots absence alias");

    for (const options of [
      {
        ...rootsOptions,
        pageText: "Classic Cut Fries are frozen potato fries.",
      },
      {
        ...rootsOptions,
        pageText:
          "Classic Cut Fries are frozen potato fries. Potato plants grow roots in soil.",
      },
      {
        ...rootsOptions,
        prospect: {
          ...rootsOptions.prospect,
          domain: "unrelated.example",
          productUrl: "https://unrelated.example/products/classic-cut-fries",
        },
      },
    ]) {
      const unsupported = await buildSyntheticShoppingEvidence(options);
      const result = Proof.projectRound3CopyProof(
        unsupported.evidence,
        unsupported.receipt,
      );
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.message).toContain("Roots absence alias");
    }
    for (const kind of ["missing", "hash", "source", "url"] as const) {
      const changed = structuredClone(input.evidence);
      const source = changed.browser.sources.find(
        (source) => source.kind === "product",
      );
      const raw = changed.browser.raw.find(
        (raw) => source?.artifact === `sha256:${raw.sha256}`,
      );
      if (!source || !raw) throw new Error("Synthetic own-page proof missing");
      if (kind === "missing")
        changed.browser.raw = changed.browser.raw.filter(
          (entry) => entry !== raw,
        );
      if (kind === "hash") raw.body += " ";
      if (kind === "source") source.content += " Roots was born.";
      if (kind === "url") source.url = "https://unrelated.example/product";
      const attempted = {
        ...receipt,
        sources: [changed.answer.source, ...changed.browser.sources],
      };
      expect(Proof.projectRound3CopyProof(changed, attempted).success).toBe(
        false,
      );
      expect(Proof.validateRound3CopyProof(changed, attempted)).not.toBeNull();
    }
  });

  test("complete Roots answer and citation scans veto absence without declaring brand equivalence", async () => {
    const input = await buildSyntheticShoppingEvidence(rootsOptions);
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    const discovery = receipt.discovery;
    if (!discovery) throw new Error("Synthetic discovery missing");
    for (const name of [
      "Roots Farm Fresh",
      "Roots Organic Sweet Potato Fries",
      "Strong Roots Crispy Crinkle Fries",
    ]) {
      const present = await buildSyntheticShoppingCapture({
        ...rootsOptions,
        answerText: `${rootsOptions.answerText}\n\n${"Other choices. ".repeat(1600)}${name} also appears.`,
      });
      expect(present.evidence.answer.source.content).not.toContain(name);
      const replay = Presence.replayShoppingCapture(present.evidence.answer);
      const attempted = {
        ...receipt,
        sources: [
          present.evidence.answer.source,
          ...present.evidence.browser.sources,
        ],
        discovery: {
          ...discovery,
          sourceId: present.evidence.answer.source.id,
          answerHash: replay.answerHash,
          linksHash: replay.linksHash,
        },
      };
      const result = Proof.projectRound3CopyProof(present.evidence, attempted);
      expect(result.success).toBe(false);
      expect(
        Proof.validateRound3CopyProof(present.evidence, attempted),
      ).not.toBeNull();
      if (name.startsWith("Strong Roots")) {
        expect(
          Presence.computeDiscoveryBase(present.evidence).merchantPresent,
        ).toBe(false);
        if (!result.success) {
          expect(result.error.message).toContain("absence is not established");
          expect(result.error.message).toContain(
            "not proof of the same merchant",
          );
        }
      }
    }

    const poll = input.evidence.answer.raw.find((raw) => raw.status === 200);
    if (!poll) throw new Error("Synthetic answer raw missing");
    const response = JSON.parse(poll.body);
    const polled = value(
      await Capture.pollQuery(
        { apiKey: "synthetic", job: input.evidence.answer.job },
        {
          now: () => input.now,
          request: async () => ({
            success: true,
            data: Response.json({
              ...response,
              result: {
                ...response.result,
                citations: [
                  {
                    url: "https://retailer.example/frozen-fries",
                    title: "Frozen fries",
                    snippet: "Roots Organic Sweet Potato Fries",
                  },
                ],
              },
            }),
          }),
        },
      ),
    );
    if (polled.status !== "captured") throw new Error("Synthetic poll failed");
    expect(polled.capture.answer).not.toContain("Roots");
    const replay = Presence.replayShoppingCapture(polled.capture);
    const evidence = { ...input.evidence, answer: polled.capture };
    const attempted = {
      ...receipt,
      sources: [evidence.answer.source, ...evidence.browser.sources],
      discovery: {
        ...discovery,
        answerHash: replay.answerHash,
        linksHash: replay.linksHash,
      },
    };
    const result = Proof.projectRound3CopyProof(evidence, attempted);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.message).toContain("saved answer or cited links");
  });

  test("a Roots short-name hit beyond the saved cited-page projection invalidates old absence proof", async () => {
    const input = await buildSyntheticShoppingEvidence(rootsOptions);
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    const original = JSON.stringify(input);
    const raw = input.evidence.browser.raw.find((entry) =>
      entry.url.endsWith("/execute"),
    );
    if (!raw) throw new Error("Synthetic product raw missing");
    const envelope = JSON.parse(raw.body);
    const url = "https://retailer.example/best-frozen-fries";
    const body = JSON.stringify({
      ...envelope,
      stdout: JSON.stringify({
        ...JSON.parse(envelope.stdout),
        url,
        title: "Frozen fries",
        headings: ["Frozen fries"],
        text: `${"Other choices. ".repeat(1600)}Best Sweet Potato Fries\nRoots Organic Sweet Potato Fries\nThese Roots Organic sweet potato fries are a side dish.`,
      }),
    });
    const citedRaw = { ...raw, body, sha256: digest(body) };
    const projected = Browser.projectBrowserExecution({
      capture: citedRaw,
      url,
      id: "competitor-roots",
      productName: rootsOptions.prospect.product,
      startedAt: citedRaw.receivedAt,
    });
    if (!projected) throw new Error("Synthetic cited page invalid");
    expect(projected.source.content).not.toContain("Roots");
    const evidence = {
      ...input.evidence,
      browser: {
        ...input.evidence.browser,
        raw: [...input.evidence.browser.raw, citedRaw],
        sources: [...input.evidence.browser.sources, projected.source],
      },
    };
    const attempted = {
      ...receipt,
      sources: [evidence.answer.source, ...evidence.browser.sources],
    };
    const result = Proof.projectRound3CopyProof(evidence, attempted);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.message).toContain("saved cited page");
    expect(Proof.validateRound3CopyProof(evidence, attempted)).not.toBeNull();
    expect(JSON.stringify(input)).toBe(original);
  });

  test("the exact Midwinter short name needs its own rendered source and full raw absence", async () => {
    const company =
      "Midwinter Co. Alternative Bridal Rings and Modern Fine Jewelry";
    const input = await synthetic(company, "midwinter.example");
    const original = JSON.stringify({
      evidence: input.evidence,
      receipt: input.receipt,
    });
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    expect(receipt.discovery?.round3CopyProof).toMatchObject({
      fullName: company,
      spokenName: "Midwinter Co.",
      namesAbsent: true,
    });
    expect(Proof.validateRound3CopyProof(input.evidence, receipt)).toBeNull();
    const oldProof = structuredClone(receipt);
    oldProof.discovery!.round3CopyProof!.spokenName = company;
    const oldBytes = JSON.stringify(oldProof);
    expect(
      Proof.validateRound3CopyProof(input.evidence, oldProof),
    ).not.toBeNull();
    expect(JSON.stringify(oldProof)).toBe(oldBytes);
    expect(
      spokenMerchantName({ company: "Another Co. Alternative Rings" }),
    ).toBe("Another Co. Alternative Rings");

    const unsupported = await buildSyntheticShoppingEvidence({
      prospect: input.prospect,
    });
    expect(
      Proof.projectRound3CopyProof(unsupported.evidence, unsupported.receipt)
        .success,
    ).toBe(false);
    for (const name of [company, "Midwinter Co."]) {
      const present = await buildSyntheticShoppingCapture({
        prospect: input.prospect,
        pageText: "Marlow Tote is a large linen bag. Shop Midwinter Co.",
        answerText: `1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.\n\n${"Other choices. ".repeat(1600)}${name} also appears.`,
      });
      expect(present.evidence.answer.source.content).not.toContain(name);
      const replay = Presence.replayShoppingCapture(present.evidence.answer);
      const falseAbsence = {
        ...input.receipt,
        sources: [
          present.evidence.answer.source,
          ...present.evidence.browser.sources,
        ],
        discovery: {
          ...input.receipt.discovery!,
          answerHash: replay.answerHash,
          linksHash: replay.linksHash,
        },
      };
      expect(
        Proof.projectRound3CopyProof(present.evidence, falseAbsence).success,
      ).toBe(false);
    }
    const raw = input.evidence.browser.raw.find((entry) =>
      entry.url.endsWith("/execute"),
    );
    if (!raw) throw new Error("Synthetic product raw missing");
    const envelope = JSON.parse(raw.body);
    const rendered = JSON.parse(envelope.stdout);
    const url = "https://retailer.example/products/another-bag";
    const body = JSON.stringify({
      ...envelope,
      stdout: JSON.stringify({
        ...rendered,
        url,
        title: "Another bag",
        text: `${"Other text. ".repeat(1600)}Shop Midwinter Co.`,
      }),
    });
    const citedRaw = { ...raw, body, sha256: digest(body) };
    const projected = Browser.projectBrowserExecution({
      capture: citedRaw,
      url,
      id: "competitor-midwinter",
      productName: input.prospect.product,
      startedAt: citedRaw.receivedAt,
    });
    if (!projected) throw new Error("Synthetic cited page invalid");
    expect(projected.source.content).not.toContain("Midwinter Co.");
    const evidence = {
      ...input.evidence,
      browser: {
        ...input.evidence.browser,
        raw: [...input.evidence.browser.raw, citedRaw],
        sources: [...input.evidence.browser.sources, projected.source],
      },
    };
    const citedReceipt = {
      ...receipt,
      sources: [evidence.answer.source, ...evidence.browser.sources],
    };
    expect(Proof.projectRound3CopyProof(evidence, citedReceipt).success).toBe(
      false,
    );
    expect(
      Proof.validateRound3CopyProof(evidence, citedReceipt),
    ).not.toBeNull();
    expect(
      JSON.stringify({ evidence: input.evidence, receipt: input.receipt }),
    ).toBe(original);
  });

  test("a short name outside the display projection still blocks absence", async () => {
    const input = await synthetic();
    const changed = await buildSyntheticShoppingEvidence({
      prospect: input.prospect,
      answerText: `1. Canvas Works — Large carry bag.\n2. Harbor Label — Cotton shopper.\n\n${"Other choices. ".repeat(1600)}Peepers also appears.`,
    });
    expect(changed.evidence.answer.source.content).not.toContain("Peepers");
    expect(
      Proof.projectRound3CopyProof(changed.evidence, changed.receipt).success,
    ).toBe(false);
  });

  test("merchant grounding is excluded but a cited raw page must be intact and free of both names", async () => {
    const input = await synthetic();
    const original = JSON.stringify(input.evidence);
    const receipt = value(
      Proof.projectRound3CopyProof(input.evidence, input.receipt),
    );
    expect(receipt.discovery?.round3CopyProof?.citedSources).toEqual([]);
    expect(Proof.validateRound3CopyProof(input.evidence, receipt)).toBeNull();
    const raw = input.evidence.browser.raw.find((entry) =>
      entry.url.endsWith("/execute"),
    );
    if (!raw) throw new Error("Synthetic page missing");
    const envelope = JSON.parse(raw.body);
    const rendered = JSON.parse(envelope.stdout);
    const url = "https://retailer.example/products/another-bag";
    const body = JSON.stringify({
      ...envelope,
      stdout: JSON.stringify({
        ...rendered,
        url,
        title: "Another bag",
        text: `${"Other text. ".repeat(1600)} Peepers supplies this.`,
      }),
    });
    const citedRaw = { ...raw, body, sha256: digest(body) };
    const projected = Browser.projectBrowserExecution({
      capture: citedRaw,
      url,
      id: "competitor-1",
      productName: input.prospect.product,
      startedAt: citedRaw.receivedAt,
    });
    if (!projected) throw new Error("Synthetic cited page invalid");
    expect(projected.source.content).not.toContain("Peepers");
    const evidence = {
      ...input.evidence,
      browser: {
        ...input.evidence.browser,
        raw: [...input.evidence.browser.raw, citedRaw],
        sources: [...input.evidence.browser.sources, projected.source],
      },
    };
    const citedReceipt = {
      ...input.receipt,
      sources: [evidence.answer.source, ...evidence.browser.sources],
    };
    const refused = Proof.projectRound3CopyProof(evidence, citedReceipt);
    expect(refused.success).toBe(false);
    if (!refused.success)
      expect(refused.error.message).toContain("saved cited page");
    const tampered = structuredClone(receipt);
    const copyProof = tampered.discovery?.round3CopyProof;
    if (!copyProof) throw new Error("Synthetic copy proof is missing.");
    copyProof.spokenName = "Unrelated";
    expect(
      Proof.validateRound3CopyProof(input.evidence, tampered),
    ).not.toBeNull();
    expect(JSON.stringify(input.evidence)).toBe(original);
  });
});
