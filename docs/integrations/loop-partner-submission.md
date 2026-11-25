# ecentic × Loop — partner submission draft

ecentic helps merchants improve the product information AI assistants use when
shoppers research and buy products. A merchant connects their own Loop account,
and ecentic reads return reasons to identify repeated differences between what
shoppers expected and what they received. It checks real AI assistant answers
about those products, proposes a product-information change for merchant review,
and tracks return counts and the share associated with that expectation gap
before and after the change, alongside comparable untreated products.

## Data access

**Data is read per merchant, only after that merchant enables the integration,
and is never combined across merchants.** Each connected Shopify store has its
own credentials, synchronization jobs, reason library, prompts and reports.

We read return IDs, states and timestamps; provider order identifiers for exact
joins; product and variant IDs; SKU/title; prices and currency; reasons and
parent reasons; redacted comments; outcomes; exchange variant IDs; and return
timestamps. These support repeat-gap detection, product mapping, variant
exchange direction and evidence for reviewed product-information changes.

We discard customer names, emails, addresses and customer objects at ingestion.
Emails, phone numbers and order references in comments are redacted before
storage or model processing. No cross-merchant comparison, benchmark, shared
prompt or training dataset is created.

## Authorization and webhooks

V1 uses a merchant-created API key with `returns` and `developer_tools`. The
application's hard HTTP allowlist permits only identity/return reads and the
creation, listing and deletion of its own webhook subscriptions. It blocks
return processing, cancellation, closing, flags, notes, labels and deep links.

Return-topic subscriptions: `return.created`, `return.updated`, `return.closed`.
Signatures are checked against raw bytes using base64 HMAC-SHA256 and constant-time
comparison, with support for secret rotation. Durable idempotent processing
acknowledges delivery before doing slow analysis.

OAuth installation, state/PKCE and server-side token exchange/refresh are behind
a disabled feature flag until Loop confirms the returns scopes and partner
installation requirements. API-key webhook authorization and `auth/me`
compatibility also need confirmation because the official pages differ.

## Retention and disconnection

Keys, tokens and webhook signing secrets use the application's existing
AES-256-GCM encryption at rest. Disconnect immediately removes saved credentials
and stops future processing. ecentic attempts to delete its own subscriptions;
if Loop is unreachable, the merchant is told how to complete that cleanup.
Detailed return rows are purged within 30 days, or immediately with **Delete
Loop data**. Derived comments, answer evidence and unpublished suggestions are
removed. Only previously reported product counts remain within that merchant's
reports. Database backup retention follows the actual hosting-provider policy.

## Boundaries

- We never write to a Loop return or act on a shopper's return request.
- We never pool or compare merchant return data.
- We do not duplicate Loop's overall Return Insights dashboard.
- We never publish product changes without merchant approval. A return-derived
  fit note is labeled as shopper feedback and always needs explicit approval.
- We do not infer that an order started in an AI assistant. Only an existing,
  verified direct AI Checkout receipt can establish that attribution.
- We do not claim measured return rates without ordered-unit denominators.
  The current store integration lacks order-line quantities, so v1 reports
  counts and gap shares; order-line ingestion is an explicit follow-up.
- The current publishing path updates the product description. It does not
  mutate structured variant attributes or invent facts from return comments.

## Reviewer test steps

1. Provide a Loop-approved test organization and a connected Shopify test store
   with matching product/variant identifiers. Sandbox availability is pending.
2. Create a key with the two scopes above and copy the webhook signing secret.
3. In ecentic Settings > Integrations, connect Loop for that store. Verify
   identity validation, backfill progress, last-sync status and the three active
   owned webhook subscriptions.
4. Create test returns with custom reason strings, a parent reason, a comment
   containing sample personal identifiers, and a same-product size exchange.
   Verify the custom mapping, redaction and evidence-backed exchange direction.
5. Provide five returns with the same fixable gap within 60 days, comprising at
   least 20% of that product's returns. Open Products > Return signals.
6. Check observed ChatGPT and Google AI Mode answers. Missing credentials,
   failed captures and missing factual support must remain unverified.
7. Review the saved product diff and evidence in the product page or Optimize.
   Approve the exact change on the test merchant only. A stale product revision
   must require a fresh proposal. Fit feedback cannot bypass approval.
8. Verify before/after counts and gap shares next to the frozen same-store
   control selection. Return rates must remain unavailable without order units.
9. Replay a signed webhook, alter its body, and use a wrong secret. Duplicates
   must not increase counts; invalid signatures must return `401`.
10. Verify cancellation updates, daily reconciliation, missing subscription
    repair, secret rotation, disconnect and immediate deletion. Confirm another
    store cannot access the return data, even when owned by the same account.

Automated fixtures cover these code paths without a live provider. Live partner
acceptance remains pending test-organization access and the confirmations below.

## Screenshot checklist

- [ ] Store-specific Loop connection instructions and read-only statement
- [ ] Connected status and last sync time
- [ ] Merchant reason override
- [ ] Flagged products ordered by affected return value
- [ ] Product gap with redacted comments and verified exchange direction
- [ ] Observed AI answers with clear verdicts
- [ ] Saved product diff and mandatory fit approval
- [ ] Published before/after counts, gap share and same-store controls
- [ ] Known direct AI Checkout cohort and attribution-coverage explanation
- [ ] Disconnect, cleanup-required state and Delete Loop data

Screenshots must use fixture/test-merchant data and contain no keys or customer
details. Keep them as files in the review folder; do not embed them in chat.

## Phase 2 — returns started inside an assistant

A shopper who ordered through direct AI Checkout could later ask the assistant
to start a return or exchange. We would send them to that merchant's Loop
returns portal through Loop's partner deep link. This needs a registered partner
app and a shared secret from Loop. It is not part of v1 and is not implemented.

Support email: **[SUPPORT_EMAIL]**

Documentation URL: **[DOCS_URL]**

## Questions for Loop developer relations

1. Is there a read-only returns scope, for API keys or OAuth, so partners don't hold a key that can process or cancel returns?
2. Should partner apps use OAuth with an Installation URL, or merchant-created API keys? Which scopes cover return data? Does partner OAuth support PKCE, and does `/api/v1/auth/me` accept API keys with a documented merchant-identity response?
3. The auth page says the Webhooks API needs OAuth, and the webhook setup page says an API key with Developer Tools works. Which applies to partners? Does create-webhook return the signing secret?
4. Is there a sandbox or test organization for partners, and what test-order/return workflow should reviewers use?
5. What do the App Marketplace listing and review involve?
6. How do we register for the partner deep link (Phase 2)?
