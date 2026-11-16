export const dashboardDestinations = [
  { key: "overview", segment: "" },
  { key: "products", segment: "/products" },
  { key: "optimize", segment: "/optimize" },
  { key: "research", segment: "/research" },
  { key: "channels", segment: "/channels" },
  { key: "results", segment: "/results" },
] as const;

export type DashboardDestination =
  (typeof dashboardDestinations)[number]["key"];

/** Match path segments, never substrings: /ucp-playground is not /ucp. */
export const resolveDashboardDestination = (
  segment: string,
): DashboardDestination | null => {
  const page = segment.split("/").filter(Boolean)[0] ?? "";
  switch (page) {
    case "":
      return "overview";
    case "products":
    case "quality":
      return "products";
    case "optimize":
      return "optimize";
    case "research":
    case "brand":
    case "simulations":
    case "discovery":
    case "competitors":
      return "research";
    case "channels":
    case "google-shopping":
    case "visibility":
    case "agentic":
    case "webmcp":
    case "ucp":
    case "ucp-playground":
    case "ucp-comparison":
      return "channels";
    case "results":
      return "results";
    default:
      return null;
  }
};

export const dashboardSections = {
  products: [
    { key: "catalog", segment: "/products" },
    { key: "quality", segment: "/quality" },
  ],
  research: [
    { key: "summary", segment: "/research" },
    { key: "comparisons", segment: "/simulations" },
    { key: "brand", segment: "/brand" },
    { key: "questions", segment: "/discovery" },
    { key: "competitors", segment: "/competitors" },
    { key: "catalogRank", segment: "/research/catalog-rank" },
  ],
  channels: [
    { key: "connections", segment: "/channels" },
    { key: "google", segment: "/google-shopping" },
    { key: "checks", segment: "/agentic" },
    { key: "access", segment: "/visibility" },
    { key: "checkout", segment: "/ucp" },
  ],
} as const;

export const dashboardDeveloperTools = [
  { key: "shoppingTools", segment: "/webmcp" },
  { key: "testCheckout", segment: "/ucp-playground" },
  { key: "compareProfiles", segment: "/ucp-comparison" },
] as const;
