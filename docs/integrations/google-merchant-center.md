# Google Merchant Center — Hybrid Channel-Partner Integration

> Status: Path 1 server-side implemented (link + supplemental overrides + diagnostics).
> Path 2 (full API provisioning) is documented but not built.
> Everything targets **Merchant API v1** (v1beta is dead, Content API is sunsetting).

---

## Core architecture

ecentic is a **channel partner** layered on top of independent Shopify/WooCommerce
stores with their own domains. Two structural decisions anchor everything:

1. **Relationship model: `accountManagement`** — merchant-owned Merchant Center
   accounts linked to our advanced account (MCA). Not `accountAggregation`:
   merchants keep their account, history, and domain claim if they churn;
   existing accounts can be linked with the same mechanism; and one merchant's
   policy problems can't structurally endanger our account tree.

2. **Feed model: the native Google plugin is the primary feed; ecentic is a
   supplemental data source on top.** The Shopify Google & YouTube channel /
   Google for WooCommerce plugin owns real-time price/inventory sync, website
   verification, and the domain claim — which removes both the freshness
   liability (price mismatches → misrepresentation suspensions) and the Shopify
   claim conflict from our plate. Our optimization ships as **attribute
   overrides** (titles, descriptions, product types, custom labels, GTIN fixes)
   merged over the primary feed by offer ID. Feed optimization and storefront
   content stay decoupled: we never edit their live store data as a side effect
   of feed work.

### Relationship to the existing hosted feed

`apps/web/src/server/app/feed-export.ts` already serves a full Google
Shopping–spec feed per store at `/api/feeds/google/{store}?token=...`. Under
this hybrid architecture:

- The hosted feed **stays** — the Perplexity Merchant Program ingests the same
  URL, and it remains the Path 2 scheduled-fetch rail for merchants without the
  native plugin.
- The hosted feed emits `g:id` = `product.externalId` (raw platform product
  id), which will **never** match the native channel's
  `shopify_{country}_{productId}_{variantId}` scheme. A merchant moving to
  Path 1 must have the old pasted feed **removed from their Merchant Center
  first** — otherwise they get duplicate/conflicting offers, not merges.

---

## One-time setup (ours)

1. Own Merchant Center account → request **advanced account** conversion
   (Settings → General → Account setup; needs admin access, no existing
   violations, not already an MCA/sub-account).
2. GCP project with the Merchant API enabled and registered.
3. Two credential paths:
   - **Partner credentials** for provisioning/management (service account or
     our own OAuth grant against our MCA).
   - **Merchant-facing Google OAuth** (scope
     `https://www.googleapis.com/auth/content`) for merchant-consent steps.

Env (see `CLAUDE.md`): `GOOGLE_MERCHANT_CLIENT_ID`,
`GOOGLE_MERCHANT_CLIENT_SECRET`, `ECENTIC_MCA_ID`.

---

## Onboarding flow

Merchant clicks "Connect Google" in ecentic → Google OAuth
(`/api/integrations/google/install?store={storeId}`) → callback exchanges the
code, stores tokens in `google_merchant_account` (1:1 with `store`, mirrors
`store_account`), calls `accounts.list` with their credentials to detect
existing Merchant Center accounts. Then route:

### Path 1 — primary (has or will have the native plugin)

Most Shopify merchants land here; many are already mid-setup.

1. **Already runs the Google channel:** their account and claim exist. Skip
   straight to linking.
2. **Not yet:** prompt them to install the native plugin in their store admin
   and complete its Google connection. This is the one step outside our UI —
   accept it; the plugin does account creation, verification, and claiming
   better than we can fight it. Detect completion by polling `accounts.list`
   with their OAuth (`detectAccount`).
3. **Link:** propose an `accountManagement` service from our MCA to their
   account (`accounts/{THEIR_ID}/services:propose`, provider
   `providers/{ECENTIC_MCA_ID}`); the merchant approves the request in Merchant
   Center. UI warns what management access means before we send it.
4. **Attach optimization:** create a supplemental data source on their account
   via `dataSources.create`, then push attribute overrides with
   `productInputs:insert` keyed to the primary feed's offer IDs.

   **Offer-ID matching — read, don't reconstruct.** Shopify's channel generates
   IDs like `shopify_{country}_{productId}_{variantId}`. We do not attempt to
   reproduce that scheme (guessing target country, enumerating variants from
   `rawData`). Instead, with the management link active, we call
   `accounts.products.list` on their account, read the **actual** offer IDs the
   primary feed produced, and match them back to our products by the embedded
   platform product id. One override is pushed per matching offer (variants of
   one product share the optimized title/description).

   **Merge keys are more than the offer ID.** Supplemental data merges on
   `(offerId, contentLanguage, feedLabel)`. The supplemental data source is
   created with `feedLabel`/`contentLanguage` copied from the channel's primary
   data source. The primary data source's **default rule** must also include
   our supplemental source — inspecting (and if needed patching) that rule is
   part of validation spike 1.
