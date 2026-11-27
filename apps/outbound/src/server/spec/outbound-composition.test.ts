import { describe, expect, test } from "bun:test";
import { countWords, deliveredBody } from "@/lib/outbound";
import {
  assembleSequence,
  canonicalSequenceInput,
  FOLLOWUP_BUMP,
  isCurrentWritingSnapshot,
  LEGACY_WRITING_CONTRACT_VERSION,
  preflightWriterAssembly,
  renderLinkedInResult,
  storedWriterPartsSchema,
  WRITING_CONTRACT_VERSION,
  writerPartsSchema,
  writingSnapshotSchema,
} from "@/lib/outbound-composition";
import { deterministicCopyIssues } from "@/lib/outbound-copy-quality";
import { PROPOSED_REBUILD_PLAYBOOK } from "@/lib/outbound-rebuild-policy";
import { validateShoppingResearch } from "@/lib/outbound-shopping-research";
import {
  approvedRelevanceVariants,
  compositionPrompt,
  deriveWriterNarrative,
  validateWriterParts,
} from "@/lib/outbound-writing";
import { writerFixture } from "./helpers/outbound-writer-fixture";

const issuesFor = (
  fixture: ReturnType<typeof writerFixture>,
  parts = fixture.parts,
) => validateWriterParts({ ...fixture, playbook: fixture.policy, parts });

