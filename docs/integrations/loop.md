# Loop Returns integration

Loop data is read for one merchant, only after that merchant enables the
integration. No return data, reason mappings, prompts, controls or reports are
combined across merchants. In this application, the isolation boundary is the
verified Shopify `store.id`, not the account that may own several stores.

## Scope

V1 connects a merchant-created API key, imports return line items, groups
expectation gaps, checks real ChatGPT and Google AI Mode answers through the
existing ScrapeLLM runner, and adds saved suggestions to the existing Optimize
screen. The merchant reviews the exact change before publication. Return-derived
fit notes always require approval. There is no new automatic publishing worker.

Loop's own Return Insights already covers overall return performance. This
integration shows products with evidence of a product-information gap, rather
than a dashboard of all returned products.

No Loop return mutation is permitted. The HTTP client rejects every method/path
except identity, list/details reads, and creation/listing/deletion of ecentic's
own webhook subscriptions. Redirects and foreign pagination URLs are rejected
before credentials can be forwarded.

## Local setup

From the repository root:

```sh
bun install
bun run build:packages
```

Copy `apps/web/.env.example` to the ignored local environment file. Supply a local
Postgres connection and the existing authentication configuration. Loop needs:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Application Postgres database |
| `CREDENTIAL_ENCRYPTION_KEY` | Base64-encoded random 32-byte encryption key |
| `CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS` | Optional old keys during rotation |
| `APP_HOST` | Public HTTPS origin for Loop webhooks; use the tunnel origin locally |
| `CRON_SECRET` | Bearer secret for cron endpoints |
| `SCRAPELLM_API_KEY` | Existing real ChatGPT / Google AI Mode capture runner |
| Existing Azure / AI Gateway variables | Reason classification, comment attribute extraction and evidence checks |
| `LOOP_GAP_MIN_RETURNS` | Default `5` matching returns |
| `LOOP_GAP_MIN_SHARE` | Default `0.2` of that product's returns |
| `LOOP_GAP_WINDOW_DAYS` | Default `60` days |
| `LOOP_DAILY_CAPTURE_LIMIT` | Default `20` real answer captures per store per day |
| `LOOP_OAUTH_ENABLED` | `0` by default; leave disabled pending Loop confirmation |
| `LOOP_CLIENT_ID`, `LOOP_CLIENT_SECRET`, `LOOP_REDIRECT_URI`, `LOOP_OAUTH_SCOPES` | Future partner OAuth configuration |

Merchant API keys and webhook signing secrets are entered in Settings. They are
never global environment variables. Loop reuses the existing AES-256-GCM
encrypted Drizzle columns and credential-rotation script. See
[credential encryption](credential-encryption.md); source-code support does not
prove that any deployment's historical credential backfill has run.

Apply migrations from `apps/web` to the intended local database, then start the app:

```sh
cd apps/web
bun run db:migrate
bun run dev
```

The repository's historical migration chain has existing empty-database
compatibility issues. For these tests, an isolated schema baseline was created
and the two Loop migrations were applied separately. Do not reset an existing database to work around an
unrelated historical migration error.

## Connect a test merchant

1. Connect a verified Shopify store to ecentic and import its product catalog.
2. Expose the local app with an HTTPS tunnel, for example `ngrok http 3000`.
   Set `APP_HOST` to the tunnel's HTTPS origin and restart the dev server.
3. In Loop Admin, open **Returns Management > Tools & integrations > Developer
   Tools > Generate API key**. Choose only `returns` and `developer_tools`.
4. Copy the webhook signing secret from that merchant's Developer Tools page.
   The documented create-webhook response does not include a signing secret.
5. In **Settings > Integrations**, select that store's Loop **Connect** control.
   Paste the key and signing secret, then save. Connection verifies identity and
   a one-day returns read before scheduling the backfill.
6. Confirm three active subscriptions in Loop Developer Tools for
   `return.created`, `return.updated`, and `return.closed`, all on topic `return`.
   Keep their generated merchant-specific callback URL unchanged.

Loop keys' `returns` scope also permits processing/cancelling returns. Our
client's method/path allowlist enforces the narrower read-only contract.

The live documentation is inconsistent about API-key authorization for webhooks,
and documents `auth/me` using an OAuth bearer token. If key validation or webhook
registration fails with `401`, retain the safe error and resolve the scope/auth
question with Loop; do not broaden the client allowlist or bypass validation.

## Sync and delivery

