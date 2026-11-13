import { expect, test } from "bun:test";
import {
  catalogInvariantReason,
  catalogTranslationUnit,
  projectCatalogFragment,
} from "./catalog-translation";

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
