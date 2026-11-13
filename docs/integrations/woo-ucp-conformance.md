# Hosted UCP — Conformance with the woo-ucp Reference Implementation

ecentic serves the Universal Commerce Protocol (UCP `2026-04-08`) on behalf of
connected WooCommerce stores. The wire behavior is a port of the **woo-ucp
plugin's** in-WordPress implementation (the reference), split across two
codebases:

- **ecentic backend** (`apps/web/src/server/app/ucp/`) — the entire protocol
  surface: discovery, catalog, carts, checkout sessions, orders, capability
  negotiation, RFC 9421 signing, idempotency, rate limiting.
- **Thin store plugin** (woo-ucp ≥ 2.0) — only what genuinely needs the Woo
  runtime: `/.well-known/ucp` on the store's domain (cached proxy of the
  hosted profile), the one-click connect flow, private `wc-ucp/v1` commerce
  primitives (live quote via the real `WC()->cart`, order materialisation via
  `WC()->checkout()->create_order()`, order snapshots), and order-status
  events back to ecentic.

This document tracks parity with the reference (the pre-2.0 woo-ucp classes,
kept in that repo's git history, and its `conformance/UCP-*.md` notes) and
records every known divergence.

## Architecture map

| Reference (in-plugin) | Hosted equivalent |
|---|---|
| `WOO_UCP_Discovery::build_profile` | `ucp/discovery.ts` — served at `GET /api/ucp/stores/{store}/profile`; the plugin proxies it at `/.well-known/ucp` with a 5-min transient cache + last-good fallback |
| `WOO_UCP_API` (routes, envelope, pre-dispatch, idempotency, rate limit, response signing) | `ucp/router.ts` + `ucp/protocol.ts` + `ucp/idempotency.ts` + `ucp/rate-limit.ts` — catch-all route `api/ucp/stores/[store]/[[...path]]` |
| `WOO_UCP_Negotiation` | `ucp/negotiation.ts` — same intersection algorithm, SSRF-guarded profile fetch, redis cache with the ≥60s TTL floor, 30-fetch/60s global limit |
| `WOO_UCP_Signatures` (RFC 9421 / RFC 9530, ES256) | `ucp/signatures.ts` — `node:crypto` with `dsaEncoding: "ieee-p1363"` (raw `r‖s`), same covered components and `sig1` label |
| `WOO_UCP_Catalog` | `ucp/catalog.ts` + `ucp/wc-catalog.ts` — live reads from the store's WooCommerce REST API v3, redis-cached; synced `product` table as outage fallback |
| `WOO_UCP_Cart` (transients) | `ucp/cart.ts` + `ucp/sessions.ts` — redis sessions, same 60-min TTL semantics |
| `WOO_UCP_Checkout` (transients + WC internals) | `ucp/checkout.ts` — redis sessions; totals/shipping/coupons come from the plugin bridge `POST /wc-ucp/v1/quote`, which runs the real `WC()->cart` |
| `WOO_UCP_Checkout::create_wc_order` | Bridge `POST /wc-ucp/v1/orders` → `WC()->checkout()->create_order()` over the calculated cart (higher fidelity than the reference's manual `wc_create_order`) |
| `WOO_UCP_Orders` (entity + webhooks) | `ucp/orders.ts` — entity via bridge `GET /wc-ucp/v1/orders/{id}`; signed webhook fan-out from ecentic; the plugin only relays status changes to `POST /api/ucp/stores/{store}/events` (HMAC) |
| `WOO_UCP_Discounts` | Deleted — coupon math is WooCommerce's own, via the bridge quote's `WC()->cart->apply_coupon()` |
| `WOO_UCP_Connect` | Unchanged plugin-side; ecentic side is `ucp/connect.ts` + `api/integrations/woo/start\|callback` (OAuth code + PKCE, SSRF guard, atomic single-use state, reconnect idempotency) |
| `WOO_UCP_Stripe` | Restored in the plugin unchanged; invoked through the bridge `POST /wc-ucp/v1/charge` so the Stripe secret never leaves the store |
| `WOO_UCP_Auth` (identity linking) | Restored in the plugin, upgraded to the current spec (PKCE S256 enforced, RFC 9207 `iss`, client binding, revocation cascade); scope gates enforced by the hosted router via bridge introspection |

The seam is the discovery profile's `endpoint` field: agents discover the
store at its own `/.well-known/ucp` and are pointed at
`https://ecentic.ai/api/ucp/stores/{store}` for every operation.

## Discovery profile shape

`buildDiscoveryProfile` follows the `2026-04-08` profile structure, pinned by
`apps/web/src/server/spec/ucp-profile.test.ts`:

- `ucp.services` and `ucp.payment_handlers` are always present.
  `payment_handlers` is `{}` until the merchant declares a handler — the
  registry is required even when empty.
- Every capability entry carries a `spec` and a `schema` on `https://ucp.dev`,
  the namespace authority of `dev.ucp.*`.
- `signing_keys[]` sits at the top level of the profile, beside `ucp`, never
  inside it; it is omitted when `UCP_SIGNING_PRIVATE_KEY` is unset. This port
  used to nest it inside `ucp`, where a spec-following verifier does not look.
- There is no `supported_versions`: it maps *older* protocol versions to their
  own leaf profiles, and this service speaks one version. This port used to
  map the current version to the store's own `/.well-known/ucp`.

## Request pipeline parity

Same order as the reference `pre_dispatch`:

1. Rate limit (per store + agent identity, merchant-tunable per-minute
   fixed window — default 120, 0 = unlimited — `429` + `Retry-After`).
2. Merchant access controls (plugin settings via store-info, invalidated
   instantly on save): store-level API key (`X-UCP-Key` or
   `Authorization: Bearer` → 401 `ucp_unauthorized` when set and absent;
   the discovery profile stays public), identity binding
   (`allowed_agent_profiles` — profile URLs or hosts; other platforms get
   403 `platform_not_allowed`; empty = permissionless).
3. RFC 9421 verification — verify-when-present, or mandatory when the
   merchant enables the plugin's "Require Signed Requests" setting (surfaced
   through the bridge store-info fetch; unsigned requests then get 401
   `signature_missing`). Signer key resolved by `keyid` from the agent
   profile's `signing_keys[]`, `Content-Digest` checked against exact body
   bytes, base reconstructed from the live request. ES256 + ES384
   verification supported.
4. Idempotency replay — `Idempotency-Key` scoped per store + method + path;
   pending reservation 5 min, replayed result 48 h with
   `Idempotency-Replayed: true`, `409` on in-flight, fail-closed `503` when
   storage is down.
5. Capability negotiation — `UCP-Agent: profile="…"` required
   (`invalid_profile_url` 400 without it), single-version support
   (`version_unsupported` 422), intersection with extension pruning,
   per-operation root-capability gate (`capabilities_incompatible` as an
   HTTP 200 business error).
6. Operation, then response signing (`@status content-digest content-type`,
   `created` param) for 2xx `checkout-sessions*` and `orders*` responses over
   the exact serialized bytes.

Envelope parity: `ucp.version`, optional `ucp.status`, and `capabilities`
narrowed to the negotiated set relevant to the operation.

## Capability conformance

### `dev.ucp.shopping.catalog.search` / `.lookup`

Ported behaviors (verified against a live store):

- Search requires a query **or** at least one filter (`invalid_request` 400,
  recoverable); filter-only browse allowed; cursor pagination
  (base64url `{"page":N}`, default limit 10, max 100), `cursor` emitted only
  when a next page exists.
- **Stock default is merchant-controlled** (plugin "Catalog Stock"
  setting, default in-stock-only — the reference's `include_out_of_stock`);
  an agent's explicit `availability.in_stock` filter always wins.
- Category names/slugs resolve to term ids and push down to the WC query;
  unresolvable categories yield an empty result. Price bounds push down as
  `min_price`/`max_price`.
- `context.currency` ≠ store currency drops the price filter with the
  `price_filter_ignored` info message (the reference's no-converter path).
- Lookup: ids deduplicated, >100 → `request_too_large` (400, recoverable);
  product ids, **variation ids**, SKUs, and handles/slugs resolve to
  purchasable units grouped under their parent, each variant carrying
  `inputs: [{id, match: "exact"|"featured"}]`; a variable product resolves to
  its featured variation. Filters AND: categories narrow products,
  price/stock narrow units, unit-less products drop. Misses are
  `info`/`not_found` messages whose content is the id itself.

### `dev.ucp.shopping.catalog` product detail

- Effective selection: client `selected` → the requested variation's own
  options → **relaxed via `preferences`** (unlisted options dropped first,
  then reverse preference order) → the **default-attributes/featured**
  variation on a bare lookup. Echoed back as `product.selected`.
- Options annotated with **`available` / `exists`** per value relative to the
  selection ("Any" axes match everything).
- Variants narrow to the selection, then filters, never to zero; the
  requested variation leads the list (featured-first conformance rule).
- Miss is HTTP 200 with `ucp.status: error`, `not_found`, unrecoverable,
  plus `continue_url`.

Product/variant shape parity: `handle`, `description: {plain, html}` (long
description preferred), `price_range`/`list_price_range` (regular prices,
emitted only when a discount applies; per-variant `list_price` only when
strictly above price), simple products as a single `"Default"` variant with
no url/media/options of its own, variation titles as comma-joined labels,
variation SKU inheriting the parent's, `barcodes` (GTIN via
`global_unique_id`, WC 9.2+), `checkout_url` add-to-cart links
(`?add-to-cart={parent}&variation_id={id}&attribute_{slug}={option}`),
`rating` with `scale_min: 1`, "Uncategorized" excluded, `metadata` (custom
attributes, weight/dimensions in the store's configured units, shipping
class, brand, featured / sold_individually / virtual / downloadable /
backorders) at product and variant level, empty lists omitted.

### `dev.ucp.shopping.cart` (+ discount extension)

- Redis sessions (`cart_{uuid}`), 60-min TTL, `expires_at` on the wire;
  activity (PUT) extends the session.
- Create requires non-empty `line_items` (400 `field_required`
  `$.line_items`); when every requested item is unavailable the outcome is an
  HTTP 200 error envelope (`out_of_stock`, unrecoverable) with **no cart
  resource created**. Missing/expired carts are a `not_found` business outcome
  at **HTTP 200** with `continue_url` (existence is binary on the wire).
- Line items resolve against the live catalog (variant cache → wc/v3 →
  synced fallback; unknown numeric ids kept provisionally for the bridge
  quote to price or drop); unavailable items dropped with warnings.
- Pricing through the bridge quote — real cart math, so third-party pricing
  plugins and sale prices apply. Coupons validated by WooCommerce itself;
  `discounts.applied` entries carry code/title/amount/method/priority and
  per-line `allocations` (`$.line_items[N]` paths, split by `WC_Discounts`);
  invalid codes drop with warnings carrying WooCommerce's own reason.
- Totals use label `display_text` ("Subtotal", "Item Discounts",
  "Estimated total (taxes calculated at checkout)") with negative
  `items_discount` amounts, at cart and line level alike.
- PUT: provided sections wholly supersede prior state, absent sections are
  retained; cancel returns the final state then deletes; cart → checkout
  conversion is idempotent (`convertedTo` marker, cleared when the checkout
  is canceled so the cart is reusable).
- `continue_url` uses WooCommerce's stateless
  `/checkout-link/?products=id:qty,…&coupon=…`.

### `dev.ucp.shopping.checkout` (+ fulfillment, discount)

- Statuses: `incomplete`, `requires_escalation`, `ready_for_complete`,
  `complete_in_progress`, `completed`, `canceled`; responses carry
  `ucp.status: "success"` and the mandatory `links` array populated from the
  store's configured privacy/terms pages (via the bridge store-info fetch).
- Status derivation follows the reference message model:
  `requires_buyer_input`/`requires_buyer_review` errors → `requires_escalation`;
  any error or no items → `incomplete`; else `ready_for_complete`. Requirement
  messages use the reference codes and JSONPaths — `field_required
  $.buyer.email`, `field_required $.fulfillment.methods[0].selected_destination_id`,
  `address_undeliverable $.fulfillment.methods[0].destinations[0]`.
  `requires_shipping` comes from the real cart (`needs_shipping()`).
- Create requires `cart_id` or non-empty `line_items` (400 `field_required`);
  all-items-unavailable is a 200 error outcome with no resource. Cart
  conversion reuses only a **live** existing checkout; terminal ones no
  longer block a fresh conversion.
- Fulfillment mirrors the reference structure: omitted for digital-only
  sessions; a bare `shipping` method advertising the requirement before an
  address; then `destinations` (`dest_1`, spec postal-address field names)
  and option `groups` (`package_1`) from the live shipping zones
  (free-shipping coupon rules included); cheapest option pre-selected,
  agent-selectable via `selected_option_id`.
- Payment handlers (reference parity): the Google Pay handler is advertised
  in the discovery profile and checkout `payment.handlers` when the merchant
  configures a Google Pay merchant id **and** a PSP gateway in the plugin
  settings (declaration id `gpay-md5(mid)`, PAYMENT_GATEWAY tokenization).
  At Complete, instruments are validated first: an unadvertised `handler_id`
  → `payment_handler_unknown` 400; a credential bound to a different
  checkout → `payment_binding_invalid` 409 (replay protection).
- Processing: instruments are charged through the bridge `POST /charge`,
  which runs the plugin's `woo_ucp_process_instrument` chain
  (`WOO_UCP_Stripe` restored — charges Stripe PaymentMethod tokens via
  PaymentIntents with the WC Stripe Gateway's key, which never leaves the
  store; idempotent per checkout). Outcomes: charged → paid order
  (`payment_complete`); 3DS → session `requires_escalation` with the
  processor's authentication URL as `continue_url` and a
  `requires_buyer_input` message — a later Complete finalizes once the order
  is paid out-of-band; declined/failed → 402 with the reference's
  `PAYMENT_ERROR_MAP` (`payment_declined`/`payment_failed`, matching
  severities); no processor (Stripe toggle off) → defer, the order stays
  payable through the trusted UI.
- Complete: only from `ready_for_complete` (other non-terminal states
  re-evaluate and return 200 with what is outstanding); terminal sessions →
  `checkout_immutable` 409 (update and complete alike); cancel on a terminal
  session → `cancel_not_allowed` 409. The order materialises **before**
  charging through `WC()->checkout()->create_order()` (no customer
  attribution, `created_via=ucp`,
  `_ucp_checkout_id`/`_ucp_session_id`/`_ucp_attribution` meta) and is
  reused by retried Completes while it still awaits payment (the reference
  ensure_order — declines never duplicate orders; `continue_url` then points
  at its order-pay page); `order.status` maps the WooCommerce status to the
  UCP vocabulary (`pending` → `ready_for_payment`, `failed` →
  `unrecoverable_errors`, …).
- A durable `ucp_order` row maps the Woo order to the checkout session and
  keeps the negotiated webhook target beyond the session TTL.

### `dev.ucp.shopping.order`

- `GET /orders/{id}`: only UCP-created orders resolve (existence privacy —
  anything else is 404). The entity is the full reference shape: `label`,
  `checkout_id` (with legacy-meta fallbacks), line items with
  `quantity: {original, total, fulfilled}` and derived `status`
  (processing/partial/fulfilled/removed), `fulfillment` with buyer-facing
  `expectations` (shipping vs digital groupings with UCP postal addresses)
  and shipment-tracking `events`, refund `adjustments` (line refs,
  `occurred_at`, negative totals), labelled totals (with fees), and the
  `attribution` snapshot.
- Webhooks: `order.created` fired by ecentic on completion;
  `order.updated` relayed from the plugin's
  `woocommerce_order_status_changed` hook through the HMAC-authenticated
  events endpoint. Deliveries carry Standard Webhooks headers
  (`Webhook-Id`, `Webhook-Timestamp`, `Idempotency-Key`, `X-UCP-Event`,
  `UCP-Agent` identifying the business by its own profile) and an RFC 9421
  signature over `@method @authority @path ucp-agent idempotency-key
  content-digest content-type`. HTTPS targets only; failures are
  Sentry-captured and never block the triggering flow.

### `dev.ucp.common.identity_linking`

- The store hosts its own OAuth 2.0 authorization server (`WOO_UCP_Auth`,
  upgraded beyond the reference to the current spec): RFC 8414 metadata at
  `{store}/.well-known/oauth-authorization-server` (S256-only PKCE,
  `authorization_response_iss_parameter_supported`, `client_secret_basic` +
  `none`), login + consent inside WordPress at `/ucp-oauth/authorize`
  (nonce-protected consent, per-scope descriptions), token endpoint with
  enforced PKCE, exact `redirect_uri` matching (RFC 8252 loopback-port
  exception), client binding (`invalid_client`), and RFC 7009 revocation
  where revoking a refresh token cascades to its access tokens. `iss` is
  returned on every authorization response (RFC 9207).
- Scope policy defaults to the B2C shape — `dev.ucp.shopping.order:read` /
  `:manage` gated, guest checkout open — and is filterable
  (`woo_ucp_identity_scopes`, e.g. add `dev.ucp.shopping.checkout:manage`
  for the B2B no-guest-checkout shape).
- The hosted profile advertises the capability with `config.scopes` (via
  store-info), and the hosted router enforces the gates: no token → 401
  `identity_required` + `WWW-Authenticate: Bearer realm="<issuer>"` (no
  `error` param, RFC 6750 §3.1); invalid/expired token → 401 with
  `error="invalid_token"`; valid token missing a scope → 403
  `insufficient_scope` with the FULL required scope set in the challenge.
  Tokens are validated through the bridge introspection route (redis-cached
  60 s, so revocation propagates within a minute).

## Known divergences from the reference

wc/v3 transport limitations (the reference read WC objects in-process):

- **No taxonomy term slugs** in product/variation payloads → option values
  carry `label` only (no stable `id`), and selection matching is
  label-based, case-insensitive. The reference preferred term slugs.
- **No image width/height** (the reference emitted them from attachment
  metadata).
- **No `relevance` ordering** for search — WooCommerce's native REST search
  order applies.
- `context.language` locale switching does not apply hosted-side; other
  context fields (country/region, eligibility) are accepted but advisory
  only, as in the reference core.
- Variation expansion is **bounded** (`MAX_VARIATION_FETCHES = 10` variable
  products per operation) to cap upstream fan-out; beyond the budget a
  variable product falls back to a parent-level summary.
- Catalog reads are **redis-cached ~60 s** (currency 1 h, categories 5 min),
  so stock/price changes can lag up to the TTL; the reference read live
  WC state per request.

Behavioral deltas:

- **Cancel** does not cancel a WooCommerce order: hosted sessions only
  materialise an order at Complete, which is terminal, so there is never a
  pending UCP order to cancel (the reference's hand-off pages could create
  one earlier).
- **Browser hand-offs**: the reference's `/ucp-cart/{id}` and
  `/ucp-checkout/{id}` server hand-off pages were replaced by the stateless
  `/checkout-link/` and the order-pay URL, so no hand-off code remains in
  the plugin.
- Response/webhook signing uses **one platform key**
  (`UCP_SIGNING_PRIVATE_KEY`, ES256 PEM) published in every store's profile,
  instead of a per-store key stored in the store's database. Unset key ⇒
  unsigned responses (graceful, like the reference without OpenSSL).

## Bridge contract (plugin `wc-ucp/v1`)

Authenticated by WooCommerce core's REST auth (the `wc-` namespace prefix)
with the consumer key/secret minted during connect; all amounts are integer
minor units.

| Route | Purpose |
|---|---|
| `POST /quote` | Line items + coupon codes + destination → per-line totals, coupon verdicts (WooCommerce's own reasons, plus title/type and per-line `allocations` from `WC_Discounts`), shipping options with per-rate tax, quoted item tax, `requires_shipping` — computed on a real, isolated `wc_load_cart()` session |
| `POST /orders` | Completed checkout session → real order via `WC()->checkout()->create_order()`; returns order summary + totals |
| `GET /orders/{id}` | UCP order entity snapshot (UCP-created orders only) |
| `POST /connection` | Hosted-UCP settings push after connect: store id, bridge secret, events/profile/endpoint URLs |
| `GET /store` | Store facts only WordPress knows (cached 5 min backend-side, invalidated instantly on settings save): configured privacy/terms pages (checkout `links`), real cart/checkout/shop page URLs (`continue_url` targets), currency and measurement units, the require-signatures toggle, the payment handler declarations, and the access/catalog policy (API key, allowed agent platforms, rate limit, include-out-of-stock) |
| `POST /charge` | Processes one payment instrument for a UCP order through `woo_ucp_process_instrument` (WOO_UCP_Stripe by default) — returns `charged` (order paid), `escalate` (3DS continue_url), `failed` (mapped reason), or `defer`; payment secrets never leave the store |
| `POST /tokens/introspect` | Resolves a user identity token issued by the store's OAuth server to its grant (active, user, scope, client) so the backend can enforce identity-linking scope gates |

Plugin → ecentic events: `POST /api/ucp/stores/{store}/events` with
`X-ecentic-Timestamp` + `X-ecentic-Signature: hex(hmac_sha256(bridgeSecret,
"{ts}.{body}"))`, 5-minute replay window.

## Deployment notes

- `UCP_SIGNING_PRIVATE_KEY` — EC P-256 PKCS#8 PEM (generate with
  `openssl ecparam -genkey -name prime256v1 | openssl pkcs8 -topk8 -nocrypt`);
  literal `\n` escapes are accepted for single-line storage. Registered in
  `turbo.json` build env and `declarations/environment.d.ts`.
- Redis (Upstash) backs sessions, negotiation-profile cache, idempotency,
  rate limits, and catalog caches.
- Migration `20260702130000_ucp_hosting` adds `store_account.bridgeSecret`
  and the `ucp_order` table (apply with `db:push`).
- In development only: plain-HTTP/private hosts are allowed for store URLs
  (connect SSRF guard) and agent profile URLs (negotiation), so local stores
  and local agent platforms are testable. Production requires public HTTPS
  for both.

## Verification status

Tested end-to-end against a real local WooCommerce store (plugin 2.0):
connect flow (OAuth + PKCE + token exchange + bridge configuration +
reconnect idempotency + state replay rejection), discovery proxy, negotiated
catalog search/lookup/detail (including option signals, selection narrowing,
input correlation, filter semantics, and the currency guard), carts with
simple and variation line items priced by the live cart, checkout through
completion (real order created), order reads, signed responses, idempotency
replay, and the HMAC events channel. Not yet exercised: webhook delivery to
a real agent platform (requires an HTTPS receiver), and payment-handler
flows (not implemented).
