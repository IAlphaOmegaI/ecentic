import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import type { AiCapture } from "@/server/utils/outbound/live-shopping-contract";

mock.module("server-only", () => ({}));
const Shopping = await import("@/server/utils/outbound/live-shopping");
const time = Date.parse("2026-11-19T18:00:00Z");
const timestamp = new Date(time).toISOString();
const merchant = { name: "Só Dança", domain: "merchant.example", aliases: [] };
const product = {
  name: "Trail Tote",
  url: "https://merchant.example/products/trail-tote",
};

/** Synthetic raw provider responses only; no request reaches a provider. */
const observed = async (
  text: string,
  citations: Record<string, string>[] = [],
): Promise<AiCapture> => {
  const prepared = Shopping.prepareQuery({
    product,
    category: "reusable totes",
    country: "US",
  });
  if (!prepared.success) throw prepared.error;
  const job = {
    id: "ce1da6e5-1249-4bd4-8463-1937688c63d3",
    query: { ...prepared.data, merchant },
    submittedAt: timestamp,
  };
  const result = await Shopping.pollQuery(
    { apiKey: "synthetic-presence-only", job },
    {
      now: () => time,
      request: async () => ({
        success: true,
        data: Response.json({
          job_id: job.id,
          status: "done",
          scraper: "google_ai_mode",
          prompt: job.query.prompt,
          country: "US",
          completed_at: timestamp,
          result: {
            scraper: "google_ai_mode",
            status: "done",
            cached: false,
            result_markdown: text,
            result: "A retailer offers a bag.",
            citations,
          },
        }),
      }),
    },
  );
  if (!result.success) throw result.error;
  if (result.data.status !== "captured")
    throw new Error("Expected a complete synthetic capture.");
  return result.data.capture;
};

describe("full-answer HTML entity presence", () => {
  test("encoded card titles and sellers veto absence without changing raw proof", async () => {
    for (const text of [
      '<a href="https://retailer.example/item">S&oacute; Dan&ccedil;a Tote</a>',
      "<div>Another Tote</div><div>S&oacute; Dan&ccedil;a</div>",
    ]) {
      const answer = await observed(text);
      const saved = JSON.stringify(answer);
      const base = Shopping.computeDiscoveryBase({ answer }, time);
      expect(base.completeness.status).toBe("complete");
      expect(base.merchantPresent).toBe(true);
      expect(base.matchedAliases).toContain(merchant.name);
      expect(base.answerHash).toBe(
        createHash("sha256").update(text).digest("hex"),
      );
      expect(base.checkedAt).toBe(timestamp);
      expect(Shopping.replayShoppingCapture(answer, time).answerText).toBe(
        text,
      );
      expect(JSON.stringify(answer)).toBe(saved);
    }
  });

  test("all raw citation titles, snippets and URLs use the same decoding", async () => {
    for (const field of ["title", "snippet", "url"]) {
      const encoded =
        field === "url"
          ? "https://redirect.example/?merchant=S&oacute;%20Dan&ccedil;a"
          : "S&oacute; Dan&ccedil;a";
      const citations = Array.from({ length: 50 }, (_, index) => ({
        url: `https://retailer.example/item/${index}`,
        title: "Another offer",
      }));
      const answer = await observed("Here are some available bags.", [
        ...citations,
        { url: "https://retailer.example/final", [field]: encoded },
      ]);
      expect(answer.links).toHaveLength(50);
      const base = Shopping.computeDiscoveryBase({ answer }, time);
      expect(base.merchantPresent).toBe(true);
      expect(base.matchedAliases).toContain(merchant.name);
    }
  });

  test("entity normalization includes numeric references and product aliases with boundaries", () => {
    for (const text of [
      "S&#243; Dan&#231;a",
      "S&#xF3; Dan&#xE7;a",
      "S%26oacute%3B%20Dan%26ccedil%3Ba",
    ])
      expect(Shopping.matchMerchantText(text, merchant, product)).toContain(
        merchant.name,
      );
    expect(
      Shopping.matchMerchantText(
        "S&oacute; Dan&ccedil;aria",
        merchant,
        product,
      ),
    ).toEqual([]);
    expect(
      Shopping.matchMerchantText('<img alt="Caf&eacute; Carry"/>', merchant, {
        ...product,
        aliases: ["Café Carry"],
      }),
    ).toContain("Café Carry");
    expect(
      Shopping.matchMerchantText(
        '<a href="https://shop.merchant&#46;example/item">Another bag</a>',
        merchant,
        product,
      ),
    ).toContain(merchant.domain);
  });

  test("literal, encoded ampersands and the word and normalize consistently", () => {
    for (const name of ["Dune & Cove", "Dune and Cove", "Dune &amp; Cove"])
      for (const text of [
        "Dune & Cove",
        "Dune &amp; Cove",
        "Dune &#38; Cove",
        "Dune &#x26; Cove",
        "Dune and Cove",
      ])
        expect(
          Shopping.matchMerchantText(text, { ...merchant, name }, product),
        ).toContain(name);
    expect(
      Shopping.matchMerchantText(
        "Dune &amp; Coveway",
        { ...merchant, name: "Dune & Cove" },
        product,
      ),
    ).toEqual([]);
  });
});
