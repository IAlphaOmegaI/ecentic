# Outbound

The separate ecentic staff outbound application. It shares the monorepo's Zenncore components, theme and staff identities, and owns its routes, build, deployment, authentication cookies and outbound worker.

## Run locally

From the repository root:

```sh
bun install
bun run dev:outbound
```

Open `http://localhost:3001`. The workspace is `/`; staff sign-in is `/sign-in`. Main navigation is Overview, Campaigns, Prospects and Conversations. Conversations combines email and LinkedIn history, sent activity, pending follow-ups and reply handling; `/sent` redirects into its Sent view. Spanish, French, German, Italian, Japanese and Simplified Chinese use locale prefixes. Sign in with an existing ecentic staff email/password account. There is no public registration or provider sign-in.

Configure `apps/outbound/.env.local` from its environment example. `APP_HOST` must identify this app, including port 3001 locally. The app uses the `ecentic-outbound` cookie prefix, so the merchant dashboard login does not sign a user into Outbound.

Staff accounts can be provisioned locally from this app with
`bun scripts/create-admin.ts --email=<email> --name=<name> --surname=<surname>`.
Supply the password on standard input (12–128 characters). This operator-only
command creates a verified staff identity and a hashed credential together,
rejects existing addresses, and does not send email. Staff identities are shared
with ecentic; the command does not enable public registration.

## Build and deploy

```sh
bun run build:outbound
bun run typecheck:outbound
bun run test:outbound
```

## Core smoke tests

From the repository root, run:

```sh
bun run test:outbound:smoke
```

The root command first builds Outbound's shared workspace dependencies, so it
works after a fresh `bun install` without existing `dist` outputs. It does not
build the Next.js app. Running `test:smoke` directly inside `apps/outbound` assumes
those shared dependencies have already been built.

This runs the browser-to-server action transport contract, conversation editor,
conversation reading/stages/drafts, campaign criteria and filters, review and hold
rules, staff authorization, and credential success/error paths. Provider replies,
draft generation and delivery are fixtures: it does not call paid providers or
send real messages. Each suite uses a separate Bun process to avoid shared mocks.
The test environment excludes application credentials, disables `.env` loading
including in fixture subprocesses, and blocks live HTTP and non-test Node TCP
connections. A skipped test, missing test file, empty report or failing assertion
fails the command. The ordinary `test:outbound` command still permits optional
database tests to skip; use the smoke command for this core regression gate.

The `outbound-basics` CI job runs this same gate for Outbound, shared-package and
test-workflow changes, using its own PostgreSQL service. Per-suite JUnit reports
and logs are uploaded even when a test fails.

The smoke command requires **disposable PostgreSQL on `127.0.0.1:55432`** with
permission to create databases. It creates a new `outbound_smoke_<random>` database,
builds its schema from the current Outbound projection, then removes that database
on completion. It never uses `DATABASE_URL` or modifies existing databases. The
default PostgreSQL user is the current OS user; use `OUTBOUND_SMOKE_PG_USER` and
`OUTBOUND_SMOKE_PG_PASSWORD` only if the disposable server needs them.

If that dedicated server is not already running, start a new local cluster using
an installed PostgreSQL distribution (`pg_config` must be on PATH):

```sh
OUTBOUND_PG_BIN="$(pg_config --bindir)"
OUTBOUND_PG_DIRECTORY="$(mktemp -d /tmp/ecentic-outbound-smoke.XXXXXX)"
"$OUTBOUND_PG_BIN/initdb" -D "$OUTBOUND_PG_DIRECTORY" --auth=trust --no-locale
"$OUTBOUND_PG_BIN/pg_ctl" -D "$OUTBOUND_PG_DIRECTORY" -l "$OUTBOUND_PG_DIRECTORY/server.log" -o "-h 127.0.0.1 -p 55432" -w start
bun run test:outbound:smoke
"$OUTBOUND_PG_BIN/pg_ctl" -D "$OUTBOUND_PG_DIRECTORY" -m fast -w stop
```

JUnit reports and per-suite logs are saved under the ignored
`output/outbound-smoke/` directory. `summary.json` records whether the temporary
database was removed. This gate tests the current schema and application behavior;
it does not verify production migration history, provider availability, browser
layout or a complete logged-in Next.js navigation flow.

Deploy `apps/outbound` as its own project. Configure its environment and authorized host independently. Its email, preparation and LinkedIn workers require `CRON_SECRET`; keep only this deployment's outbound schedules active.

