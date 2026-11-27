# HubSpot historical-contact protection

HubSpot supplies existing-contact exclusions, not cold prospects, verified email addresses, shopping facts or a sender. The connection in Integrations only checks and saves the encrypted key. Deployment and key save do not enable a CRM pull. Daily history protection is off by default. A separate explicit enable operation binds a fresh completed/applied preview and the current credential before the preparation cron can advance it. The sending cron never starts a CRM pull.

The internal `hubspot-exclusions` service uses existing integration jobs (`provider: automation`, operation `hubspotExclusionPullV1`) and the existing domain/email suppression table. Each read stage fetches one page of at most 100 records with a GET to HubSpot's contacts or companies collection. It requests only explicit company domains/additional domains and contact emails/additional emails. It never follows a returned paging URL, writes to HubSpot, infers an email/domain from a person's name, or creates a prospect.

An explicit start records the credential version and page ceiling (default 50, maximum 100). Pages, opaque cursors, object IDs, original property values, provider update times, local observation times and hashes remain in the job. A short lease commits before the GET, which runs outside the workspace lock. An expired or superseded lease, changed credential, repeated cursor/record or failed response cannot advance the preview. There is no automatic retry of a page reservation; completed prior pages and existing exclusions remain. Hitting the page ceiling produces an incomplete failed preview, not a claim that every CRM record was read.

Both collections must finish before application. The operator reviews the preview's explicit exclusions, invalid/unaddressable records and SHA-256, then passes that exact hash to `apply`. Under the normal workspace lock, application replays every page, requires the same credential and observations no older than three days, and inserts only missing suppression keys. A conflict preserves the original reason, actor and timestamp. Full HubSpot provenance remains in the source job even for pre-existing exclusions. No prospect, message, approval, policy, campaign, send attempt or old thread is rewritten. Existing preparation, approval and final delivery exclusion checks consume these rows on both email and LinkedIn rails.

The last-good checkpoint means the newest complete pull that was applied, either explicitly or by an enabled daily schedule. Pending, failed or uncertain work cannot replace it. Status reports the original first observation, completion/application dates, invalid/unaddressable counts and a three-day stale warning. A credential change also marks coverage stale until a new checked pull is applied. Staleness or provider failure never removes an exclusion or freshens a date. An empty subsequent collection likewise removes nothing. “Complete” describes exhausted collection pages, not a claim that records with missing identifiers can be matched.

Run from `apps/outbound`, using the existing app environment. Commands are operator tools, not a public endpoint:

```sh
bun scripts/outbound/hubspot-exclusions.ts --action status
bun scripts/outbound/hubspot-exclusions.ts --action start --execute --request <unique-uuid> --max-pages 50
bun scripts/outbound/hubspot-exclusions.ts --action page --execute --job <job-id>
bun scripts/outbound/hubspot-exclusions.ts --action preview --job <job-id>
bun scripts/outbound/hubspot-exclusions.ts --action apply --execute --job <job-id> --hash <reviewed-preview-sha256>
```

Repeat `page` explicitly only while the saved job is pending. `preview` and `status` perform no HTTP requests or database writes. Their output can contain private CRM identifiers and should stay in the private operator workspace. Reusing a start request or applying the same completed preview is idempotent. Review a new uniquely identified pull after an incomplete terminal read; no cursor or historical result is reset.

To enable daily history protection after checking and applying a fresh preview:

```sh
bun scripts/outbound/hubspot-exclusions.ts --action enable --execute --job <applied-job-id> --hash <applied-preview-sha256>
bun scripts/outbound/hubspot-exclusions.ts --action disable --execute
```

The configuration is a separate durable `hubspotExclusionAutomationV1` job, outside Playbook: enabling/disabling does not change writing policy hashes or approvals. Enable requires the exact applied preview hash, current credential and first observation no older than three days. It inherits that preview's page ceiling. Disable is reversible through another explicit enable with a still-fresh applied proof; it never removes exclusions.

The existing preparation cron performs at most one bounded HubSpot stage per invocation: record a new daily pull, reserve/fetch one GET page, or replay/apply a complete pull. New pulls are at least 24 hours apart, with an additional unique configuration/UTC-day key. There is no catch-up loop. Both exhausted collections and the ordinary freshness/credential/page proof must pass before the schedule can add exclusions. The first next-due time is no earlier than 24 hours after the enabling preview completed.

The schedule owns only pulls marked with its configuration and epoch. A pending or reserved manual pull defers daily work; cron never takes it over. Failed or uncertain scheduled pulls retain their pages and error and are never resumed. On a later due day, a fresh full pull can start at companies with no cursor. Last-good stays unchanged until that new pull completes and applies. A page ceiling still holds incomplete work. If an outage leaves pending or completed-but-unapplied evidence older than three days, the scheduler retains that job as failed and clears its active reference without reading or applying anything; the next due invocation can start a new full pull. It never downgrades an applied last-good snapshot.

Disabling fences an unfinished owned pull: pending work becomes failed, a reserved read becomes uncertain, and a late response cannot replace it. Credential rotation likewise disables the schedule before another page; the replacement credential needs a new complete, applied preview before explicit enable. Status exposes enabled/active, next due, current job, latest failure, last-good dates and stale coverage. No state claims that a key save performed a sync.

Outbound-to-HubSpot reply/deal/task creation is not implemented; no cold contact is pushed into HubSpot.
