# @ecentic/recharge

Server-side, read-only Recharge connector shared by the ecentic app. It contains
no database, auth-session, cron or UI framework. The web integration supplies
those existing application services.

## Contracts

- `exchangeCode` / `refreshToken`: form-encoded partner OAuth. Errors omit
  provider bodies and credentials. An absent provider expiry remains `null`.
- `createRechargeClient`: store, product, plan, order and subscription reads;
  the only mutation methods manage webhook delivery registrations. Every API
  attempt calls the required `beforeRequest`, including retries. The web app
  must atomically reserve a shared per-shop rate-limit slot and keep its job
  lease current there. An in-memory limiter is insufficient across deployments.
- `paginate`: cursor-based page iteration. Persist cursors between background
  jobs for large stores rather than relying on one long server request.
- `verifyRechargeWebhook`: constant-time validation of exact raw bytes. Modern
  timestamp signatures take precedence; an invalid one cannot fall back to the
  legacy signature. Register a secret callback URL bound to connection and topic:
  the signature does not authenticate the shop/topic HTTP headers.
- `projectWebhookPayload`: the only webhook fields intended for durable storage.
  Discards customer names, emails, addresses and arbitrary properties.
- `mapOrderSubscriptions`: exact Shopify order ID and Recharge subscription line
  item IDs, including multiple subscriptions in one order. The caller must check
  its trusted AI Checkout marker and require a successful checkout order; this
  function alone makes no first-order attribution claim.
- `normalizeSubscriptionOffers`: one offer per known variant and plan. Prices
  use exact decimal discount arithmetic and currency rounding. Plans without
  authoritative prices or intervals remain unavailable. Prepaid and other
  unsupported pricing are deliberately withheld from publication; their charge
  and delivery intervals are retained. No unknown variant ID is invented.

`RechargeProduct.external_product_id` and variant IDs are external Shopify
numeric IDs; plans link through `external_product_id.ecommerce`. Keep them as
strings. Unsafe numeric IDs are rejected because JSON numbers may already have
lost precision. Provider timestamps without a zone are interpreted as UTC.

## Validation

From this directory: `bun test src` and `bun run typecheck`. Tests use mocked
HTTP and signed fixtures, including an install → sync → webhook contract flow.
They do not claim a completed live Recharge partner-app install.

## Provider references and remaining confirmations

- [Partner OAuth](https://docs.getrecharge.com/docs/partner-apps.md)
- [Read scopes](https://developer.rechargepayments.com/v2/authentication)
- [Plans](https://developer.rechargepayments.com/v2/plans)
- [Webhook signatures](https://developer.rechargepayments.com/v2/webhooks_validation)
- [Rate limits](https://docs.getrecharge.com/docs/api-rate-limits.md)

`TODO(recharge-confirm)`: partner token expiry/rotation and client-secret
requirements; partner-app removal distinct from `recharge/uninstalled`; delivery
event identifier; and authoritative prepaid selling-plan allocation prices.
The web integration runbook documents the partner portal setup and live test.
