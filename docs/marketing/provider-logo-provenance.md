# Provider logo provenance

Checked 10 November 2026. Files are stored locally under `apps/web/public/providers/`. Source artwork retains its original colors and geometry. There is no tint, monochrome filter, invented mark or partner-badge treatment.

The latest annotated review explicitly requests the WooCommerce mark as well as broad official provider-logo use. Its official color wordmark now comes from the Woo brand site. Fil Rouge Capital is omitted from the program strip per comment15; its unresolved source question remains in the catalog. Generic feed, CSV, storefront-address and payment-gateway entries use category icons or text.

`ProviderLogo` is exported from `@/components/marketing/provider-logo`. Props: `provider: ProviderKey`, `className?`, `decorative?`, `fallback?: "text" | "none"` (default text), `label?`. `ProviderKey` and `providerLogos` are exported from `@/content/provider-logos`; the component module also re-exports the type. Use `decorative fallback="none"` beside a visible translated provider name. CSS sets maximum width and contains artwork without cropping.

20 distinct provider marks cover all branded integration records, plus Gemini. Repeated surfaces reuse their owner’s mark: Google Merchant Center uses Google, Microsoft Merchant Center uses Microsoft, Amazon Shop Direct uses Amazon, ChatGPT feed uses OpenAI/ChatGPT, and Perplexity feed uses Perplexity. Their separate status labels describe ecentic support; logos do not establish a partnership or distribution entitlement.

The OpenAI developer-site icon identifies the ChatGPT/OpenAI surface; the Akeneo asset is its official APIs header wordmark. Both are used unmodified. Existing repository artwork remains unmodified. The November 10 v8 review replaces the opaque Amazon and Perplexity favicons with the transparent artwork already present in `public/images/amazon.svg` and `public/images/perplexity.svg`; their historical source URLs are not recorded. The old favicons remain on disk for provenance, but are no longer rendered by ProviderLogo. The monochrome ChatGPT and Perplexity hero marks are displayed in white through CSS for contrast on the blue surface; source files are unchanged.

| Provider | Official source | Asset | Notes |
| --- | --- | --- | --- |
| meta | [Official page](https://www.meta.com/about/) | [Source asset](https://static.xx.fbcdn.net/rsrc.php/yf/r/-7pQO6hUGK_.svg) · `meta.svg` | Official Meta symbol from its site favicon, downloaded unchanged for the channel timeline. |
| woocommerce | [Official brand page](https://woocommerce.com/brand/) | [Source asset](https://woocommerce.com/wp-content/uploads/2025/07/Woo_logo_color.svg) · `woocommerce.svg` | Trailing whitespace normalized only for annotated comments20/44; geometry/colors unchanged; viewBox183.6×47.5. |
| shopify | [Official page](https://www.shopify.com/brand-assets) | [Source asset](https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-shopping-bag-full-color-66166b2e55d67988b56b4bd28b63c271e2b9713358cb723070a92bde17ad7d63.svg) · `shopify.svg` | Downloaded unchanged. |
| bigcommerce | [Official page](https://www.bigcommerce.com/) | [Source asset](https://dam.bigcommerce.com/m/780d051412681442/original/BigCommerce-B-Mark-Black.svg) · `bigcommerce.svg` | Downloaded unchanged. |
| shopware | [Official page](https://www.shopware.com/en/) | [Source asset](https://images.ctfassets.net/nqzs8zsepqpi/1QpalaqpkTYUuSoIv7TfBl/d176371d655b4b43ecdd1df2d5e2d6ff/shopware_logo_brand.svg) · `shopware.svg` | Downloaded unchanged. |
| gemini | [Official page](https://gemini.google.com/) | [Source asset](https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png) · `gemini.png` | Downloaded unchanged. |
| claude | [Official page](https://claude.com/) | [Source asset](https://claude.com/icon.svg) · `claude.svg` | Downloaded unchanged. |
| perplexity | [Official page](https://www.perplexity.ai/) | [Source asset](https://www.perplexity.ai/favicon.svg) · `perplexity.svg` | Downloaded unchanged. |
| copilot | [Official page](https://learn.microsoft.com/) | [Source asset](https://learn.microsoft.com/en-us/media/logos/logo_copilot.svg) · `copilot.svg` | Downloaded unchanged. |
| chatgpt | [Official page](https://developers.openai.com/) | [Source asset](https://developers.openai.com/favicon.png) · `chatgpt.png` | Downloaded unchanged. |
| stripe | [Official page](https://stripe.com/) | [Source asset](https://images.stripeassets.com/fzn2n1nzq965/1hgcBNd12BfT9VLgbId7By/01d91920114b124fb4cf6d448f9f06eb/favicon.svg) · `stripe.svg` | Downloaded unchanged. |
| plytix | [Official page](https://www.plytix.com/) | [Source asset](https://www.plytix.com/wp-content/uploads/2025/11/logo-plytix-full-purple.svg) · `plytix.svg` | Downloaded unchanged. |
| amazon | [Official page](https://www.aboutamazon.com/) | [Source asset](https://www.aboutamazon.com/_next/static/media/apple-touch-icon.706b1b87.png) · `amazon.png` | Downloaded unchanged. |
| wix | [Official page](https://www.wix.com/) | [Source asset](https://www.wix.com/) · `wix.svg` | Header SVG extracted with geometry and colors unchanged; viewBox casing normalized for standalone SVG. |
| salsify | [Official page](https://www.salsify.com/) | [Source asset](https://www.salsify.com/) · `salsify.svg` | Header SVG extracted with geometry and colors unchanged; viewBox casing normalized for standalone SVG. |
| prestashop | [Official page](https://prestashop.com/) | [Source asset](https://prestashop.com/) · `prestashop.svg` | Official header dark-logo data URI decoded unchanged. |
| microsoft | [Official page](https://about.ads.microsoft.com/) | [Source asset](https://uhf.microsoft.com/images/microsoft/RE1Mu3b.png) · `microsoft.png` | Downloaded unchanged. |
| adobe | [Official page](https://www.adobe.com/) | [Source asset](https://www.adobe.com/federal/assets/svgs/adobe-logo.svg) · `adobe.svg` | Downloaded unchanged. |
| google | [Official page](https://www.google.com/) | [Source asset](https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png) · `google.png` | Downloaded unchanged. |
| akeneo | [Official page](https://api.akeneo.com/) | [Source asset](https://api.akeneo.com/img/Akeneo_APIs.svg) · `akeneo.svg` | Official Akeneo APIs header wordmark, unchanged. |

The adjacent JSON records exact URLs, check date, file dimensions, byte size and SHA-256 hashes. Wix and Salsify are official header SVGs extracted from HTML; Salsify’s HTML `viewbox` attribute was normalized to XML `viewBox` for standalone rendering. PrestaShop is its header data URI decoded unchanged. No artwork paths or color values were changed.

Verification: the original 18 files parse as valid SVG or raster images and were inspected together at desktop size. The added WooCommerce SVG parses successfully and loads in the desktop/mobile diagram and integration checks. Index/leaf runtime checks and responsive screenshots are recorded in `output/enterprise-rebuild/provider-logos/`. No external forms were submitted.

V8 provider-hero review: large marks are placed above the headline without plates. The ChatGPT hero uses the existing vector `public/images/chatgpt.svg` rendered in white through CSS on the blue surface for readable contrast; the SVG file is unchanged. Smaller provider listings retain the sourced favicon.