Production is [outbound.ecentic.ai](https://outbound.ecentic.ai), hosted by
[zennit/ecentic-outbound](https://vercel.com/zennit/ecentic-outbound) since
15 November 2026. The project root is `apps/outbound`, Node.js is pinned to 24,
and the build runs `bunx turbo run build --filter=outbound` so shared packages
build first. Three minute-scheduled workers are configured in this app's `vercel.json`: `/api/cron/outbound`, `/api/cron/outbound-prepare` and `/api/cron/outbound-linkedin`.
Staff use their existing credentials and sign in again on the production domain.

The initial deployment is a CLI snapshot, not a Git-triggered deployment. The
repository root's `.vercel` link still belongs to the main ecentic project.
For an isolated redeploy, prune the current workspace and link only that staging
directory to Outbound:

```sh
OUTBOUND_DEPLOY_DIRECTORY="$(mktemp -d /tmp/ecentic-outbound-deploy.XXXXXX)"
bunx turbo prune outbound --out-dir "$OUTBOUND_DEPLOY_DIRECTORY/source" --use-gitignore=true
cp bunfig.toml "$OUTBOUND_DEPLOY_DIRECTORY/source/bunfig.toml"
vercel link --yes --scope zennit --project ecentic-outbound --cwd "$OUTBOUND_DEPLOY_DIRECTORY/source"
# Linking may download development environment values. Never upload them.
rm -f "$OUTBOUND_DEPLOY_DIRECTORY/source/.env.local"
vercel deploy --prod --yes --scope zennit --cwd "$OUTBOUND_DEPLOY_DIRECTORY/source"
```

Production environment values are saved in the Vercel project. Keep local
`.env` files out of the upload; preserve the shared database's encryption key.
Publishing a deployment does not approve messages or enable the saved sending
switches. Hosting availability and outbound launch readiness are separate.

Integrations accepts Apollo's API key and Clay's API key. Clay's routine ID is
optional when saving a key and required before enrichment can run. Secrets
are encrypted; saved values take precedence over optional environment fallbacks.
Apollo and Clay check authentication before saving, without running a paid
enrichment or routine.

Company discovery lives in **Campaigns** and uses Apollo organization search,
then Clay company search as a secondary source; Clay company search does not
require an enrichment routine. Each campaign owns its criteria, Claude
questionnaire, reviewed JSON answers and discovery cursor. Filter availability
depends on the provider's plan, independently of key validity.

**Warmup** checks registered mailboxes and saves capped volume plans. Connect
mailboxes in the hosted Warmbly workspace, then save a key with `READ_EMAILS`
and `WRITE_EMAILS` permissions in Outbound. Starting network warmup is explicit
and requires current connection/DNS checks; it disables local delivery first.
See [campaigns](../../docs/integrations/outbound-campaigns.md) and
[Warmbly](../../docs/integrations/outbound-warmup.md) for the full contracts.

Clay's old `/functions` link redirected to Home in the owner's signed-in
workspace during 14 November verification. Use Clay's current workspace
navigation. Routine setup lives in the enrichment accordion; a verified key alone
does not make enrichment ready or trigger a job.

Connect an existing Google mailbox using its email and **App Password** in
Integrations. The address must be in the playbook's active or inactive
inbox lists, including any additional domains you register. Inactive inboxes can connect and synchronize but
cannot send. The app verifies SMTP and IMAP access without sending and saves the app
password encrypted. The ordinary account password and 2FA secret are not needed.
Choose **Sync replies** to begin the checkpointed 180-day history import. The
browser continues through batches with progress and a stop control; scheduled
worker runs can also resume it. Sending stays paused until history
and delivery checks are complete. Import older contacts and suppressions from
Instantly separately, or explicitly choose to allow incomplete past campaign
history in Playbook and accept possible repeat contact. The latter preserves
known exclusions and current-mailbox synchronization; it never marks history
imported. Pause competing campaigns before cutover.

Google OAuth remains an advanced option with client ID and secret fields. Its
callback is `/api/integrations/outbound/google/callback`, derived from `APP_HOST`
and shown read-only; `OUTBOUND_GOOGLE_REDIRECT_URI` is no longer used. Both
connection methods support sending and reply reconciliation through the same
approval and delivery controls.

LinkedIn account connection uses Unipile V2. In Integrations → LinkedIn, paste a Global or Scoped Account API key from [the V2 dashboard](https://dashboardv2.unipile.com) and choose **Save API key**, then **Connect account**. Service keys also work. The staff-only form verifies access with a read-only Unipile request and stores the key encrypted in PostgreSQL. Provision `CREDENTIAL_ENCRYPTION_KEY` before saving. Saved keys take precedence over the optional `OUTBOUND_UNIPILE_API_KEY` environment fallback and are never returned to the browser. Replacing a key does not require restarting the app. Hosted authentication returns to `${APP_HOST}/api/integrations/outbound/linkedin/callback`. The connection supports reconnect and status checks. LinkedIn automatic sending and incoming-message sync are not activated by connecting; see the runtime document for the execution boundary.

## Shared database ownership

`DATABASE_URL` points to the existing ecentic PostgreSQL database. Staff identities and outbound history are shared records; app extraction does not import them again. Apply schema migrations through the existing `apps/web` migration history. The standalone database schema is a runtime projection of the identity and outbound tables, not ownership of the complete shared schema. Do not run `db:push` or a reset against this reduced schema.

Use the same `CREDENTIAL_ENCRYPTION_KEY` required to read existing inbox grants. The app's `BETTER_AUTH_SECRET` and `APP_HOST` are configured for its own authentication deployment. Provider credentials, mailbox connection, historical suppression import and reviewed sending checks still need to be completed before enabling delivery.

## Messages

Edit the seven `messages/fragments/outbound.*.json` files, then run from this app:

```sh
bun scripts/merge-i18n-fragments.ts
bunx next typegen
bun run i18n:check
```

The catalogs contain only Outbound UI messages. No runtime imports come from `apps/web`.

See [runtime and provider setup](../../docs/integrations/outbound.md) and [skill adaptation](../../docs/integrations/outbound-skills.md) for operating contracts. Database fixture tests require a disposable local database through `OUTBOUND_TEST_DATABASE_URL`; never point them at the shared application database.
