(() => {
  const pages = {
    home: "/",
    features: "/features",
    "product-listings": "/features/product-listings",
    pricing: "/pricing",
    resources: "/resources",
    enterprise: "/enterprise",
    shopify: "/platforms/shopify",
    woocommerce: "/platforms/woocommerce",
    "ucp-validator": "/ucp-validator",
    "webmcp-scanner": "/webmcp-scanner",
    "ucp-playground": "/ucp-playground",
    "sign-up": "/sign-up",
    "sign-in": "/sign-in",
    blog: "/blog",
    compare: "/compare/best-ai-ecommerce-tools",
  };

  const navigate = (path) => {
    window.location.assign(path);
    return { ok: true, path, message: `Navigating to ${path}` };
  };

  const tools = [
    {
      name: "get_site_overview",
      description:
        "Return ecentic product overview and machine-readable discovery endpoints (llms.txt, UCP, MCP, agent skills).",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async () => ({
        name: "ecentic",
        description:
          "AI agent commerce platform that simulates how shopping agents compare products, diagnoses losses, and optimizes listings.",
        urls: {
          home: "https://ecentic.ai/",
          llmsTxt: "https://ecentic.ai/llms.txt",
          ucp: "https://ecentic.ai/.well-known/ucp",
          mcp: "https://ecentic.ai/api/mcp",
          agentSkills: "https://ecentic.ai/.well-known/agent-skills/index.json",
          pricing: "https://ecentic.ai/pricing",
          signUp: "https://ecentic.ai/sign-up",
        },
      }),
    },
    {
      name: "navigate_to_page",
      description:
        "Navigate the browser to a key ecentic marketing or tool page.",
      inputSchema: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: Object.keys(pages),
            description: "Named page to open.",
          },
        },
        required: ["page"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async ({ page }) => {
        if (!(page in pages)) {
          return {
            ok: false,
            error: `Unknown page. Use one of: ${Object.keys(pages).join(", ")}`,
          };
        }
        return navigate(pages[page]);
      },
    },
    {
      name: "open_ucp_validator",
      description:
        "Open the free UCP validator, optionally prefilled with a storefront domain to validate /.well-known/ucp.",
      inputSchema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description:
              "Storefront domain to validate, e.g. example.com (no scheme required).",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async ({ domain } = {}) => {
        const value = typeof domain === "string" ? domain.trim() : "";
        const path = value
          ? `/ucp-validator?domain=${encodeURIComponent(value)}`
          : "/ucp-validator";
        return navigate(path);
      },
    },
    {
      name: "open_ucp_playground",
      description:
        "Open the UCP playground to smoke-test catalog, cart, and checkout tools against a storefront.",
      inputSchema: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "Storefront domain to exercise in the playground.",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async ({ domain } = {}) => {
        const value = typeof domain === "string" ? domain.trim() : "";
        const path = value
          ? `/ucp-playground?domain=${encodeURIComponent(value)}`
          : "/ucp-playground";
        return navigate(path);
      },
    },
    {
      name: "start_sign_up",
      description:
        "Start ecentic sign-up so a merchant can connect Shopify or WooCommerce and run AI listing simulations.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async () => navigate("/sign-up"),
    },
  ];

  const modelContext =
    (document.modelContext || navigator.modelContext) ?? null;
  if (!modelContext) return;

  const controller = new AbortController();

  const register = async () => {
    if (typeof modelContext.registerTool === "function") {
      for (const tool of tools) {
        await modelContext.registerTool(tool, { signal: controller.signal });
      }
      return;
    }

    if (typeof modelContext.provideContext === "function") {
      await modelContext.provideContext({ tools });
    }
  };

  void register();
})();
