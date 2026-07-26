# Google Merchant Center — Hybrid Channel-Partner Integration

> Status: Path 1 server-side implemented (link + supplemental overrides + diagnostics).
> **Validation spike 1 (Shopify) passed on a live account** — findings folded in below.
> Spike 2 (WooCommerce) still open. Path 2 (full API provisioning) is documented but not built.
> Everything targets **Merchant API v1** (v1beta is dead, Content API is sunsetting).

## Spike 1 results (Shopify, live account) — facts replacing assumptions

1. **Attribute-level merge works as designed.** Supplemental title +
   `customLabel0` overrides appeared on the processed offer while description,
   link, image, price, and availability kept flowing from the Shopify channel.
2. **The primary's defaultRule does NOT pick up supplemental sources
   automatically.** The Shopify primary ships `takeFromDataSources: [{self:
   true}]`; the first insert returned 200 and merged nothing. An explicit
   `dataSources.patch` setting `[supplemental, self]` made it work — and the
   patch is accepted (Shopify does not lock rule editing on its source). The
   rule patch is therefore a **mandatory provisioning sub-step with a hard
   gate**, not a fallback: provisioning isn't complete until the primary's rule
   shows our source first. It must be read-modify-write (PATCH replaces the
   whole list), with watchdog coverage afterward — a merchant can reorder or
   remove the source in Merchant Center and silently disable every override
   while inserts keep returning 200.
3. **Identifiers are quirkier than documented.** Feed label was
   `USD_101961335098` (a Shopify-managed label, **not** a country code) and the
   offer ID was `shopify_ZZ_{productId}_{variantId}`. Both must be read from
   the live account per merchant and matched exactly — an insert with a wrong
   triplet succeeds but creates an orphan instead of merging. Any code with a
   `"US"` default is a latent bug.
4. **Reprocessing is lazy — push ≠ live.** A rule change alone didn't touch the
   processed product for hours; a fresh `productInputs:insert` forces
   reprocessing of that offer. The reliable merge signal is
   `productStatus.lastUpdateDate` advancing past the write, so merge-health
   checks must be async, never assert-after-push. Dashboard consequence: the
   honest lifecycle is *optimizing → applied, going live (may take a few
   hours) → live on Google* — never "optimized ✓" at push time.
5. **Google policy-validates overridden attributes as the merchant's own
   data** (an all-caps test title immediately drew `title_all_caps`), so
   optimization output gets a policy lint before push — a disapproval caused
   by our rewrite is the worst failure mode this product has.

Open (not contradicting anything): the same protocol against Google for
WooCommerce — offer-ID format, feed-label convention, and whether its primary
accepts the rule patch are unverified there.

## Spike 3 results (services:propose, live) — facts replacing assumptions

1. **Request shape:** `ProposeAccountServiceRequest` takes `provider` as a
   TOP-LEVEL field next to `accountService` (`AccountService.provider` is
   output-only — nesting it sends an empty provider). The live validator
   accepts `accounts/{ECENTIC_MCA_ID}` for the provider reference (the
   discovery description says `providers/123`; the read-back format is
   ambiguous, so provider comparisons match on the numeric id).
2. **Approval direction is inverted from the original plan.** We propose with
   the *merchant's* credentials, so the account side has consented at propose
   time and the pending approval sits with the **provider (our MCA)** — no
   approval request ever appears in the merchant's dashboard. When the same
   Google login administers both sides (test setup), the handshake jumps
   straight to `ESTABLISHED`. For real merchants the proposal will sit
   `PENDING` until **ecentic approves from the MCA side** via
   `services.approve` with partner credentials (service account with admin on
   the MCA) — the merchant already consented in our UI, so this should be
   automatic in the maintenance cron. **Partner credentials + auto-approve are
   the gating gap for real merchants.**
3. The established link is visible under the merchant account's Settings →
   People and access (the MCA listed with account-management access) and in
   the MCA's managed-accounts list — not under "Linked accounts".

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
3. **Link:** propose an `accountManagement` service on their account with
   their credentials (`accounts/{THEIR_ID}/services:propose` — top-level
   `provider: accounts/{ECENTIC_MCA_ID}` next to `accountService`, see spike 3).
   The merchant consents in **our** UI before the propose fires (the UI warns
   what management access means); the pending approval then sits on the
   provider side, where ecentic auto-approves with partner credentials
   (`services.approve` — not yet wired; test setups self-establish).