describe("observed facts and writer-owned narrative", () => {
  test("the canonical synthetic absence fixture passes evidence structure and copy checks", () => {
    const fixture = writerFixture();
    expect(validateShoppingResearch(fixture.receipt, 7)).toBeNull();
    expect(issuesFor(fixture)).toEqual([]);
    expect(
      deriveWriterNarrative(
        fixture.parts.opening,
        fixture.receipt.queries[0]!.query,
      ),
    ).toMatchObject({ relationship: "sister", occasion: null });
    const prompt = compositionPrompt({ ...fixture, playbook: fixture.policy });
    expect(prompt.instructions).toContain("untrusted data");
    expect(prompt.prompt).toContain(fixture.prospect.title);
    expect(prompt.prompt).toContain(fixture.policy.humanizerNotes);
  });

  test("ordinary sender-side narration is not an observed-fact vocabulary", () => {
    const fixture = writerFixture();
    const query = fixture.receipt.queries[0]!.query;
    for (const setup of [
      "My sister needed a pair of bags",
      "I was putting a gift together",
      "I wanted gift ideas",
      "My friend Ava was planning a picnic",
      "I was looking for a present in Milan",
      "I was embroidering and thinking about bags",
      "I was picking out a dance competition gift",
      "I wanted a recital gift",
      "I was out looking for a tote",
    ])
      expect(
        issuesFor(fixture, {
          ...fixture.parts,
          opening: `${setup}, so I asked for "${query}".`,
        }),
      ).toEqual([]);
  });

  test("opening permits narrative but holds factual assertions, price, use, test and recipient claims", () => {
    const fixture = writerFixture();
    const query = fixture.receipt.queries[0]!.query;
    for (const setup of [
      "The tote is waterproof",
      "It contains linen",
      "The tote costs $36",
      "I bought a tote",
      "I used this tote",
      "I tested a tote",
      "I tried this tote",
      "Your sister wanted a tote",
      "You needed a gift",
      "The tote has UV400 protection",
    ])
      expect(
        issuesFor(fixture, {
          ...fixture.parts,
          opening: `${setup}, so I asked for "${query}".`,
        }).length,
      ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        opening: `${"I was picking a tote and ".repeat(4)}asked for "${query}".`,
      }),
    ).toContain("opening: exceeds 22 words.");
    for (const opening of [
      'I asked for "another query".',
      `I asked for ${query}.`,
      `I asked for "${query}" and "${query}".`,
    ])
      expect(issuesFor(fixture, { ...fixture.parts, opening })).toContain(
        "opening: quote the exact query once.",
      );
    fixture.receipt.queries[0]!.surface = "Google Search";
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        opening: `I asked Google AI Mode for "${query}".`,
      }),
    ).toContain("The copy names a search surface that was not used.");
  });

  test("ordinary relationships and occasions retain ten-email variety checks", () => {
    const fixture = writerFixture();
    const query = fixture.receipt.queries[0]!.query;
    for (const occasion of ["dance competition", "recital"]) {
      const opening = `Picking out a ${occasion} gift, I asked Google AI Mode for "${query}".`;
      const parts = { ...fixture.parts, opening };
      expect(issuesFor(fixture, parts)).toEqual([]);
      expect(deriveWriterNarrative(opening, query).occasion).toBe(occasion);
      expect(
        validateWriterParts({
          ...fixture,
          playbook: fixture.policy,
          parts,
          peers: [
            {
              opening: `I wanted a ${occasion} gift, so I asked for "other query".`,
              relationship: null,
              occasion,
            },
          ],
        }),
      ).toContain("opening: this occasion was already used within ten emails.");
      expect(
        issuesFor(fixture, {
          ...parts,
          result: `Alder and Birch were listed for the ${occasion}. Sample Goods didn't come up.`,
        }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      deriveWriterNarrative('I asked for "dance competition gift".').occasion,
    ).toBeNull();
  });

  test("writer input omits surrounding proof and unapproved discovery details", () => {
    const fixture = writerFixture();
    const query = fixture.receipt.queries[0];
    const discovery = fixture.receipt.discovery;
    if (!query?.basis || !discovery)
      throw new Error("Missing synthetic query and discovery.");
    const unrelated = "UNSELECTED_SOURCE_FACTS UV400 protection costs $999.";
    query.basis.excerpts = [
      { id: "extra-proof", sourceId: "product", quote: unrelated },
    ];
    query.coverage = unrelated;
    discovery.description = unrelated;
    discovery.matchedAliases = [unrelated];
    discovery.correctnessProof = {
      answerQuoteId: "answer-excerpt",
      productQuoteId: "extra-proof",
      answerText: unrelated,
      pageText: unrelated,
    };
    for (const source of fixture.receipt.sources) source.content = unrelated;
    fixture.receipt.claims = fixture.receipt.claims?.filter(
      (claim) => claim.kind !== "price",
    );
    discovery.listed.push({
      name: "Unapproved Brand",
      kind: "retailer",
      position: 3,
      price: "$999",
      excerptIds: ["answer-excerpt"],
    });
    const before = structuredClone(fixture.receipt);
    const prompt = compositionPrompt({ ...fixture, playbook: fixture.policy });
    const input = JSON.parse(prompt.prompt);
    expect(input.observedQuery).toEqual({
      query: query.query,
      surface: query.surface,
      market: query.market,
      interfaceLocale: query.interfaceLocale,
      intent: query.intent,
      basis: {
        category: query.basis.category,
        attribute: query.basis.attribute,
      },
    });
    expect(input.ledger).toEqual(
      fixture.receipt.claims?.filter((claim) => claim.kind !== "name"),
    );
    expect(input.discovery.listed).toEqual([
      { name: "Alder", kind: "brand", position: 1, price: null },
      { name: "Birch", kind: "brand", position: 2, price: null },
    ]);
    expect(input.discovery).not.toHaveProperty("description");
    expect(input.discovery).not.toHaveProperty("correctnessProof");
    expect(prompt.prompt).not.toContain("UNSELECTED_SOURCE_FACTS");
    expect(prompt.prompt).not.toContain("UV400");
    expect(prompt.prompt).not.toContain("$999");
    expect(prompt.prompt).not.toContain("Unapproved Brand");
    expect(prompt.prompt).not.toContain("around $36");
    expect(fixture.receipt).toEqual(before);
  });

  test("writer input keeps observed rank, price qualifiers and concrete repair feedback", () => {
    const fixture = writerFixture(true);
    const previous = {
      parts: { ...fixture.parts, result: "Alder was $30." },
      issues: ["result: a price is not in the observed ledger."],
    };
    const prompt = compositionPrompt({
      ...fixture,
      playbook: fixture.policy,
      previous,
    });
    const input = JSON.parse(prompt.prompt);
    expect(input.discovery).toMatchObject({
      merchantPresent: true,
      merchantPosition: 5,
      totalListed: 6,
      listed: [
        { name: "Alder", position: 1, price: null },
        { name: "Birch", position: 2, price: null },
      ],
    });
    expect(input.previous).toEqual(previous);
    expect(prompt.instructions).toContain(
      "Prices are unavailable unless the ledger contains the exact price claim",
    );
    const price = fixture.receipt.claims?.find(
      (claim) => claim.kind === "price",
    );
    if (!price) throw new Error("Missing synthetic price.");
    price.sourceIds = ["product"];
    const pageOnly = JSON.parse(
      compositionPrompt({ ...fixture, playbook: fixture.policy }).prompt,
    );
    expect(pageOnly.discovery.listed[0].price).toBeNull();
  });

  test("comparison and page-data prompts attribute opaque ledger sources without exposing proof", () => {
    const fixture = writerFixture();
    const price = fixture.receipt.claims?.find(
      (claim) => claim.kind === "price",
    );
    if (!price) throw new Error("Missing synthetic answer price.");
    fixture.receipt.claims?.push({
      ...price,
      id: "page-price",
      value: "$41",
      qualifiers: [],
      sourceIds: ["product"],
      excerptIds: ["page-excerpt"],
      queryIndex: null,
    });
    const opaqueId = (id: string) =>
      id === "answer" ? "opaque-1" : id === "product" ? "opaque-2" : id;
    for (const source of fixture.receipt.sources) {
      source.id = opaqueId(source.id);
      source.content = "UNAPPROVED_PROOF UV400 at $999";
      source.url = "https://unapproved-source.test/proof";
    }
    for (const claim of fixture.receipt.claims ?? [])
      claim.sourceIds = claim.sourceIds.map(opaqueId);
    if (fixture.receipt.discovery)
      fixture.receipt.discovery.sourceId = "opaque-1";
    for (const kind of ["query-comparison", "product-data-gap"] as const) {
      fixture.receipt.selected.kind = kind;
      const prompt = compositionPrompt({
        ...fixture,
        playbook: fixture.policy,
      });
      const input = JSON.parse(prompt.prompt);
      expect(input.ledgerSources).toEqual([
        { id: "opaque-1", kind: "search" },
        { id: "opaque-2", kind: "product" },
      ]);
      expect(input.ledger).toEqual(fixture.receipt.claims);
      expect(prompt.instructions).toContain(
        "search means the captured shopping answer; product means the merchant's product page",
      );
      expect(prompt.prompt).not.toContain("UNAPPROVED_PROOF");
      expect(prompt.prompt).not.toContain("unapproved-source.test");
      expect(prompt.prompt).not.toContain("$999");
      expect(
        input.ledgerSources.some(({ id }: { id: string }) => id === "ucp"),
      ).toBe(false);
    }
  });

  test("verified answer-scoping phrases do not authorize new factual words", () => {
    const fixture = writerFixture();
    for (const result of [
      "When I asked, it picked Alder and Birch. Sample Goods didn't come up in that answer.",
      "That answer picked Alder and Birch. Sample Goods didn't come up in the captured answer.",
    ])
      expect(issuesFor(fixture, { ...fixture.parts, result })).toEqual([]);
    for (const result of [
      "I captured Alder and Birch. Sample Goods didn't come up.",
      "It picked Alder and Birch. Sample Goods didn't come up in the guaranteed answer.",
      "When I asked, it picked InventedCo and Birch. Sample Goods didn't come up.",
      "When I asked, it picked Alder before Birch at $42. Sample Goods didn't come up.",
    ])
      expect(
        issuesFor(fixture, { ...fixture.parts, result }).length,
      ).toBeGreaterThan(0);
    fixture.receipt.queries[0]!.status = "blocked";
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result:
          "When I asked, it picked Alder and Birch. Sample Goods didn't come up in the captured answer.",
      }).length,
    ).toBeGreaterThan(0);
  });

  test("subject es-plurals remain tied to an exact researched category", () => {
    const fixture = writerFixture();
    fixture.receipt.queries[0]!.query = "gift box sweet and savory snacks";
    fixture.receipt.queries[0]!.basis!.category = "gift box";
    const parts = {
      ...fixture.parts,
      opening:
        'I wanted a host present, so I asked for "gift box sweet and savory snacks".',
    };
    const queryClaim = fixture.receipt.claims!.find(
      (claim) => claim.kind === "query",
    )!;
    queryClaim.value = fixture.receipt.queries[0]!.query;
    for (const subject of ["gift snack boxes", "snack gift boxes"])
      expect(issuesFor(fixture, { ...parts, subject })).toEqual([]);
    for (const subject of [
      "gift designer boxes",
      "gift snack foxes",
      "gift snack boxen",
    ])
      expect(issuesFor(fixture, { ...parts, subject })).toContain(
        "subject: the topic must come from the researched category or query.",
      );
  });

  test("invented brands and obsolete writer follow-up fields are rejected", () => {
    const fixture = writerFixture();
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "It picked Cedar and Birch. Sample Goods didn't come up.",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      validateWriterParts({
        ...fixture,
        playbook: fixture.policy,
        parts: {
          ...fixture.parts,
          ...{ followupFact: "Alder was around $36." },
        },
      }),
    ).toEqual(["The writer output does not match the four-part contract."]);
  });

  test("brand-only absence does not borrow price or product details from the raw list", () => {
    const fixture = writerFixture();
    for (const result of [
      "It picked Alder at around $36 and Birch. Sample Goods didn't come up.",
      "It picked Alder at $30 and Birch. Sample Goods didn't come up.",
      "It picked Alder and Birch with UV400 protection. Sample Goods didn't come up.",
    ])
      expect(
        issuesFor(fixture, { ...fixture.parts, result }).length,
      ).toBeGreaterThan(0);
  });

  test("numeric ordinals and listed order remain bound to the merchant", () => {
    const fixture = writerFixture(true);
    expect(validateShoppingResearch(fixture.receipt, 7)).toBeNull();
    expect(issuesFor(fixture)).toEqual([]);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: fixture.parts.result.replace("5th", "1st"),
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: fixture.parts.result.replace("of 6", "of 8"),
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "Sample Goods came up 5th of 6, before Alder and Birch.",
      }).length,
    ).toBeGreaterThan(0);
    const absence = writerFixture();
    expect(
      issuesFor(absence, {
        ...absence.parts,
        result: "It picked Birch and Alder. Sample Goods didn't come up.",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(absence, {
        ...absence.parts,
        result: "Birch didn't come up. It picked Sample Goods.",
      }).length,
    ).toBeGreaterThan(0);
  });

  test("quoted brands retain their observed order", () => {
    const fixture = writerFixture();
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: 'It picked "Alder" and "Birch". Sample Goods didn\'t come up.',
      }),
    ).toEqual([]);
    const parts = {
      ...fixture.parts,
      result: 'It picked "Birch" and "Alder". Sample Goods didn\'t come up.',
    };
    expect(issuesFor(fixture, parts)).toContain(
      "result: named results were reordered.",
    );
    const assembled = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      parts,
    );
    if (assembled.status !== "ready") throw new Error(assembled.reason);
    expect(
      deterministicCopyIssues({
        ...fixture,
        playbook: fixture.policy,
        parts,
        messages: assembled.messages,
      }),
    ).toContain("result: named results were reordered.");
  });

  test("comparison qualifiers stay bound to their answer or page source", () => {
    const fixture = writerFixture();
    const claims = fixture.receipt.claims;
    const price = claims?.find((claim) => claim.kind === "price");
    if (!claims || !price) throw new Error("Missing synthetic price claims.");
    fixture.receipt.selected.kind = "query-comparison";
    claims.push({
      ...price,
      id: "page-price",
      value: "$36",
      qualifiers: [],
      sourceIds: ["product"],
      excerptIds: ["page-excerpt"],
      queryIndex: null,
    });
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "The answer listed $36. Your page showed around $36.",
      }).some((issue) => /qualifier/.test(issue)),
    ).toBe(true);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "The answer listed around $36. Your page showed $36.",
      }),
    ).toEqual([]);
  });

  test("business-loss claims and two product attributes cannot replace relevance", () => {
    const fixture = writerFixture();
    for (const relevance of [
      "You're losing sales because AI can't see your store.",
      "Your store is invisible.",
      "This means 20% more revenue.",
    ])
      expect(
        issuesFor(fixture, { ...fixture.parts, relevance }).some((issue) =>
          /forbidden|unmeasured/i.test(issue),
        ),
      ).toBe(true);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "It picked Alder. Your large, washable tote didn't come up.",
      }).some((issue) => /attribute/i.test(issue)),
    ).toBe(true);
    expect(
      issuesFor(
        {
          ...fixture,
          policy: {
            ...fixture.policy,
            relevanceLines: ["Your washable tote matters here."],
          },
        },
        { ...fixture.parts, relevance: "Your washable tote matters here." },
      ).some((issue) => /attribute/i.test(issue)),
    ).toBe(true);
  });

  test("relevance defaults to new customers and gift variants require an actual gift product", () => {
    const fixture = writerFixture();
    fixture.policy.relevanceLines = [
      ...PROPOSED_REBUILD_PLAYBOOK.relevanceLines,
    ];
    const normal = "That's the kind of search a new customer starts with.";
    expect(
      approvedRelevanceVariants({ ...fixture, playbook: fixture.policy }),
    ).toEqual([normal]);
    expect(issuesFor(fixture, { ...fixture.parts, relevance: normal })).toEqual(
      [],
    );
    const query = fixture.receipt.queries[0]!;
    const pasted = `They just ask for ${query.query}.`;
    fixture.policy.relevanceLines.push(pasted);
    expect(
      issuesFor(fixture, { ...fixture.parts, relevance: pasted }),
    ).toContain(
      "relevance: never paste the search query into the reason to care.",
    );
    query.basis!.category = "snack gift box";
    fixture.receipt.product.name = fixture.prospect.product =
      "Festive Snack Gift Box";
    const gift =
      "Gift shoppers usually don't know your name yet. They just ask for a snack gift box.";
    expect(
      approvedRelevanceVariants({ ...fixture, playbook: fixture.policy }),
    ).toContain(gift);
    expect(issuesFor(fixture, { ...fixture.parts, relevance: gift })).toEqual(
      [],
    );
    query.basis!.category = query.query;
    expect(
      approvedRelevanceVariants({ ...fixture, playbook: fixture.policy }),
    ).not.toContain(gift);
  });

  test("narrative stays in the opening and repeated relationships are held", () => {
    const fixture = writerFixture();
    const before = JSON.stringify({
      receipt: fixture.receipt,
      prospect: fixture.prospect,
    });
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "My sister saw Alder. Sample Goods didn't come up.",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      validateWriterParts({
        ...fixture,
        playbook: fixture.policy,
        peers: [
          {
            opening: 'My sister asked for "other bag ideas".',
            relationship: "sister",
            occasion: null,
          },
        ],
      }).some((issue) => /relationship/i.test(issue)),
    ).toBe(true);
    expect(
      JSON.stringify({ receipt: fixture.receipt, prospect: fixture.prospect }),
    ).toBe(before);
    expect(fixture.prospect.personalLine).toBe("");
    expect(
      fixture.receipt.claims?.every((claim) => claim.type === "observed"),
    ).toBe(true);
  });
});

