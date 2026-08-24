/**
 * The MCP tools documented on `/docs/mcp`, paired with their message-catalog
 * key and whether they need a credential.
 *
 * Kept beside the page rather than derived from the live catalog at render time
 * so each row's copy is typed against the message catalog instead of indexed by
 * a runtime string. A test asserts this list is exactly the server's tool
 * catalog, so a tool added to the server cannot go undocumented.
 */
export const DOCUMENTED_MCP_TOOLS = [
  { name: "list_plans", summary: "listPlans", authenticated: false },
  { name: "create_api_key", summary: "createApiKey", authenticated: true },
  { name: "create_checkout", summary: "createCheckout", authenticated: true },
  { name: "connect_shopify", summary: "connectShopify", authenticated: true },
  {
    name: "connect_woocommerce",
    summary: "connectWooCommerce",
    authenticated: true,
  },
  { name: "connect_feed", summary: "connectFeed", authenticated: true },
  {
    name: "get_onboarding_status",
    summary: "getOnboardingStatus",
    authenticated: true,
  },
] as const;