5. **Diagnostics:** pull item issues, disapprovals, and account issues into the
   ecentic dashboard — this is the visible product surface.

### Path 2 — fallback (no plugin)

Plugin refused, unsupported setup, or the later premium tier. Full API
provisioning. **Not yet implemented** — documented so the boundary is explicit:

- No existing account → `accounts:createAndConfigure` with partner
  credentials: account details, `user` array with
  `{userId, user: {accessRights: ["ADMIN"]}}` and
  `verificationMailSettings: {verificationMailMode: "SUPPRESS_VERIFICATION_MAIL"}`,
  `service` array with `{accountManagement: {}, provider: "providers/{ECENTIC_MCA_ID}"}`.
  Then with merchant credentials, in order: `users/me:verifySelf`
  (PENDING → VERIFIED, replaces the email invite) →
  `accounts.updateBusinessInfo` setting `address.regionCode` (required before
  ToS) → display ToS in our UI, get explicit consent, `termsOfService.accept`.
  Log consent (version + timestamp) on `google_merchant_account`.
- **Verification + claim, per domain:** set homepage URI → Site Verification
  API `getToken` → inject the meta tag → `insert` to verify (the verifying
  identity must be a user on the account) → `homepage:claim`.

  **Shopify caveat:** our current scopes are `read/write_script_tags`.
  ScriptTags inject via JS at runtime, but the Site Verification META method
  checks **static HTML** — ScriptTag injection will not pass. Real options: a
  theme app embed block (merchant must enable it in the theme editor) or the
  `write_themes` scope (heavier Shopify review friction; see
  `docs/context/shopify.md`). WooCommerce `wp_head` injection works
  server-side. This weakens Shopify Path 2 specifically and further justifies
  Path 1 as the Shopify default.

  If the domain is already claimed elsewhere, **stop and surface it** —
  overwrite via API is restricted to approved developers, and force-claiming
  breaks the merchant's existing sync. Manual resolution branch, never silent.
- **Primary feed ownership:** webhook listeners on Shopify/Woo for
  price/inventory changes, near-real-time `productInputs` updates, automatic
  item updates enabled as backstop. This operational load is exactly why
  Path 2 isn't the default. (Interim rail: the existing hosted feed URL as a
  Merchant Center scheduled fetch — freshness capped at the fetch cadence.)

---

## Storefront optimization — separate product, separate consent

ecentic's AI-agent-readability work (schema.org markup, on-page content,
descriptions as agents see them) ships as an explicit opt-in deliverable
through our store plugin, with the merchant approving changes to their live
storefront. Never bundled invisibly with feed work — different surface,
different craft, different consent boundary.

---

## Monitoring (per merchant)

- **Supplemental-feed merge health** — overrides actually appearing on offers.
  Diff pushed override offer IDs against `products.list` results (are the
  optimized titles live on the processed offers?), not just disapproval counts.
  Offer-ID schemes silently change when a merchant changes markets or variants.
- Disapproval and item-issue rates.
- ToS state re-checks (`retrieveForApplication` flags new required versions).
- Path 2 accounts: verification state via Site Verification `list`, with
  automatic tag re-injection and re-claim on loss. Re-claiming an
  already-claimed site just rechecks verification and errors without clearing
  the claim, so there's a grace window.
- Pre-screen catalogs before pushing; aggregate health is our partner
  reputation.

---

## Week-one validation (before building anything bigger)

Manual — needs real accounts; the code in this repo is the harness for it.

1. Test store with the Shopify Google channel installed → confirm a
   supplemental data source merges attribute overrides onto the channel's
   feed; inspect the primary data source's default rule; nail the offer-ID
   matching. **The entire hybrid rests on this one assumption.**
2. Same check for Google for WooCommerce (its feed behavior is less
   standardized — this decides how often WooCommerce merchants land in
   Path 2).
3. Run one full `services:propose` → merchant-approve cycle and screenshot the
   linking UX for onboarding copy.

## Sequencing

Validation spikes → Path 1 end-to-end (link + supplemental + dashboard) →
diagnostics surface → Path 2 fallback → storefront add-on → Path 2 as premium
tier with feed experiments.

---

## Implementation map

| Piece | Where |
|---|---|
| OAuth + Merchant API v1 client | `apps/web/src/server/utils/google-merchant.ts` |
| Credential/link state (1:1 with store) | `google_merchant_account` table, `apps/web/src/server/app/google-merchant-account.ts` |
| Path 1 actions (connect, detect, propose, data source, push, diagnostics, merge health) | `apps/web/src/server/app/integration/google-merchant.ts` |
| OAuth routes | `apps/web/src/app/(provider)/api/integrations/google/{install,callback}/route.ts` |
| Hosted feed (Perplexity + Path 2 scheduled fetch) | `apps/web/src/server/app/feed-export.ts` |