4. **Attach optimization:** create a supplemental data source on their account
   via `dataSources.create`, **patch the primary's defaultRule to list our
   source first** (spike 1: auto-pickup never happens; read-modify-write, hard
   gate — provisioning is incomplete until the rule is confirmed), then push
   attribute overrides with `productInputs:insert` keyed to the primary feed's
   offer IDs.

   **Offer-ID matching — read, don't reconstruct.** Shopify's channel generates
   IDs like `shopify_ZZ_{productId}_{variantId}` (spike 1 — the middle segment
   is not a real country code). We do not attempt to reproduce that scheme.
   Instead, with the management link active, we call `accounts.products.list`
   on their account, read the **actual** offer IDs the primary feed produced,
   and match them back to our products by the embedded platform product id.
   One override is pushed per matching offer (variants of one product share
   the optimized title/description).

   **Merge keys are more than the offer ID.** Supplemental data merges on
   `(offerId, contentLanguage, feedLabel)`. The supplemental data source
   itself is created **bare** — `feedLabel`/`contentLanguage` are only legal
   on file-input data sources and are rejected as unexpected fields on
   API-input ones (spike 3). The triplet instead rides on every
   `productInput`, copied from the live offer it targets — never assumed
   (Shopify labels look like `USD_101961335098`). A wrong triplet inserts
   successfully and merges nothing.

   **Push lifecycle.** Each pushed offer is tracked in
   `google_merchant_offer`: override bodies are hashed (unchanged bodies are
   skipped, so re-pushing is always safe), inserts land as `pending`, and an
   async verification pass — gated on `productStatus.lastUpdateDate` advancing
   past the push — flips them to `live`. Optimization output passes a policy
   lint before any insert.
5. **Diagnostics:** pull item issues, disapprovals, and account issues into the
   ecentic dashboard — this is the visible product surface.

### Path 2 — fallback (no plugin)

Plugin refused, unsupported setup, or the later premium tier. Full API
provisioning. **Not yet implemented** — documented so the boundary is explicit:

- No existing account → `accounts:createAndConfigure` with partner
  credentials: account details, `user` array with
  `{userId, user: {accessRights: ["ADMIN"]}}` and
  `verificationMailSettings: {verificationMailMode: "SUPPRESS_VERIFICATION_MAIL"}`,
  `service` array with `{accountManagement: {}, provider: "accounts/{ECENTIC_MCA_ID}"}`.
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

- **Rule position** — is our supplemental source still first in the primary's
  `takeFromDataSources`? A merchant reordering or removing it in Merchant
  Center silently disables every override while inserts keep returning 200
  (`checkRuleHealth` re-checks and repairs).
- **Supplemental-feed merge health** — overrides actually appearing on offers.
  The verification pass diffs processed attributes for every `pending` offer,
  gated on `lastUpdateDate`; `reprocessedWithoutMerge` results are the
  rule-broke signal. Offer-ID schemes silently change when a merchant changes
  markets or variants (verification flags rows whose offers vanished).
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

1. ~~Test store with the Shopify Google channel installed → confirm a
   supplemental data source merges attribute overrides onto the channel's
   feed; inspect the primary data source's default rule; nail the offer-ID
   matching.~~ **Done — passed** (see "Spike 1 results" above; rule patch
   promoted to a required provisioning step).
2. Same check for Google for WooCommerce (its feed behavior is less
   standardized — this decides how often WooCommerce merchants land in
   Path 2). Sharpened checklist from spike 1: offer-ID format, feed-label
   convention, and whether its primary accepts the rule patch.
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
| OAuth + Merchant API v1 client + policy lint | `apps/web/src/server/utils/google-merchant.ts` |
| Credential/link state (1:1 with store) | `google_merchant_account` table, `apps/web/src/server/app/google-merchant-account.ts` |
| Offer push lifecycle (hash, pending → live) | `google_merchant_offer` table, `apps/web/src/server/app/google-merchant-offer.ts` |
| Path 1 actions (connect, detect, propose, provision + rule gate, push, verify, rule watchdog, diagnostics) | `apps/web/src/server/app/integration/google-merchant.ts` |
| OAuth routes | `apps/web/src/app/(provider)/api/integrations/google/{install,callback}/route.ts` |
| Maintenance cron (approval poll + rule watchdog + verification) | `apps/web/src/app/(provider)/api/cron/google-merchant/route.ts` (Bearer `CRON_SECRET`, ~10 min cadence) |
| Settings UI (state machine + offer lifecycle) | `apps/web/src/app/(main)/dashboard/settings/_components/settings/google-merchant-controls.tsx` |
| Hosted feed (Perplexity + Path 2 scheduled fetch) | `apps/web/src/server/app/feed-export.ts` |

**Platform gate:** Path 1 actions accept `shopify`/`shopify-public` stores
only. WooCommerce surfaces as "coming soon" (settings UI + connect error)
until spike 2 validates it; feed/CSV stores need Path 2.
