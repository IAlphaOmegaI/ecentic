import { describe, expect, test } from "bun:test";
import {
  isUnknownMarketingDetailPath,
  marketingRoutes,
} from "./marketing-routes";

describe("finite marketing route recovery", () => {
  test("keeps every canonical marketing route reachable", () => {
    for (const { path } of marketingRoutes) {
      expect(isUnknownMarketingDetailPath(path)).toBe(false);
    }
  });

  test("rejects unknown detail slugs before a streamed response", () => {
    for (const path of [
      "/platform/not-a-pillar",
      "/solutions/not-a-business",
      "/solutions/sectors/not-a-sector",
      "/integrations/not-an-integration",
      "/ai-channels/not-a-channel",
    ]) {
      expect(isUnknownMarketingDetailPath(path)).toBe(true);
    }
  });

  test("does not constrain published blog slugs or unrelated routes", () => {
    for (const path of [
      "/blog/a-new-article",
      "/blog/tag/new-tag",
      "/docs/future-guide",
      "/dashboard/store/products/product",
      "/_not-found",
      "/solutions/sectors",
    ]) {
      expect(isUnknownMarketingDetailPath(path)).toBe(false);
    }
  });

  test("accepts trailing slashes and encoded canonical characters", () => {
    expect(isUnknownMarketingDetailPath("/platform/connect/")).toBe(false);
    expect(isUnknownMarketingDetailPath("/platform/%63onnect")).toBe(false);
    expect(isUnknownMarketingDetailPath("/platform/%invalid")).toBe(true);
  });
});
