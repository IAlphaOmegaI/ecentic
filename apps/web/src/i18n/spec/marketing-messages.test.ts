import { describe, expect, test } from "bun:test";
import english from "../../../messages/en.json";
import spanish from "../../../messages/es.json";
import englishReview from "../../../messages/fragments/enterpriseReview.en.json";
import spanishReview from "../../../messages/fragments/enterpriseReview.es.json";
import {
  cleanMarketingText,
  prepareMarketingMessages,
} from "../marketing-messages";

describe("production marketing copy", () => {
  test("preserves known sentences around an unresolved span", () => {
    expect(
      cleanMarketingText(
        "Product scans use three models. {{TODO: Confirm bespoke pilot methods.}} No certification is claimed.",
        { review: false, pendingLabel: "" },
      ),
    ).toBe("Product scans use three models. No certification is claimed.");
  });

  test("omits entirely pending values and cleans their empty punctuation", () => {
    expect(
      cleanMarketingText("{{TODO: confirm the region}}", {
        review: false,
        pendingLabel: "",
      }),
    ).toBe("");
    expect(
      cleanMarketingText("Known ({{TODO: detail}}).", {
        review: false,
        pendingLabel: "",
      }),
    ).toBe("Known.");
  });

  test("never renders internal notes, including in review mode", () => {
    for (const review of [false, true]) {
      expect(
        cleanMarketingText(
          "Known. [NOTE: Internal direction with {{TODO: private}}.] More known copy.",
          { review, pendingLabel: "Pending confirmation" },
        ),
      ).toBe("Known. More known copy.");
    }
  });

  test("leaves ordinary labels, ICU syntax, URLs and formatting unchanged", () => {
    const value =
      "[01] Read {count} items at https://ecentic.ai/docs.\n\nKeep  two spaces.";
    expect(cleanMarketingText(value, { review: false, pendingLabel: "" })).toBe(
      value,
    );
  });

  test("keeps catalog keys and array positions without mutating source", () => {
    const source = {
      enterpriseExample: {
        rows: [{ value: "{{TODO: region}}" }, { value: "Known" }],
        flag: true,
        count: 3,
        empty: null,
      },
    };
    const prepared = prepareMarketingMessages(source, {
      review: false,
      pendingLabel: "",
    });
    expect(prepared.enterpriseExample).toEqual({
      rows: [{ value: "" }, { value: "Known" }],
      flag: true,
      count: 3,
      empty: null,
    });
    expect(source.enterpriseExample.rows[0]?.value).toBe("{{TODO: region}}");
  });

  test("does not change user About, legal or dashboard namespaces", () => {
    const source = {
      about: { bio: "Existing user biography. {{TODO: preserve source}}" },
      privacy: { copy: "Existing legal text." },
      dashboard: { copy: "[NOTE: outside the marketing namespace]" },
      enterpriseExample: { copy: "{{TODO: omit this}}" },
    };
    const prepared = prepareMarketingMessages(source, {
      review: false,
      pendingLabel: "",
    });
    expect(prepared.about).toEqual(source.about);
    expect(prepared.privacy).toEqual(source.privacy);
    expect(prepared.dashboard).toEqual(source.dashboard);
    expect(prepared.enterpriseExample.copy).toBe("");
  });

  test("omits a copyright notice whose rights holder is unconfirmed", () => {
    const source = {
      enterpriseChrome: {
        footer: { copyright: "© 2026 {{TODO: legal name}}" },
      },
    };
    expect(
      prepareMarketingMessages(source, { review: false, pendingLabel: "" })
        .enterpriseChrome.footer.copyright,
    ).toBe("");
  });

  for (const [locale, catalog, pending] of [
    ["en", english, englishReview.enterpriseReview.pending],
    ["es", spanish, spanishReview.enterpriseReview.pending],
  ] as const) {
    test(`${locale} catalog has no pending markers in production serialization`, () => {
      const prepared = prepareMarketingMessages(catalog, {
        review: false,
        pendingLabel: "",
      });
      const marketing = Object.fromEntries(
        Object.entries(prepared).filter(([namespace]) =>
          namespace.startsWith("enterprise"),
        ),
      );
      expect(JSON.stringify(marketing)).not.toMatch(/\{\{\s*TODO\b|\[NOTE\b/iu);
    });

    test(`${locale} review labels are localized and owner questions stay out of payloads`, () => {
      const prepared = prepareMarketingMessages(
        {
          enterpriseExample: {
            copy: "Known. {{TODO: private owner question}}",
          },
        },
        { review: true, pendingLabel: pending },
      );
      expect(prepared.enterpriseExample.copy).toBe(`Known. ${pending}`);
      expect(JSON.stringify(prepared)).not.toContain("private owner question");
      expect(JSON.stringify(prepared)).not.toContain("{{TODO");
    });
  }
});