- Initial backfill: last 180 days in windows no longer than 30 days, with
  `filter=created_at`. `open`, `closed`, `expired`, and `review` are separate
  requests because the documented state parameter is a scalar enum.
- Every list call explicitly paginates. Continuation URLs are restricted to the
  configured Loop origin and exact list path. Page progress is durable.
- Webhooks verify the base64 HMAC-SHA256 of bounded raw bytes before JSON
  parsing. Current and unexpired previous secrets are accepted in constant time.
  The server acknowledges only after sanitized work is durably saved, then does
  the slow work through the existing Postgres/Vercel worker pattern.
- Return ID + trigger + edited/updated timestamp deduplicates deliveries.
  Per-return revision records prevent older deliveries from restoring newer
  cancelled data, including cancellation payloads with no line items.
- `/api/cron/loop` drains durable jobs every minute. Daily
  `/api/cron/loop-maintenance` schedules the previous 48 hours with
  `filter=updated_at`, verifies active owned webhooks, and performs retention
  cleanup. Reconciliation also reads cancellations to exclude previously
  imported returns that were cancelled after a missed webhook.
- The dispatcher reads connection identifiers; each worker, query, analysis and
  model call operates on one store. Leases and connection generations fence
  stale jobs and reconnect/disconnect races.
- Calls reserve a shared per-store database pacing slot, with separate
  300/minute API and 20/minute identity limits. `429` retries are bounded and use
  jitter/Retry-After. Job checkpoints recover work beyond one invocation.

Locally, invoke the configured cron routes using `Authorization: Bearer` with
your local `CRON_SECRET`. The hosted schedules are in `apps/web/vercel.json`.
Changing a tunnel origin requires reconnecting so the owned callback URLs match.

## Privacy, rotation and deletion

Ingestion projects only the allowed fields. `customer`, `customer_detail`,
addresses and arbitrary extra provider fields never enter the database or job
payload. Comments are redacted before storage or a model call. Emails, phone
numbers and order references are removed; external identifiers needed to join
returns to products/orders are retained in their dedicated fields.

Distinct normalized reason/parent pairs are classified within one store. Rules
run first, followed by a model for unresolved reasons. A merchant override wins
over subsequent automatic classification. Model prompts treat returned content
as evidence, never as instructions, and include no other merchant's data.

Use **Update signing secret** after rotating it in Loop. Keep the old secret
for 24 hours in ecentic. Loop documents a default 24-hour rotation overlap and
a maximum of seven days; ecentic does not extend its overlap to seven days.
If access needs renewal, disconnect Loop and connect it again with a valid key.

**Disconnect** fences jobs and deletes saved credentials immediately. The
already-loaded in-memory grant is used for bounded deletion of recorded owned
subscriptions. If Loop is unavailable, the UI says cleanup is required; remove
those subscriptions in Loop manually. Credentials are not retained for retries.
Detailed return rows are purged within 30 days. **Delete Loop data** disconnects
and purges those rows immediately. Derived comment/answer evidence and
unpublished suggestions are removed, leaving only per-product report counts
already shown to that same merchant. Existing backup retention follows the
deployment's database-provider policy, rather than a new promise by this module.

## Evidence and measurement boundaries

Exchange direction is computed only when both variant identifiers resolve to
the same product in the same store and comparable size options exist. An
unknown size ordering is not described as one size up/down.

The default gap threshold is five matching returns and at least 20% of a
product's returns within 60 days. Examples are redacted. Real answer checks use
the existing consumer-surface runner, not simulated model responses. Failed
captures or missing product facts stay unverified/inconclusive.

Proposals preserve a saved before/after diff and product revision. Publishing
applies that reviewed diff; it does not generate different copy after approval.
A changed product requires a fresh proposal. If a publication is interrupted,
**Check publication** reads the current listing: it completes the saved report
when the reviewed description is already present, returns an unchanged listing
to review, or supersedes a conflicting proposal. Recovery never blindly repeats
a write. Unknown specifications must be
supplied or verified by the merchant, not invented from shopper comments.

**Publisher boundary:** the existing Shopify listing publisher supports title
and description only. Loop's v1 proposal changes the description, preserving
existing copy and identifying return-derived feedback as such. It does not write
variant options, product highlights or structured size/color/material/dimension/
compatibility/contents fields. Those values are currently imported catalog data,
not writable overrides. A future structured-field publisher must preserve
merchant verification and the same saved-diff approval contract.

