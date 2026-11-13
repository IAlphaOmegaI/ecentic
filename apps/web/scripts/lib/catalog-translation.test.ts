import { expect, test } from "bun:test";
import {
  catalogInvariantReason,
  catalogTranslationUnit,
  projectCatalogFragment,
  unresolvedCatalogFailures,
} from "./catalog-translation";

test("split retries clear stale failures only for the approved current source", () => {
  expect(
    unresolvedCatalogFailures(
      {
        originalBatch: { ids: ["title", "body"], reason: "timed out" },
        oldSource: { ids: ["changed", "removed"], reason: "review failed" },
      },
      {
        title: { sourceHash: "title-v1", text: "Titre" },
        body: { sourceHash: "body-v1", text: "Texte" },
        changed: { sourceHash: "changed-v1", text: "Ancien texte" },
      },
      new Map([
        ["title", "title-v1"],
        ["body", "body-v1"],
        ["changed", "changed-v2"],
      ]),
    ),
  ).toEqual({ oldSource: { ids: ["changed"], reason: "review failed" } });
});

test("translated lead labels cannot change the submitted enum", () => {
  expect(
    catalogInvariantReason(
      "enterpriseLead.options.aiChannel.0.value",
      "chatgpt",
    ),
  ).not.toBeNull();
  expect(
    catalogInvariantReason(
      "enterpriseLead.options.aiChannel.6.label",
      "Not sure yet",
    ),
  ).toBeNull();
  expect(
    catalogInvariantReason(
      "enterpriseCompany.security.sections.0.rows.0.value",
      "Public product data",
    ),
  ).toBeNull();
});

test("only machine status values are invariant", () => {
  expect(
    catalogInvariantReason(
      "enterpriseNav.groups.0.columns.0.items.0.status",
      "live",
    ),
  ).not.toBeNull();
  expect(
    catalogInvariantReason("dashboard.discovery.empty.status", "No run yet"),
  ).toBeNull();
});

test("overlapping fragments inherit the current array rather than reviving old copy", () => {
  expect(
    projectCatalogFragment(
      { cards: [{ title: "Old one" }, { title: "Deleted card" }] },
      { cards: [{ title: "Current one", body: "Current explanation" }] },
    ),
  ).toEqual({ cards: [{ title: "Current one", body: "Current explanation" }] });
});

test("marketing Scale can translate without relaxing the plan name elsewhere", () => {
  expect(
    catalogTranslationUnit("enterprisePricing.title", "Scale at your pace")
      .translatableTerms,
  ).toEqual(["Scale"]);
  expect(
    catalogTranslationUnit("pricing.plans.scale.name", "Scale").invariant,
  ).toBe(true);
});

test("checkout enum values remain code while their explanation is translated", () => {
  expect(
    catalogInvariantReason("reviewCode.checkout.rows.2.before", "blocked"),
  ).not.toBeNull();
  expect(
    catalogInvariantReason("reviewCode.checkout.rows.2.after", "ready"),
  ).not.toBeNull();
  expect(
    catalogInvariantReason(
      "reviewCode.checkout.rows.2.note",
      "Removing this requirement lets the sample continue to payment.",
    ),
  ).toBeNull();
});