describe("sequence assembly and real word budgets", () => {
  test("LinkedIn reuses the reviewed result and cannot render an author's biography", () => {
    const fixture = writerFixture();
    expect(
      renderLinkedInResult(fixture.prospect, fixture.policy, fixture.parts),
    ).toEqual({
      status: "ready",
      text: `Hi Jamie, ${fixture.parts.result} Would be good to connect.`,
    });
    for (const linkedinTemplate of [
      "Hi {first}, {founderLine} {result}",
      "Hi {first}, {finding}",
      "Hi {first}, {result} {result}",
    ]) {
      expect(
        renderLinkedInResult(
          fixture.prospect,
          { ...fixture.policy, linkedinTemplate },
          fixture.parts,
        ).status,
      ).toBe("held");
    }
  });
  test("fixed sender paragraphs and day 3/7 thread bumps are exact", () => {
    const fixture = writerFixture();
    const result = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      fixture.parts,
    );
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error(result.reason);
    expect(countWords(result.messages[0]!.body)).toBeLessThanOrEqual(99);
    expect(result.messages[0]!.body).toContain(
      `${fixture.policy.productCheckIntro} ${fixture.policy.callToAction}`,
    );
    expect(result.messages[1]!.body).toBe(FOLLOWUP_BUMP);
    expect(result.messages[2]!.body).toBe(
      fixture.policy.followupTwoTemplate
        .replace("{first}", "Jamie")
        .replace("{optout}", fixture.policy.optout)
        .replace("{signature}", "Juri"),
    );
    expect(result.messages.map(({ afterDays }) => afterDays)).toEqual([
      0, 3, 7,
    ]);
    expect(result.linkedin).toBe(
      `Hi Jamie, ${fixture.parts.result} Would be good to connect.`,
    );
  });

  test("bumps quote the immutable original email and missing first name uses the fixed fallback", () => {
    const fixture = writerFixture();
    const assembled = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      fixture.parts,
    );
    if (assembled.status !== "ready") throw new Error(assembled.reason);
    const original = {
      ...assembled.messages[0]!,
      body: `${assembled.messages[0]!.body}\n\nOriginal saved detail.`,
    };
    for (const bump of assembled.messages.slice(1)) {
      const delivered = deliveredBody(bump, original, "12 Example Lane");
      expect(delivered).toBe(
        `${bump.body}\n\n${`${original.body}\n\n12 Example Lane`
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}`,
      );
      expect(delivered).toContain(`> ${fixture.policy.optout}`);
      expect(delivered).toContain("> 12 Example Lane");
    }
    const fallback = assembleSequence(
      { ...fixture.prospect, first: "" },
      fixture.receipt,
      {
        ...fixture.policy,
        bodyTemplate: fixture.policy.bodyTemplate.replace(
          "Hey {first}!",
          "Hello!",
        ),
        linkedinTemplate: "{result}",
      },
      fixture.parts,
    );
    if (fallback.status !== "ready") throw new Error(fallback.reason);
    expect(fallback.messages[2]!.body).toBe("Worth a chat?");
  });

  test("historical five-part snapshots retain their data and canonical version but are never new writer output", () => {
    const fixture = writerFixture();
    const parts = {
      ...fixture.parts,
      followupFact: "A historical unused fact.",
    };
    expect(writerPartsSchema.safeParse(parts).success).toBe(false);
    expect(storedWriterPartsSchema.parse(parts)).toEqual(parts);
    const historical = writingSnapshotSchema.parse({
      version: LEGACY_WRITING_CONTRACT_VERSION,
      writingPolicyHash: "a".repeat(64),
      receiptHash: "b".repeat(64),
      contentHash: "c".repeat(64),
      revision: 2,
      generatedAt: new Date().toISOString(),
      parts,
      queryTopic: parts.subject,
      narrative: { relationship: "sister", occasion: null },
      quality: null,
    });
    expect(isCurrentWritingSnapshot(historical)).toBe(false);
    const assembled = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      fixture.parts,
    );
    if (assembled.status !== "ready") throw new Error(assembled.reason);
    const messages = assembled.messages.map((message) =>
      message.step === 1 ? { ...message, writing: historical } : message,
    );
    const canonical = canonicalSequenceInput(messages);
    if (canonical.status !== "ready") throw new Error(canonical.reason);
    expect(JSON.parse(canonical.canonicalText).version).toBe(
      LEGACY_WRITING_CONTRACT_VERSION,
    );
    expect(JSON.parse(assembled.canonicalText).version).toBe(
      WRITING_CONTRACT_VERSION,
    );
    expect(historical.parts).toEqual(parts);
    expect(
      writingSnapshotSchema.safeParse({
        ...historical,
        version: WRITING_CONTRACT_VERSION,
      }).success,
    ).toBe(false);
  });

  test("actual fixed text leaves at least forty words even with long names and products", () => {
    const fixture = writerFixture();
    const base = preflightWriterAssembly(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
    );
    expect(base.status).toBe("ready");
    if (base.status !== "ready") throw new Error(base.reason);
    const exactly = preflightWriterAssembly(fixture.prospect, fixture.receipt, {
      ...fixture.policy,
      maxBodyWords: base.budget.fixedWords + 40,
    });
    expect(exactly.status).toBe("ready");
    if (exactly.status !== "ready") throw new Error(exactly.reason);
    expect(exactly.budget.availableWords).toBe(40);
    expect(
      preflightWriterAssembly(fixture.prospect, fixture.receipt, {
        ...fixture.policy,
        maxBodyWords: base.budget.fixedWords + 39,
      }).status,
    ).toBe("held");
    const long = {
      ...fixture.prospect,
      first:
        "Alexandria Maria Ana Catherine Louise Victoria Rose Grace Jane Marie Anne Elizabeth Amelia Charlotte Sophia",
      product:
        "A wonderfully detailed large reusable washable linen canvas everyday family shopping tote bag for gifts and special occasions throughout every season of the year",
    };
    const longBudget = preflightWriterAssembly(
      long,
      {
        ...fixture.receipt,
        product: { ...fixture.receipt.product, name: long.product },
      },
      {
        ...fixture.policy,
        bodyTemplate: fixture.policy.bodyTemplate.replace(
          "{opening}",
          "{product}\n\n{opening}",
        ),
      },
    );
    expect(longBudget.status).toBe("held");
    if (longBudget.status === "held")
      expect(longBudget.reason).toContain("fewer than 40");
  });

  test("missing variables and empty identities hold without inserting blanks", () => {
    const fixture = writerFixture();
    expect(
      preflightWriterAssembly(
        { ...fixture.prospect, first: "" },
        fixture.receipt,
        fixture.policy,
      ).status,
    ).toBe("held");
    for (const bodyTemplate of [
      fixture.policy.bodyTemplate.replace("{relevance}", ""),
      fixture.policy.bodyTemplate.replace("{opening}", "{legacyOpening}"),
      fixture.policy.bodyTemplate.replace("{opening}", "{opening"),
    ])
      expect(
        assembleSequence(
          fixture.prospect,
          fixture.receipt,
          { ...fixture.policy, bodyTemplate },
          fixture.parts,
        ).status,
      ).toBe("held");
  });

  test("canonical sequence preserves visible text and rejects HTML or control characters", () => {
    const fixture = writerFixture();
    const result = assembleSequence(
      fixture.prospect,
      fixture.receipt,
      fixture.policy,
      fixture.parts,
    );
    if (result.status !== "ready") throw new Error(result.reason);
    const crlf = canonicalSequenceInput(
      result.messages.map((message) => ({
        ...message,
        body: message.body.replaceAll("\n", "\r\n"),
      })),
    );
    expect(crlf).toEqual({
      status: "ready",
      canonicalText: result.canonicalText,
    });
    const changed = canonicalSequenceInput(
      result.messages.map((message) => ({
        ...message,
        body: `${message.body} `,
      })),
    );
    expect(
      changed.status === "ready" &&
        changed.canonicalText === result.canonicalText,
    ).toBe(false);
    for (const insertion of ["<strong>Hello</strong>", "hidden\u200btext"])
      expect(
        canonicalSequenceInput(
          result.messages.map((message) => ({
            ...message,
            body: `${message.body}\n${insertion}`,
          })),
        ).status,
      ).toBe("held");
    expect(canonicalSequenceInput([...result.messages].reverse()).status).toBe(
      "held",
    );
  });
});
