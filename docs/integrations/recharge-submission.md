# Recharge Marketplace submission worksheet

## App information

ecentic helps ecommerce brands present accurate product and subscription offers
to AI assistants. Its Recharge integration reads subscription plans, discounts
and delivery intervals, adds verified terms to the product data merchants
publish, and checks sampled AI answers for missing or incorrect offers. It also
links verifiable AI-started Shopify first orders to Recharge subscriptions and
tracks whether they remain active. Recharge commerce data is read-only. The
Shopify checkout handoff lets buyers review and pay on Shopify; it does not
claim that every purchase completes inside an assistant.

Support email: **[OWNER TO FILL]**

Public support/docs URL: **[OWNER TO FILL]**

App icon, listing images, privacy URL and terms URL: **[OWNER TO CONFIRM]**

## Requirements and scopes

Verified in the replacement [ecentic OAuth app](https://www.admin.rechargeapps.com/partners/apps/145292)
on 24 November 2026. Production credentials are configured; the registered
callback is `https://www.ecentic.ai/api/integrations/recharge/callback`.

| Selected portal permission | Reason |
| --- | --- |
| `read_products` | Retained in the existing grant; Shopify sync uses the imported Shopify catalog and does not call Recharge v2 `/products` (Custom-only) |
| `read_plans` | Read plan discounts, delivery intervals and selling-plan mappings |
| `read_orders` | Match exact Shopify first-order IDs and subscription line items |
| `read_subscriptions` | Read subscription creation, activation and cancellation status |
| `store_info read_shop read_store` | Verify the authorized store identity; this is the portal's combined store-permission option value |

Customers and all other permission options are set to None. No business-data
write scopes are selected. Current matching requires no separate customer
endpoint. Webhook registration is infrastructure configuration using each
topic's read permission.

Production configuration belongs to the existing Vercel project
`zennit/ecentic`, in its Production environment: `RECHARGE_CLIENT_ID`,
`RECHARGE_CLIENT_SECRET`, and `RECHARGE_REDIRECT_URI`. The redirect value must
match the registered callback above; credential values stay in deployment
secrets and are not included in this worksheet.

Separate Shopify dependency: existing catalog scopes plus `read_orders` for
paid-order notifications. Existing installations must reauthorize this scope.

## Webhook topics

`subscription/created`, `subscription/cancelled`, `order/created`, and
`recharge/uninstalled`. Live registration succeeded on 24 November 2026;
delivery still needs dev-store verification. Daily reconciliation covers missed
events, involuntary cancellations, stale offers and removed registrations.
Confirm a distinct partner-app removal notification with Recharge.

Raw request bytes are signature checked before parsing. Sanitized events are
persisted before acknowledgement; processing is asynchronous and idempotent.

## Data and retention

Store/product/variant/plan/order/subscription identifiers, offer prices and
terms, status timestamps, and verifiable checkout attribution are retained
while connected. OAuth credentials and pending grants are encrypted with the
application's existing AES-256-GCM credential envelope. Customer names, email
addresses, postal addresses and payment information are not retained.
Answer checks retain bounded evidence excerpts, offer snapshots, surface,
market, prompt, time and outcome.

Disconnect deletes credentials and detailed integration records, fences old
jobs, and preserves only aggregate counts with an as-of date. Store/account
deletion removes those aggregates. Backups follow the hosting retention policy.

## Reviewer testing

Use the dedicated `ecentic-recharge-test.myshopify.com` dev store and the detailed
[local/reviewer runbook](./recharge.md). Reviewer account and test-payment
instructions: **[OWNER TO SUPPLY SECURELY]**.

1. Connect Recharge, including signed-out installation and expired-code recovery.
2. Compare imported variant plans, discounts and delivery intervals with Recharge.
3. Create a marked subscription cart through `create_shopify_checkout`; complete
   a test payment on Shopify and verify one attributed first order.
4. Cancel/reactivate the subscription; verify current status and cancellation date.
5. Replay events and test a renewal order; first-order counts remain stable.
6. Request a real answer check, inspect evidence, and verify Not checked or
   Inconclusive states where no reliable observation exists.
7. Publish approved subscription terms and verify storefront delivery without
   replacing the ordinary purchase price.
8. Disconnect with queued work, verify data deletion and frozen aggregate counts.

## Screenshot checklist

- [ ] Connect Recharge and connection status/last successful sync
- [ ] Variant-specific offers with discounts and delivery terms
- [ ] AI-answer checks with evidence and clear coverage limits
- [ ] AI-started first orders, subscription conversion and still-active counts
- [ ] Cancellation/reactivation results
- [ ] Reconnect after an expired grant
- [ ] Disconnected settings state
- [ ] Rendered storefront subscription terms

## Submission readiness

Automated tests are evidence of implementation behavior, not proof of a live
Recharge installation or Marketplace approval. Before submission, complete the
dev-store exercise, fill the owner placeholders, resolve every
`TODO(recharge-confirm)` in the runbook, verify the deployed Shopify theme embed,
and collect the screenshots. Submit app information, requirements, support,
marketing and testing materials through the Tech Partner Academy review flow.
