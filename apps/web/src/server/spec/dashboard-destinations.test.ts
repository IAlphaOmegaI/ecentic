import { describe, expect, test } from "bun:test";
import {
  dashboardDestinations,
  resolveDashboardDestination,
} from "../../lib/dashboard-destinations";

describe("dashboard destinations", () => {
  test("the six entry routes each select their own navigation item", () => {
    expect(dashboardDestinations).toHaveLength(6);
    for (const destination of dashboardDestinations) {
      expect(resolveDashboardDestination(destination.segment)).toBe(
        destination.key,
      );
    }
  });

  test("legacy routes and nested detail pages keep the correct family", () => {
    const paths = {
      products: ["/products/add", "/products/product-id", "/quality"],
      research: [
        "/brand",
        "/simulations",
        "/discovery",
        "/competitors/add",
        "/research/catalog-rank",
      ],
      channels: [
        "/google-shopping",
        "/visibility",
        "/agentic",
        "/webmcp",
        "/ucp",
        "/ucp-playground",
        "/ucp-comparison",
      ],
    } as const;
    for (const family of ["products", "research", "channels"] as const) {
      const aliases = paths[family];
      for (const path of aliases)
        expect(resolveDashboardDestination(path)).toBe(family);
    }
  });

  test("does not mistake similarly named unknown or account routes for store pages", () => {
    for (const path of [
      "/productsmith",
      "/results-old",
      "/settings",
      "/reports",
      "/ucp-anything",
    ]) {
      expect(resolveDashboardDestination(path)).toBeNull();
    }
  });
});
