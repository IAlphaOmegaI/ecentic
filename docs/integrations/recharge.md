# Recharge partner integration

Updated 24 November 2026. Connector source: `apps/plugins/recharge`.
The existing Next.js web app hosts OAuth, webhooks, jobs and merchant controls.
Recharge subscriptions, orders, products and plans are read-only. The only
provider mutations configure webhook delivery and exchange/refresh OAuth grants.

## What the metrics mean

- Subscription offers are keyed by store, Shopify product/variant and Recharge
  plan. Unknown prices, unsupported prepaid terms and unmapped products remain
  unavailable; they are never guessed from another variant's price.
- An AI-started first order has a signed `_ecentic_ai_checkout` receipt issued
  by ecentic and an authenticated Shopify paid-order delivery. A receipt can
  credit only one order. `_ecentic_ai_ref`, referrers and nearby visits do not
  establish this metric. It is independent of ecentic performance-fee billing.
- The new `create_shopify_checkout` assistant tool creates a Shopify cart and
  returns its checkout URL. The buyer reviews and pays on Shopify. This is an
  AI-started handoff, **not proof of a payment completed inside an assistant**.
  Shopify's platform-managed assistant checkouts are not automatically covered.
- Match the exact Shopify order ID to Recharge `external_order_id.ecommerce`,
  then subscription line-item `purchase_item_id`. One first order may have
  multiple subscriptions. Conversion figures count distinct first orders, so
  such an order does not inflate conversion rate. The active subscriber figure
  counts distinct active subscriptions linked to those orders.
- Answer checks are sampled, dated captures from ChatGPT and Google AI Mode.
  They are separate from simulation win rates. A missing offer is reported only
  where the evidence concerns the identified product and subscription question.
  No successful evidence means Not checked or Inconclusive, never a measured zero.

## Partner portal setup

