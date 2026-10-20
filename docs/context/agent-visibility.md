# Agent Visibility — Ingestion Paths and Measurement

How product data actually reaches AI shopping surfaces, and which ecentic
module serves each path. This supersedes the earlier assumption that writing
`ucp.*` metafields alone makes data agent-visible — unmapped backend metafields
are not read by any agent surface.

## Ingestion paths (mid-2026)

| Surface | What it reads | ecentic module |
|---|---|---|
| ChatGPT Shopping | Shopify Catalog (auto for Shopify stores) or OpenAI Product Feed; page crawl for citations only | Catalog-extractable fields via `updateProduct` + storefront JSON-LD |
| Shopify Catalog → ChatGPT/Perplexity/Copilot | Standard fields, taxonomy category metafields, mapped metafields (admin Catalog Mapping), attribute extraction from titles/descriptions | `integration/shopify.ts` (title/description push, `ucp` metafield definitions) |
| Google AI Mode | Merchant Center feed (hard gate) + rendered schema.org JSON-LD as verification | `feed-export.ts` + `/api/feeds/google/[store]` + theme app extension |
| Perplexity | Merchant Program feed (Google spec), GTIN offer clustering, PerplexityBot page crawl | same feed URL + theme app extension |
| All crawling agents | robots.txt allowance, rendered HTML | `intelligence/agent-readiness.ts` audit |

Key structural fact: **offer selection happens inside GTIN clusters** (price,
shipping window, return policy, trust). Products without a GTIN (variant
barcode) never enter the cross-retailer comparison.

## Modules

- `server/app/feed-export.ts` — Google Shopping–spec XML from synced products;
  served publicly at `/api/feeds/google/{store}?token={hmac}` (token derived
  from `BETTER_AUTH_SECRET`, no schema change). One URL serves both Google
  Merchant Center and the Perplexity Merchant Program.
- `server/app/integration/shopify.ts` — `ucp.*` metafields now get
  metafield definitions with `storefront: PUBLIC_READ`, making them readable
  from Liquid and the Storefront API (previously backend-only dead data).
- `apps/web/extensions/agentic-structured-data/` — theme app embed block
  rendering `ucp.structured_data` (or deterministic fallback markup) as
  JSON-LD in storefront HTML. Deployed with `shopify app deploy` from
  `apps/web/` (the CLI-linked app config is `apps/web/shopify.app.toml`);
  merchants enable the app embed once in the theme editor.
- `server/app/intelligence/agent-readiness.ts` — `auditStore` action: robots.txt
  per-crawler allowance, bot-wall access to sampled product pages, rendered
  JSON-LD sampling, GTIN coverage, content depth, feed readiness, plus manual
  checklist items (Agentic Storefront, GMC, Perplexity enrollment). A sampled
  page that answers with a bot challenge (`intelligence/bot-challenge.ts`:
  vendor signatures, or a bare 403/429) fails the access check and is left out
  of the JSON-LD tally — a challenge page carries no product, so counting it
  as "no markup" would send the merchant to fix the wrong thing. Bot walls key
  on IP reputation and TLS fingerprint more than user agent, and hosted
  shopping agents mostly fetch from datacenter IPs, so the cloud-run audit is
  a fair proxy for what they hit.
- `server/app/intelligence/catalog-rank.ts` — `measureCatalogRank` action:
  queries the Shopify **Global Catalog MCP** (the same retrieval index agent
  surfaces use for Shopify products) for a buyer query with locale signals and
  returns the store's live rank plus the competing offers. This is the
  deterministic before/after measurement loop; the LLM role-play scan remains
  a diagnosis tool only.

## Environment (all optional; catalog rank degrades to "not configured")

```
SHOPIFY_CATALOG_CLIENT_ID      # Dev Dashboard → Catalogs → "Get an API key"
SHOPIFY_CATALOG_CLIENT_SECRET  # (catalog keys, not the app's SHOPIFY_API_KEY)
SHOPIFY_CATALOG_TOKEN_URL      # default https://api.shopify.com/auth/access_token
SHOPIFY_CATALOG_MCP_URL        # default https://catalog.shopify.com/api/ucp/mcp
UCP_AGENT_PROFILE_URL          # default {APP_HOST}/ucp/agent-profile
```

Auth flow: POST JSON `{client_id, client_secret, grant_type: "client_credentials"}`
to the token URL → `{access_token}` (JWT, 60-minute lifetime). Handled by
`catalog-rank.ts` with in-process caching.

## Dashboard

`/dashboard/{store}/visibility` renders the audit report (streamed server
component), the copyable feed URL, and the Global Catalog rank checker
(query + market form). Registered in the sidebar as "Visibility".

## Known follow-ups
- GMC AI-specific attributes (`question_and_answer`, up to 30 pairs/product) —
  a documented ingestion path for generated Q&A content; needs storage.
- Win-rate lift in `listing_optimization` is still simulation-derived
  (circular); migrate lift reporting to catalog-rank before/after once
  credentials are provisioned.
- Shopify tracking beacon undercounts non-JS crawlers by design; treat referral
  clicks + order attribution as the reliable signals.
