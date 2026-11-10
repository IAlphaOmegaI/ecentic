/** Official provider artwork. Source and usage notes: docs/marketing/provider-logo-provenance.md. */
const artwork = {
  shopify: {
    name: "Shopify",
    src: "/providers/shopify.svg",
    width: 89.0,
    height: 101.0,
  },
  woocommerce: { name: "WooCommerce", src: null, width: 1, height: 1 },
  bigcommerce: {
    name: "BigCommerce",
    src: "/providers/bigcommerce.svg",
    width: 40.0,
    height: 40.0,
  },
  adobe: {
    name: "Adobe Commerce",
    src: "/providers/adobe.svg",
    width: 64.57,
    height: 35.0,
  },
  shopware: {
    name: "Shopware",
    src: "/providers/shopware.svg",
    width: 155.0,
    height: 33.0,
  },
  wix: { name: "Wix", src: "/providers/wix.svg", width: 75.0, height: 30.0 },
  prestashop: {
    name: "PrestaShop",
    src: "/providers/prestashop.svg",
    width: 567.0,
    height: 63.0,
  },
  google: {
    name: "Google",
    src: "/providers/google.png",
    width: 128,
    height: 128,
  },
  chatgpt: {
    name: "ChatGPT",
    src: "/providers/chatgpt.png",
    width: 48,
    height: 48,
  },
  claude: {
    name: "Claude",
    src: "/providers/claude.svg",
    width: 248.0,
    height: 248.0,
  },
  copilot: {
    name: "Microsoft Copilot",
    src: "/providers/copilot.svg",
    width: 20.0,
    height: 20.0,
  },
  microsoft: {
    name: "Microsoft",
    src: "/providers/microsoft.png",
    width: 216,
    height: 46,
  },
  perplexity: {
    name: "Perplexity",
    src: "/providers/perplexity.svg",
    width: 270.0,
    height: 270.0,
  },
  amazon: {
    name: "Amazon",
    src: "/providers/amazon.png",
    width: 180,
    height: 180,
  },
  stripeAcs: {
    name: "Stripe",
    src: "/providers/stripe.svg",
    width: 512.0,
    height: 512.0,
  },
  plytix: {
    name: "Plytix",
    src: "/providers/plytix.svg",
    width: 140.0,
    height: 34.0,
  },
  akeneo: {
    name: "Akeneo",
    src: "/providers/akeneo.svg",
    width: 744.35,
    height: 86.021,
  },
  salsify: {
    name: "Salsify",
    src: "/providers/salsify.svg",
    width: 804.739,
    height: 213.925,
  },
  gemini: {
    name: "Gemini",
    src: "/providers/gemini.png",
    width: 512,
    height: 512,
  },
  productFeeds: { name: "XML / JSON", src: null, width: 1, height: 1 },
  csv: { name: "CSV", src: null, width: 1, height: 1 },
  storeAddress: { name: "HTTPS", src: null, width: 1, height: 1 },
  paymentGateway: { name: "PSP", src: null, width: 1, height: 1 },
} as const;

export const providerLogos = {
  ...artwork,
  googleMerchant: artwork.google,
  microsoftMerchant: artwork.microsoft,
  amazonShopDirect: artwork.amazon,
  chatgptFeed: artwork.chatgpt,
  perplexityFeed: artwork.perplexity,
} as const;

export type ProviderKey = keyof typeof providerLogos;
