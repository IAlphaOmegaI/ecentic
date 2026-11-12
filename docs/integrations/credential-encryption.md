# Credential encryption and account lifecycle

12 November 2026. This is a deployment runbook, not evidence that production
has already been migrated.

## Release gate

**Provision the encryption key before deploying this change.** All new
credential writes fail closed without it. Existing plaintext rows require the
explicit temporary migration flag until backfill completes. A push, passing
build, or updated Privacy page does not complete this operational gate.

The application uses AES-256-GCM with a new 96-bit random nonce per value and a
128-bit authentication tag. The table/column identity is authenticated data, so
moving ciphertext to a different credential column fails validation. Postgres
columns remain `text`; Drizzle encrypts writes and decrypts reads, including
Better Auth's Drizzle adapter. No DDL migration is necessary.

Covered fields:

| Table | Fields |
| --- | --- |
| `account` | `accessToken`, `refreshToken`, `idToken` |
| `store_account` | `accessToken`, `refreshToken`, `consumerKey`, `consumerSecret`, `bridgeSecret` |
| `google_merchant_account` | `accessToken`, `refreshToken` |

Password hashes and agent API key hashes stay hashes. Session tokens, tracking
keys and credential-like data in other storage are not newly encrypted by this
change. Keep the separate existing restrictions on those stores. This protects
database-held grant values; an attacker controlling application execution or
both the database and its environment key can still obtain credentials.

## Deploy and backfill

1. Generate a cryptographically random 32-byte key in the deployment secret
   manager. Store its standard base64 representation as
   `CREDENTIAL_ENCRYPTION_KEY` in every application environment that accesses
   the same database. Keep it server-only, independently of the authentication
   secret, and back it up in the approved secret manager. Never paste it in
   source, logs, a ticket or a chat.
2. Set `CREDENTIAL_ENCRYPTION_ALLOW_LEGACY=1` temporarily in those environments.
   It permits reads of existing plaintext rows; it never permits plaintext
   writes. Run a preview against an isolated database before changing
   production, then deploy the encryption-capable application to every writer.
3. From `apps/web`, with the target `DATABASE_URL` and same key supplied securely,
   run `bun scripts/encrypt-credentials.ts`. It is a dry run. Confirm the intended
   environment separately; the script deliberately does not print its database
   URL. Output contains table names and counts only. Resolve any failure before
   continuing.
4. Run `bun scripts/encrypt-credentials.ts --write` in the approved operational
   session. It locks rows while migrating each table, authenticates existing
   envelopes, encrypts plaintext and rewrites old-key envelopes. A failed table
   transaction rolls back that table; earlier completed tables remain encrypted.
   The script is idempotent and safe to resume with all required keys present.
5. Run the dry run again. Every table must report zero `pending` rows and no
   decryption errors. Confirm all old application instances/writers are gone.
6. Remove `CREDENTIAL_ENCRYPTION_ALLOW_LEGACY` (or set it to `0`) and redeploy.
   Verify sign-in, Shopify/WooCommerce reconnect and sync, Google token refresh,
   and hosted UCP bridge access on approved test accounts. Do not test a real
   deletion or disconnect on a customer account.

The script requires an explicit `DATABASE_URL`, and does not make schema changes.
An unknown envelope version, unavailable key or failed authentication is an
error, never a silent fallback to plaintext. Old database backups can still
contain plaintext until the configured history/snapshot retention expires.

## Rotation and rollback

Set the new primary key in `CREDENTIAL_ENCRYPTION_KEY` and the previous standard
base64 key(s), comma-separated, in `CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS`. Deploy
every writer with that key ring, run the backfill to rotate stored envelopes,
then verify zero pending rows. Retain old keys until no live rows or retained
backups need them, according to the recovery policy.

**Do not roll back to application code that treats encrypted columns as plain
text.** It would send ciphertext to providers and break authentication. Roll back
only to an encryption-capable version while retaining the correct keys. If an
old database snapshot is restored, supply the key ring it requires and repeat
backfill/verification. Never delete a key while an encrypted row or required
backup still needs it. This change has no automatic decryption-to-plaintext
rollback command.

## Disconnect and deletion behavior

Both actions require a server-validated, uncached session created within the last
five minutes. Browser parameters are validated at runtime. Store IDs are checked
against the authenticated owner; account deletion accepts no target user ID and
requires the signed-in account's email. Confirmation dialogs describe the scope.