There is no implemented general control-set service in the current app. Loop
selects and freezes similar, untreated products from that same store before
publication. Controls whose product data changes are excluded, with both their
baseline and later counts removed. Reports show the actual before/after counts
and gap shares for
treated and control products. A missing control is reported as missing; the
existing simulated/estimated optimization lift is never used as return evidence.

**Open TODO: ordered units.** Shopify's current paid-order handler strips line
items and quantities, and there is no complete order-line/history import.
Therefore both overall and AI-started unit return rates are unavailable. Add
store order-line ingestion, historical coverage and matched observation windows
before enabling `returned units / ordered units`. Do not use attributed billing
conversions as an all-orders denominator.

Known AI-started returns join the existing verified `ai_order_attributions`
records by store and Shopify order ID, deduplicating subscription rows. Coverage
currently depends on Recharge. Referral tags, traffic, UTMs and inferred
attribution are not accepted as direct AI Checkout markers.

## Tests

```sh
bun run --cwd apps/plugins/loop test
bun run --cwd apps/plugins/loop typecheck
cd apps/web
bun test src/server/spec/loop-signals.test.ts
LOOP_TEST_DATABASE_URL=postgres://loop_test@127.0.0.1:55438/ecentic_loop_test bun test ./src/server/spec/loop-integration.dbtest.ts
LOOP_TEST_DATABASE_URL=postgres://loop_test@127.0.0.1:55438/ecentic_loop_test bun test ./src/server/spec/loop-proposals.dbtest.ts
LOOP_TEST_DATABASE_URL=postgres://loop_test@127.0.0.1:55438/ecentic_loop_test bun test ./src/server/spec/loop-publication.dbtest.ts
bun run i18n:check
```

The database URL above is an example for a disposable local instance. The
database suites require an explicitly supplied test URL on `127.0.0.1`; they
never substitute the application's `DATABASE_URL`. They expect the application
schema to exist, create uniquely identified fixture records, then delete those
records. For a brand-new disposable test database only, initialize its schema
with `DATABASE_URL=<disposable-local-url> bunx drizzle-kit push --force` before
running the suites. Do not point this setup command at an existing database. Fixture payloads follow documented fields and
include unknown properties to test lenient parsing. Fixtures are not proof of
live Loop permissions or merchant-sandbox availability.

For a live reviewer test, use a Loop-approved test merchant. Create test orders
and return requests through that merchant's ordinary Shopify/Loop test workflow,
using several variants and custom reasons. Five matching return lines among no
more than 25 total returns for a product satisfy the default evidence thresholds.
Close/update a test return to exercise the subscribed triggers; cancel one to
check exclusion. Do not create these returns through ecentic. A partner sandbox
and Loop's recommended test-return procedure are `TODO(loop-confirm)`.

## API verification and open questions

Live official documentation checked on 24 November 2026:

- [Versioning](https://docs.loopreturns.com/api-reference/versioning): `/api/v1`
  is a legacy alias for `2026-07`. Returns and webhooks are pinned to
  `/api/2026-10`; the identity guide still specifies `/api/v1/auth/me`.
- [Returns list](https://docs.loopreturns.com/api-reference/latest/return-data/detailed-returns-list)
  and [details](https://docs.loopreturns.com/api-reference/latest/return-data/get-return-details):
  exact detail path is `/warehouse/return/details`; maximum date window 120 days.
- [Create webhook](https://docs.loopreturns.com/api-reference/latest/programmatic-webhooks/create-webhook):
  explicitly request `status: active`; the default is inactive. Webhook payload
  versions are configured shop-wide in Loop Admin, independently of API paths.
- [Authentication](https://docs.loopreturns.com/api-reference/authentication):
  `TODO(loop-confirm)` for read-only returns scopes, OAuth returns scopes,
  API-key `auth/me` support/identity schema and partner PKCE support.
- [Webhook setup](https://docs.loopreturns.com/webhook-reference/setting-up):
  `TODO(loop-confirm)` for the API-key/OAuth contradiction and whether any
  create response can return a signing secret.

OAuth is implemented behind a disabled flag. It requires confirmed explicit
scopes, `offline_access`, server-only token exchange/refresh, state and PKCE.
Do not enable it based on the generic docs example that mentions undocumented
returns scopes.

Partner sandbox access, Marketplace review and the Phase 2 shared-secret deep
link registration remain open. Phase 2 is not implemented: shoppers would be
sent from an assistant to the merchant's Loop return portal through an approved
partner deep link.
