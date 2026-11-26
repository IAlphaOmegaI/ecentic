import { describe, expect, test } from "bun:test";
import { countWords } from "@/lib/outbound";
import {
  assembleSequence,
  canonicalSequenceInput,
  FOLLOWUP_BUMP,
  preflightWriterAssembly,
  renderLinkedInResult,
} from "@/lib/outbound-composition";
import { deterministicCopyIssues } from "@/lib/outbound-copy-quality";
import { validateShoppingResearch } from "@/lib/outbound-shopping-research";
import {
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

  test("an added brand or changed quote is rejected in either first result or follow-up", () => {
    const fixture = writerFixture();
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "It picked Cedar and Birch. Sample Goods didn't come up.",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        followupFact: "Cedar was around $36.",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        opening:
          'My sister needed a bag, so I asked for "cheap tote gift ideas".',
      }).length,
    ).toBeGreaterThan(0);
  });

  test("the observed price retains its amount and approximation", () => {
    const fixture = writerFixture();
    const result =
      "It picked Alder at around $36. Sample Goods didn't come up.";
    expect(issuesFor(fixture, { ...fixture.parts, result })).toEqual([]);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: result.replace("$36", "$30"),
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: result.replace("around ", ""),
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: result.replace("Alder", "Birch"),
      }).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        followupFact: "Alder was around $36.",
      }),
    ).toEqual([]);
    expect(
      issuesFor(fixture, { ...fixture.parts, followupFact: "Alder was $36." })
        .length,
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

  test("quoted names and prices retain their observed order and owner", () => {
    const fixture = writerFixture();
    for (const [result, expected] of [
      [
        'It picked "Birch" and "Alder". Sample Goods didn\'t come up.',
        /reordered/,
      ],
      [
        'It picked Birch at "around $36". Sample Goods didn\'t come up.',
        /price belongs/,
      ],
    ] as const) {
      const parts = { ...fixture.parts, result };
      expect(
        issuesFor(fixture, parts).some((issue) => expected.test(issue)),
      ).toBe(true);
      const assembled = assembleSequence(
        fixture.prospect,
        fixture.receipt,
        fixture.policy,
        parts,
      );
      expect(assembled.status).toBe("ready");
      if (assembled.status !== "ready") continue;
      expect(
        deterministicCopyIssues({
          ...fixture,
          playbook: fixture.policy,
          parts,
          messages: assembled.messages,
        }).some((issue) => expected.test(issue)),
      ).toBe(true);
    }
    for (const result of [
      'It picked "Alder" and "Birch". Sample Goods didn\'t come up.',
      'It picked Alder at "around $36". Sample Goods didn\'t come up.',
    ])
      expect(issuesFor(fixture, { ...fixture.parts, result })).toEqual([]);
  });

  test("an identical amount on another result cannot remove a captured qualifier", () => {
    const fixture = writerFixture();
    const claims = fixture.receipt.claims;
    const birch = fixture.receipt.discovery?.listed[1];
    const price = claims?.find((claim) => claim.kind === "price");
    if (!claims || !birch || !price)
      throw new Error("Missing synthetic prices.");
    birch.price = "$36";
    claims.push({ ...price, id: "birch-price", value: "$36", qualifiers: [] });
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result: "It picked Alder at $36. Sample Goods didn't come up.",
      }).some((issue) => /qualifier/.test(issue)),
    ).toBe(true);
    for (const result of [
      "It picked Alder at around $36. Sample Goods didn't come up.",
      "It picked Birch at $36. Sample Goods didn't come up.",
    ])
      expect(issuesFor(fixture, { ...fixture.parts, result })).toEqual([]);

    birch.price = "around $42";
    const birchPrice = claims.find((claim) => claim.id === "birch-price");
    if (!birchPrice) throw new Error("Missing synthetic second price.");
    birchPrice.value = "around $42";
    birchPrice.qualifiers = ["around"];
    expect(
      issuesFor(fixture, {
        ...fixture.parts,
        result:
          "It picked Alder at around $36 and Birch at $42. Sample Goods didn't come up.",
      }).some((issue) => /qualifier/.test(issue)),
    ).toBe(true);
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
  test("fixed sender paragraphs and empty-fact bump are exact", () => {
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
    expect(result.messages[1]!.body).toBe(
      `Hey Jamie,\n\n${FOLLOWUP_BUMP} Worth a quick chat?\n\n${fixture.policy.optout}\n\nJuri`,
    );
    expect(result.messages[2]!.body).toBe(
      fixture.policy.followupTwoTemplate
        .replace("{first}", "Jamie")
        .replace("{optout}", fixture.policy.optout)
        .replace("{signature}", "Juri"),
    );
    expect(result.linkedin).toBe(
      `Hi Jamie, ${fixture.parts.result} Would be good to connect.`,
    );
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