Store disconnect removes the local `store_account` row, clears the tracking key
and marks the store disconnected. Imported products and history remain.
Store sync rejects a disconnected store and hosted WooCommerce UCP resolution
returns no store context. Reconnecting through the normal integration flow
restores access. Disconnect is not a provider uninstall or upstream API-key
revocation; the UI tells the merchant to remove the app/plugin or revoke keys at
the provider as well. Requests already in flight may complete.

Before local disconnect:

- A connected Google grant must be disconnected through Google Shopping settings,
  which handles its remote data source and grant lifecycle.
- A Shopify usage-billing agreement must be ended by uninstalling in Shopify;
  local credentials are not removed while that agreement may need them.

Self-service account deletion is available to accounts without subscription,
fee, conversion or order records and without remaining store/Google grants.
It deletes the user and cascaded account-owned records in a transaction. User and
store rows are locked before dependent records are checked. Session cookies are
expired, including chunked cache cookies, and navigation preserves English or
Spanish. Failure of the post-commit sign-out call does not reverse or falsely
report failure of a completed deletion.

**Assisted deletion remains necessary for accounts with financial history or
active billing.** The action retains those records and directs the user to
`privacy@ecentic.ai`; it does not cancel Stripe subscriptions, issue refunds,
erase statutory records, or invent an accounting retention period. The operator
must verify that inbox and complete the agreed assisted process. Historical
backup removal follows actual provider retention, which still needs owner
confirmation before a specific period is promised publicly.

## Telemetry and credential boundaries

`sendDefaultPii` is disabled on client and server Sentry initialization. Replay
explicitly masks all text and inputs and blocks media. Sampling remains 10% of
sessions and all error sessions; disabling default PII is not a claim that no
monitoring or recording occurs. Server action response recording is disabled,
and credential-named action arguments, including WooCommerce consumer keys, are
redacted by the context wrapper.

The credential repository module is server-internal rather than a `use server`
endpoint. Its store lookup checks ownership. WooCommerce HTTPS requests use
Authorization only; a 401 is returned without a retry containing secrets in the
URL. Hosts stripping Authorization must correct that configuration. Existing
OAuth 1 signing for local HTTP development stores remains separate; it sends a
signature, not the consumer secret.

## Consent and requested support

Google Analytics and PostHog initialize only after the visitor grants analytics
consent. Undecided and denied visits do not load the Google tag or initialize
PostHog. Analytics preconnects were removed as well. On withdrawal, Google’s
measurement-ID disable flag is set before the consent state changes, analytics
storage is denied, and visible GA cookies at the host/ancestor domain and root
path are expired. PostHog stops future capture, clears its identifier and returns
to memory persistence. Previously delivered provider events are not deleted by
this browser control. Google’s already-executed script remains in the current
page but is disabled; it is not loaded on a subsequent declined visit.

The support launcher is local UI. It loads Chatwoot only after an explicit click,
then opens the requested chat. It works independently of analytics consent and
reuses the same SDK when reopened. Failure leaves an email-support fallback.
The loaded chat session is not automatically torn down by analytics withdrawal.
Sentry error diagnostics and masked replay follow their separately documented
settings; they are not represented as part of this analytics choice.

## Verification

- `bun test src/server/spec/credential-encryption.test.ts`: round trip, nonce
  uniqueness, authentication failure, wrong-column/key rejection, rotation and
  strict legacy-read policy.
- `bun test src/server/spec/account-lifecycle.test.ts`: session freshness,
  ownership and provider/billing blockers.
- `bun test src/server/spec/account-lifecycle-actions.test.ts`: isolated tests of
  the actual actions with a transactional adapter, including malformed input,
  absent session, cross-owner access, scope of deletes, preserved billing,
  transaction rollback, post-delete sign-out failure and WooCommerce’s refusal
  to retry failed header authentication with query-string secrets. The adapter tests do not
  replace provider end-to-end tests or a real production migration check.

The browser consent check recorded eight passing assertions: no optional requests
before a decision, no requests after decline or a declined reload, one Google tag
after grant, collection disable/cookie cleanup on withdrawal, explicit chat
activation, SDK reuse and no runtime exceptions. Third-party responses were
stubbed; no support message was sent. This verifies the app’s loading controls,
not a provider-side deletion or retention claim.

No production credential migration, deletion, disconnect, cancellation or email
was executed during implementation. Provisioning, migration, real account
smoke tests and provider configuration checks remain release operations.
