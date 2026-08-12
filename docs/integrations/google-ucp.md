# Google UCP (Agentic Checkout) — Merchant Guide + ecentic Automation Map

Google is rolling out the [Universal Commerce Protocol](https://ucp.dev/) on
its AI surfaces (AI Mode in Search, Gemini): users discover a product and
complete the purchase **directly on Google**, with the merchant as Merchant of
Record. This doc is (1) the merchant-facing checklist to go live, and (2) the
map of which steps ecentic can do programmatically on the merchant's behalf.

Status: **readiness audit + eligibility push are built** (see "What ecentic
automates" below for the implementation map); the customAttributes merge spike
is still open — the built verification loop surfaces its result. UCP is an
evolving standard and Google supports a subset of the spec; the integration is
**waitlist-gated** (Google must approve each merchant before go-live).

Primary sources:

- https://developers.google.com/merchant/ucp/guides/merchant-center
- https://developers.google.com/merchant/ucp/guides/ucp-profile
- https://developers.google.com/merchant/ucp/guides/checkout
- https://developers.google.com/merchant/ucp/guides/identity-linking
- https://developers.google.com/merchant/ucp/guides/orders
- Waitlist: https://support.google.com/merchants/contact/ucp_integration_interest

## Prerequisites

- Merchant Center account **in good standing**.
- Products **approved for free listings** (this is exactly what the existing
  Google Shopping integration establishes and monitors —
  `google-merchant-center.md`).

## Implementation at a glance (Google's six steps)

1. **Prepare Merchant Center** — shipping, returns, customer support, product
   feed attributes (details below). Then join the waitlist; Google must
   approve the integration before go-live.
2. **Google Pay payment handler** — lets users pay with Google Wallet
   credentials.
3. **Publish a UCP profile** — service/capability negotiation, payment
   handler discovery, public keys for signature verification.
4. **Native checkout** — three REST endpoints: session creation, updates,
   completion.
5. **User identification** — guest checkout (default, no extra work) or
   account-linked checkout (OAuth 2.0 profile sync).
6. **Order status sync** — call Google's webhooks to push order updates.

## Merchant checklist

### 1. Merchant Center settings

- [ ] **Return policy** configured — Merchant-of-Record requirement, shown on
  the checkout screen. Must include return cost, return window, and a link to
  the full policy. Options:
  - Account-level policies (Merchant Center returns settings); scope to
    product subsets with the `return_policy_label` attribute.
  - Product-level via the `returns` feed attribute (policy defined entirely
    in the feed, no Merchant Center entry needed).
  - **Advanced accounts:** policies must be configured on each individual
    sub-account, not the aggregator.
- [ ] **Customer support info** set — at least one of customer service URL,
  email, or phone. Generates the "Contact Merchant" link on the order
  confirmation page.

### 2. Product restrictions

The following are **ineligible for checkout** — keep
`native_commerce(checkout_eligibility)` empty or `FALSE` on them:

- **Financial / recurring:** subscriptions, installment/financing plans.
- **Custom goods & fulfillment:** personalized items (engraving, monograms),
  non-new or final-sale items (refurbished, used, no-returns), pre-orders,
  bundled services (warranties, installation), special shipping (freight,
  premium), gifting flows (split invoices, hidden prices), in-store
  activation.
- **Policy / safety:** age-restricted (alcohol, tobacco), prohibited content
  (weapons, adult, healthcare/pharma, counterfeits — standard Shopping
  policy).
- **Digital / services:** lessons and classes, travel packages (outside
  Travel rails), rentals, virtual/in-game items, goods requiring software
  installation before purchase.

### 3. Product data (feed attributes)

Google's recommendation is to ship these through a **supplemental data
source** rather than touching the primary feed — which is exactly the channel
ecentic already operates.

- [ ] **`native_commerce(checkout_eligibility)`** — boolean, opts a product
  into checkout. Missing or `FALSE` = not eligible (default `FALSE`). A bare
  `native_commerce` attribute remains supported as an alias.
- [ ] **`consumer_notice`** — mandatory where regulatory warnings apply
  (e.g. California Prop 65); displayed prominently at checkout. Attribute
  group with two sub-attributes:
  - `notice_type`: `legal_disclaimer` | `safety_warning` | `prop_65`
  - `notice_message`: string, max 1000 chars; `<b>`, `<br>`, `<i>`,
    `<a href>` allowed. In feed **files**, escape the URL colon
    (`http\://…`) to avoid attribute-validation errors. Multiple notices =
    repeat the `consumer_notice` group once per notice.
- [ ] **`merchant_item_id`** — required only when the feed `id` differs from
  the product ID the checkout API expects; when present it takes precedence
  over `id` in agentic requests.

Via the Merchant API these ride `productInputs.insert` as `customAttributes`
(top-level sibling of `productAttributes` — confirmed in the v1 GA discovery
document):

```json
"customAttributes": [
  { "name": "native_commerce",
    "groupValues": [{ "name": "checkout_eligibility", "value": "true" }] },
  { "name": "consumer_notice",
    "groupValues": [
      { "name": "notice_type", "value": "prop_65" },
      { "name": "notice_message", "value": "This product can expose you to chemicals..." }
    ] },
  { "name": "merchant_item_id", "value": "some_checkout_item_id_1" }
]
```

(The Content API v2.1 variant is deprecated — we never use it; our pipeline is
Merchant API v1 only.)

### 4. Checkout rails (steps 2–6)

- [ ] Join the waitlist and get Google approval.
- [ ] Google Pay payment handler set up.
- [ ] UCP profile published (payment handlers + signing keys discoverable).
- [ ] Checkout session endpoints implemented (create / update / complete).
- [ ] Identity path chosen — guest (default) or OAuth account linking.
- [ ] Order webhooks wired to Google.

## Who owns which step

| Step | Shopify store | WooCommerce store (future) |
|---|---|---|
| Merchant Center standing + product approval | ecentic monitors (diagnostics pull) | same, after GMC spike 2 |
| Returns / customer support settings | merchant (ecentic can **audit**, see below) | merchant (same audit) |
| Eligibility + notice feed attributes | **ecentic can push** via the existing supplemental source | same, after spike 2 |
| UCP profile, checkout endpoints, identity, order sync | **Shopify** — the platform owns checkout; ecentic does not insert itself into Shopify's payment rails | **ecentic's hosted UCP surface** (`server/app/ucp/`, see `woo-ucp-conformance.md`) is the store's UCP endpoint already — Google-specific deltas below |
| Google Pay payment handler | Shopify | new work (see gaps) |
| Waitlist application + Google approval | merchant (ecentic can only prep + point) | merchant |

The important asymmetry: for **Shopify** stores our leverage is Merchant
Center readiness + product data (Google's step 1) — the checkout rails are
Shopify's. For **WooCommerce** stores ecentic *is* the checkout rail: we
already serve UCP `2026-04-08` on behalf of connected Woo stores (discovery,
checkout sessions, orders, RFC 9421 signing, identity linking). That makes
steps 3–6 largely built — against the generic spec, not yet against Google's
profile of it.

## What ecentic automates

Implementation map (all Path 1, Shopify-gated like the rest of the GMC
integration):

- `server/utils/google-merchant.ts` — `listReturnPolicies`, `getBusinessInfo`,
  `CustomAttribute` type, `customAttributes` on `insertProductInput` and
  `MerchantProduct`, `lintUcpAttributes` (notice format = errors,
  restricted-category heuristics = warnings), `buildUcpCustomAttributes`
  (eligibility always emitted explicitly so opting out pushes a hard `false`).
- `google_merchant_ucp` table (migration `20260730120000`) + repository module
  `server/app/google-merchant-ucp.ts` — per-product eligibility, notice,
  checkout item id; a row is an explicit merchant choice, absence pushes
  nothing.
- `server/app/integration/google-merchant.ts` — `getUcpReadiness`,
  `getUcpProducts`, `setUcpProduct`; `pushOverrides` attaches the UCP custom
  attributes to the same insert as the listing override (an insert replaces
  the whole input, so one insert carries both); the push hash covers them but
  stays byte-identical to pre-UCP hashes when no UCP row exists (no mass
  re-push on rollout); `runVerification` additionally checks the merged
  product's `customAttributes` for our `native_commerce` value — UCP-only
  pushes verify without a title diff, and if custom attributes turn out not to
  merge from supplemental sources (open spike) the offers honestly stay
  `pending`/`reprocessedWithoutMerge` instead of lying `live`.
- `dashboard/[store]/google-shopping` — "Agentic checkout (UCP)" section
  (rendered once provisioned): readiness rows, static waitlist/platform rows,
  per-product eligibility toggle + notice editor (`ucp-checkout-client.tsx`).

### A. UCP readiness audit — built

All reads are covered by the `content` OAuth scope we already hold per
connected merchant, on the Merchant API `accounts/v1` surface (verified
against the cached discovery document):

| Check | API | Status in ecentic |
|---|---|---|
| Homepage claimed | `accounts/{id}/homepage` | built (`getHomepage`, shared with domain matching) |
| Return policy exists, has window + policy URL | `accounts/{id}/onlineReturnPolicies` (list) — `policy`, `returnPolicyUri` fields | built (`listReturnPolicies`) |
| Customer support contact set | `accounts/{id}/businessInfo` → `customerService.{email,uri,phone}` (≥1 required) | built (`getBusinessInfo`) |
| Products approved for listings | destination statuses on the processed products view | built (inside `getUcpReadiness`) |

Two of the checks are also **writable from ecentic** (both under the same
`content` scope):

- **Customer support contact** — `setCustomerSupport` →
  `businessInfo` PATCH with `updateMask=customer_service`. Full replace
  semantics (the PATCH swaps the whole customerService object). Inline form
  appears under the readiness row while unconfigured.
- **Return policy** — `setReturnPolicy` → `onlineReturnPolicies.create` of
  the account's **default** (unlabeled) policy: countries, window
  (days/lifetime), policy URL, return methods, item conditions, shipping
  cost, refund processing days. **Create-only by design**: the API has no
  update/patch for return policies, so when an unlabeled policy already
  covers a requested country ecentic refuses (instead of deleting a
  merchant-authored policy) and points to Merchant Center for edits. Policy
  *content* remains the merchant's input — ecentic validates format and
  transports it. Live-validator findings (2026-07-30, contradicting the
  discovery doc's "optional"): `processRefundDays`, `returnLabelSource`, and
  `returnShippingFee.fixedFee` (when `FIXED`; free = explicit
  `amountMicros: "0"`) are all required.

Surfaced as readiness rows in the Google Shopping page's UCP section:
Ready/Action-needed per row, red rows linking to the Help Center article that
fixes them, inline create/set forms for the two writable checks, and the
waitlist row activating once everything is green.
`getUcpReadiness` also counts offers whose merged view already carries the
`native_commerce` flag — the live proof the eligibility push landed.
Advanced-account caveat: return policies must exist on the *sub-account* —
we audit the linked account, which is the sub-account, so this is naturally
correct.

### B. Eligibility + notice push — built

Google's recommended transport (supplemental feed) is exactly the supplemental
data source ecentic already provisions and pushes through:

1. `insertProductInput` accepts an optional `customAttributes` array alongside
   `productAttributes` (top-level siblings on ProductInput, v1 GA).
2. Per-product UCP fields (eligibility boolean, consumer notice, optional
   checkout item ID) in `google_merchant_ucp` — merchant-editable, default
   **not eligible** (matches Google's default and keeps us out of the
   restricted-category liability).
3. Push lint: `lintUcpAttributes` warns when a product opted into eligibility
   looks restricted (subscription/pre-order/personalized/age-restricted/…
   heuristics over title/description) and hard-errors malformed notices (type
   enum, 1000-char cap, allowed-tag check).
4. The push hash covers the custom attributes, and stays byte-identical to
   pre-UCP hashes for products without UCP rows — rollout never mass
   re-pushes.

**Spike RESOLVED (live, 2026-07-31): custom attributes DO merge** from the
supplemental source through the `defaultRule` — with one critical catch:
**Google's processed view normalizes them**. Underscores become spaces in
names AND enum-ish values (`native_commerce` → `"native commerce"`,
`safety_warning` → `"safety warning"`), and group members lose their group
prefix (`notice_type` → `"type"`). Read-back comparisons must go through
`normalizeCustomAttributeToken` / `customAttributeGroupMatches`
(`server/utils/google-merchant.ts`) — the pushed spelling never matches
verbatim. Also observed live: Shopify's own primary feed already publishes
`merchant item id` (the ProductVariant GID) and `sku` as custom attributes
per offer, so per-variant checkout ids exist without ecentic setting them.

### C. What ecentic cannot automate

- The **waitlist application** and Google's integration approval — merchant
  contact with Google; we can only detect readiness and hand over the link.
- Merchant Center **policy standing** (suspensions, disapprovals are
  merchant-side fixes — we surface them, we can't clear them).
- **Content of** return policies and consumer notices — legal compliance
  (e.g. Prop 65 wording) is the merchant's responsibility; ecentic
  transports and validates format only.
- Shopify-side checkout rails — Shopify's relationship with Google, not ours.

### D. Hosted UCP for Google (WooCommerce, future)

If/when Google opens UCP to non-platform merchants, the hosted surface is the
asset: the store's `/.well-known/ucp` already points at
`https://ecentic.ai/api/ucp/stores/{store}` for checkout sessions, orders,
and identity linking. Known deltas to close before that's a Google
integration:

- **Google Pay payment handler** — Google-specific payment handler spec;
  today the Woo rail charges via the store's own Stripe through the plugin
  bridge.
- **Order sync direction** — Google wants order updates pushed to *its*
  webhooks; we currently fan out signed webhooks to subscribed agents. New
  outbound adapter, same event source (`ucp/events.ts`).
- **Google's supported-feature subset** — Google implements part of the UCP
  spec; capability negotiation must be validated against Google's actual
  profile, not just the reference agent.
- **GMC for Woo at all** — blocked on spike 2 (`google-merchant-center.md`),
  since eligibility attributes ride the Merchant Center feed.

## Sequencing

1. ~~**Readiness audit** (A)~~ — built (no new consent, no new scope).
2. ~~**customAttributes merge spike**~~ — resolved live 2026-07-31: merge
   works; Google normalizes attribute names/values in the processed view
   (see the spike note above).
3. ~~**Eligibility/notice push** (B)~~ — built (schema + pipeline + UI).
4. **Woo/hosted-UCP-for-Google** (D) — only after GMC spike 2 and once
   Google's merchant-facing UCP program is open beyond the waitlist.
