import { providerLogos } from "./provider-logos";

/** Platform statements were read from these first-party sources on this date. */
export const channelCheckedAt = "2026-11-10";

export const aiChannels = [
  {
    key: "google",
    slug: "google-ai-mode-gemini",
    href: "/ai-channels/google-ai-mode-gemini",
    status: "simulated",
    display: "logo",
    artwork: providerLogos.google.src,
    checkedAt: channelCheckedAt,
    capabilities: {
      simulate: "live",
      fix: "live",
      checkout: "live",
      track: "live",
    },
    interests: ["google-checkout-onboarding"],
    sources: [
      {
        key: "googleEligibility",
        url: "https://support.google.com/merchants/answer/16837055",
      },
      {
        key: "googleIntegration",
        url: "https://developers.google.com/merchant/ucp/guides/merchant-center/integration",
      },
      {
        key: "googleCart",
        url: "https://blog.google/products-and-platforms/products/shopping/universal-cart-launch/",
      },
    ],
  },
  {
    key: "chatgpt",
    slug: "chatgpt",
    href: "/ai-channels/chatgpt",
    status: "simulated",
    display: "logo",
    artwork: providerLogos.chatgpt.src,
    checkedAt: channelCheckedAt,
    capabilities: {
      simulate: "live",
      fix: "live",
      checkout: "soon",
      track: "live",
    },
    interests: ["chatgpt-product-feed", "chatgpt-app"],
    sources: [
      {
        key: "openaiOnboarding",
        url: "https://developers.openai.com/commerce/guides/get-started",
      },
      {
        key: "openaiProducts",
        url: "https://developers.openai.com/commerce/specs/file-upload/products",
      },
      {
        key: "openaiPractices",
        url: "https://developers.openai.com/commerce/guides/best-practices",
      },
      {
        key: "openaiCheckout",
        url: "https://developers.openai.com/plugins/guides/product-checkout-conversion-spec",
      },
    ],
  },
  {
    key: "claude",
    slug: "claude",
    href: "/ai-channels/claude",
    status: "simulated",
    display: "logo",
    artwork: providerLogos.claude.src,
    checkedAt: channelCheckedAt,
    capabilities: {
      simulate: "live",
      fix: "live",
      checkout: "not-yet",
      track: "live",
    },
    interests: [],
    sources: [
      {
        key: "claudeCommerce",
        url: "https://claude.com/resources/articles/claude-for-commerce-agents",
      },
    ],
  },
  {
    key: "copilot",
    slug: "microsoft-copilot",
    href: "/ai-channels/microsoft-copilot",
    status: "soon",
    display: "logo",
    artwork: providerLogos.copilot.src,
    checkedAt: channelCheckedAt,
    capabilities: {
      simulate: "not-yet",
      fix: "soon",
      checkout: "soon",
      track: "live",
    },
    interests: ["microsoft-merchant-center"],
    sources: [
      {
        key: "microsoftCommerce",
        url: "https://about.ads.microsoft.com/en/solutions/technology/agentic-commerce",
      },
    ],
  },
  {
    key: "perplexity",
    slug: "perplexity",
    href: "/ai-channels/perplexity",
    status: "soon",
    display: "logo",
    artwork: providerLogos.perplexity.src,
    checkedAt: channelCheckedAt,
    capabilities: {
      simulate: "soon",
      fix: "soon",
      checkout: "not-yet",
      track: "live",
    },
    interests: ["perplexity-scans", "perplexity-merchant-feed"],
    sources: [
      {
        key: "perplexityShopping",
        url: "https://www.perplexity.ai/hub/blog/shop-like-a-pro",
      },
      {
        key: "perplexityProgram",
        url: "https://perplexity.typeform.com/to/oIcfT8U3",
      },
    ],
  },
  {
    key: "amazon",
    slug: "amazon",
    href: "/ai-channels/amazon",
    status: "soon",
    display: "logo",
    artwork: providerLogos.amazon.src,
    checkedAt: channelCheckedAt,
    capabilities: {
      simulate: "not-yet",
      fix: "soon",
      checkout: "not-yet",
      track: "not-yet",
    },
    interests: ["amazon-shop-direct"],
    sources: [
      {
        key: "amazonWorkspace",
        url: "https://www.aboutamazon.com/news/retail/amazon-shop-direct-merchant-workspace",
      },
      {
        key: "amazonAssistant",
        url: "https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant",
      },
    ],
  },
] as const;

export type AiChannel = (typeof aiChannels)[number];
export type AiChannelKey = AiChannel["key"];