The existing [ecentic OAuth app](https://www.admin.rechargeapps.com/partners/apps/144935)
was inspected in the partner portal on 24 November 2026. Its client ID and
client secret are available. This verifies portal configuration; live install
testing and Marketplace approval remain unverified.

1. Use the existing ecentic OAuth app under Apps.
2. Its registered production callback is
   `https://www.ecentic.ai/api/integrations/recharge/callback`.
   For local dev-store testing, use a registered HTTPS tunnel callback to the
   local Next.js server and match `RECHARGE_REDIRECT_URI` exactly.
3. The selected permissions are `read_products`, `read_plans`, `read_orders`,
   `read_subscriptions`, and the store permission option whose value is
   `store_info read_shop read_store`. This is one combined portal selection. Customers and all other
   permission options are set to None. No business-data write scopes are selected.
4. Configure the three Recharge variables below in the Production environment
   of the existing Vercel project `zennit/ecentic`. Locally, use untracked
   `apps/web/.env.local`; do not commit real client credential values.
5. Install Recharge on `ecentic.myshopify.com` and create a subscribable product
   with two variants, two delivery plans, and a known discount.
6. Connect the Shopify dev store to ecentic. Existing installations must
   authorize Shopify `read_orders` again so `orders/paid` can be registered.
7. In ecentic Settings → Integrations, connect Recharge for that verified store.
   The install link uses `ecentic`, without `.myshopify.com`.

## Configuration and local commands

The production deployment target is the existing Vercel project
`zennit/ecentic`. Its Production environment uses these three Recharge
variables, also documented in `apps/web/.env.example`:

| Variable | Value |
| --- | --- |
| `RECHARGE_CLIENT_ID` | Partner app client ID |
| `RECHARGE_CLIENT_SECRET` | Partner app secret; webhook validation |
| `RECHARGE_REDIRECT_URI` | `https://www.ecentic.ai/api/integrations/recharge/callback` |

Existing configuration: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_BASE_URL`, `APP_HOST`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`,
`CRON_SECRET`, and the independent 32-byte base64 `CREDENTIAL_ENCRYPTION_KEY`.
Webhook URLs use the canonical `APP_HOST` (`https://ecentic.ai` in production)
to avoid the `www` hostname's redirect. The OAuth `redirect_uri` remains the
exact registered `RECHARGE_REDIRECT_URI` above. When `APP_HOST` is unset, webhook
URLs fall back to the callback origin.
Configure `SCRAPELLM_API_KEY` and the existing AI extraction provider to run
actual answer captures. Capture requests are merchant initiated and capped at
ten per store per UTC day; installing Recharge does not start paid captures.

From the repository root:

```sh
bun install
bun run build:packages
cd apps/web
bun run db:migrate
bun run dev
```

Use an isolated local database. These migrations add Recharge tables, indexes,
and the retained daily answer-capture budget; they do not reset existing data.
The repository's historical migration chain currently repeats `agent_api_key`
creation on a completely empty database. Until that pre-existing baseline issue
is repaired, bootstrap a **new disposable development database only** with
`bun run db:push --force`. Do not use that shortcut on a populated database.
Both Recharge migrations were separately verified against the current baseline
schema. Set the auth/base/callback origins to the same
HTTPS tunnel origin, then reconnect if the tunnel hostname changes.
Local development does not run Vercel Cron automatically: invoke the protected
Recharge cron routes with `Authorization: Bearer <CRON_SECRET>` to drain work.
`/api/cron/recharge` drains provider jobs, `/api/cron/recharge-maintenance`
repairs hooks and schedules reconciliation, and `/api/cron/recharge-checks`
handles queued answer captures separately.

Run the relevant suites from the repository root with
`bun run --filter=web --filter=@ecentic/recharge test`.
`bun run test` additionally covers other applications; the unchanged outbound
app currently fails its private/IP sending-domain validation test.
For the recorded-response lifecycle fixture against a disposable database with
the current schema, run from `apps/web`:

```sh
RECHARGE_TEST_DATABASE_URL=postgres://USER@localhost/TEST_DB bun test src/server/spec/recharge-integration.dbtest.ts
```

This fixture creates and removes its own test records and mocks Recharge HTTP;
it requires no live provider credentials. The package's isolated typecheck is
`cd apps/plugins/recharge && bun run typecheck`. The web repository currently
has pre-existing TypeScript errors; compare new diagnostics with the baseline.

OAuth retains the short-lived code in encrypted server-side pending-install
storage, referenced by an opaque HTTP-only cookie. Sign-in continues through
`/api/integrations/recharge/resume`; a mismatched shop is rejected. Expired
codes display a reconnect path. No code, access token, refresh token, raw order
body, names, emails or addresses are written to logs.

## Reviewer/dev-store exercise

1. Install while signed out; sign in and verify that the same install resumes.
   Repeat with an expired code and confirm a clear reconnect path.
2. Wait for initial sync. Verify both variants and every plan against Recharge.
   Confirm currency, discount and delivery/charge intervals. Unavailable prepaid
   pricing should remain explicitly unavailable.
3. Use an authenticated ecentic assistant connection with access to the store:

   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "create_shopify_checkout",
       "arguments": {
         "store": "ECENTIC_STORE_ID",
         "variant": "SHOPIFY_VARIANT_ID",
         "plan": "RECHARGE_PLAN_ID",
         "quantity": 1
       }
     }
   }
   ```

   Send to `/api/mcp` using the existing merchant API bearer credential. The
   values above are placeholders. Omit `plan` to test a one-time first order.
4. Open the returned checkout URL and complete a Shopify test payment. Confirm
   `_ecentic_ai_checkout` in Shopify order attributes. Verify the exact Shopify
   order ID, Recharge order and subscription link in the dashboard. A merely
   created cart must not count as an order.
5. Cancel and reactivate the test subscription in Recharge's own merchant UI.
   The app must reflect current status after webhook processing/reconciliation.
   Repeat a webhook and deliver an older event after a newer one; counts must
   not increase or regress. Recurring renewal orders must not count as new
   AI-started first orders.
6. Request answer checks. Inspect sampled surface, time and evidence. Missing
   credentials or ambiguous product/variant identification must not produce
   successful-check counts.
7. Publish the product using ecentic's existing approval flow. Verify subscription
   terms in generated structured data and the rendered storefront. The normal
   purchase price and Google feed price must remain unchanged. The existing
   theme embed is a deployment dependency: a saved metafield alone is not proof
   that an assistant can read it.
8. Disconnect while jobs are queued. Confirm credentials, offer/check data and
   individual attribution rows are removed, jobs stop, and only aggregate
   counts remain. Reinstall and replay an old webhook; old work must not restore
   the previous connection or private data.

## Operations and retention

All Recharge API attempts use the same per-store database reservation. Requests
are paced conservatively at two per second and 429 responses wait at least two
seconds with jitter. Jobs checkpoint per page and use expiring leases plus an
installation generation so another instance can recover after a crash.
Every authenticated webhook is projected into IDs, statuses and timestamps
before durable enqueue. No raw customer/order webhook body is retained.

Daily maintenance checks webhook registrations and reconciles offers and
subscription status, including involuntary cancellations that do not emit
`subscription/cancelled`. Tokens refresh on 401 and before expiry only when
Recharge supplies an expiry. No undocumented expiry duration is assumed.
Use the existing credential rotation script after applying Recharge migrations;
it now includes tokens and pending OAuth codes/grants.

Disconnect removes tokens and detailed Recharge state immediately and freezes
aggregate counts as of disconnect. Account/store deletion cascades those
aggregates too. Expired OAuth attempts and completed job records are purged by
maintenance; database backups follow the hosting environment's retention policy.

## Open provider confirmations

- `TODO(recharge-confirm)`: whether this app requires client secret in token
  exchange/refresh; expiry and refresh-token rotation contract. Current official
  examples omit client secret and expiry.
- `TODO(recharge-confirm)`: notification and revocation when the **ecentic
  partner app** is removed. `recharge/uninstalled` means Recharge itself removed.
- `TODO(recharge-confirm)`: stable event/delivery-ID header and retry identity.
  Never use a webhook-registration ID as an event ID.
- `TODO(recharge-confirm)`: validate both signature schemes on the dev store.
  New timestamp-bound HMAC is preferred; legacy SHA-256(secret + raw bytes) is
  supported when the newer header is absent. An invalid new signature cannot
  fall back to legacy validation.
- `TODO(recharge-confirm)`: prepaid billing-price semantics and Shopify selling
  plan allocations; unresolved prices stay unavailable.
- `TODO(recharge-confirm)`: Shopify order-ID availability timing and cart
  attribute propagation through the dev store's actual Recharge checkout mode.

Sources: [partner OAuth](https://docs.getrecharge.com/docs/partner-apps.md),
[plans](https://developer.rechargepayments.com/v2/plans),
[webhook signatures](https://developer.rechargepayments.com/v2/webhooks_validation),
[webhook behavior](https://developer.rechargepayments.com/v2/webhooks_explained),
[Shopify carts](https://shopify.dev/docs/api/storefront/2026-10/mutations/cartCreate).
