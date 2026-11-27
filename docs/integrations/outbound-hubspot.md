# HubSpot historical-contact protection

HubSpot supplies existing-contact exclusions, not cold prospects, verified email addresses, shopping facts or a sender. The connection in Integrations only checks and saves the encrypted key. Deployment, key save, the preparation cron and sending cron do not start a CRM pull. No automatic schedule is enabled by this implementation.

The internal `hubspot-exclusions` service uses existing integration jobs (`provider: automation`, operation `hubspotExclusionPullV1`) and the existing domain/email suppression table. Each explicit run fetches one page of at most 100 records with a GET to HubSpot's contacts or companies collection. It requests only explicit company domains/additional domains and contact emails/additional emails. It never follows a returned paging URL, writes to HubSpot, infers an email/domain from a person's name, or creates a prospect.

An explicit start records the credential version and page ceiling (default 50, maximum 100). Pages, opaque cursors, object IDs, original property values, provider update times, local observation times and hashes remain in the job. A short lease commits before the GET, which runs outside the workspace lock. An expired or superseded lease, changed credential, repeated cursor/record or failed response cannot advance the preview. There is no automatic retry; completed prior pages and existing exclusions remain. Hitting the page ceiling produces an incomplete failed preview, not a claim that every CRM record was read.

Both collections must finish before application. The operator reviews the preview's explicit exclusions, invalid/unaddressable records and SHA-256, then passes that exact hash to `apply`. Under the normal workspace lock, application replays every page, requires the same credential and observations no older than three days, and inserts only missing suppression keys. A conflict preserves the original reason, actor and timestamp. Full HubSpot provenance remains in the source job even for pre-existing exclusions. No prospect, message, approval, policy, campaign, send attempt or old thread is rewritten. Existing preparation, approval and final delivery exclusion checks consume these rows on both email and LinkedIn rails.

The last-good checkpoint means the newest complete pull that was explicitly applied. Pending, failed or uncertain work cannot replace it. Status reports the original first observation, completion/application dates, invalid/unaddressable counts and a three-day stale warning. A credential change also marks coverage stale until a new checked pull is applied. Staleness or provider failure never removes an exclusion or freshens a date. An empty subsequent collection likewise removes nothing. “Complete” describes exhausted collection pages, not a claim that records with missing identifiers can be matched.

Run from `apps/outbound`, using the existing app environment. Commands are operator tools, not a public endpoint:

```sh
bun scripts/outbound/hubspot-exclusions.ts --action status
bun scripts/outbound/hubspot-exclusions.ts --action start --execute --request <unique-uuid> --max-pages 50
bun scripts/outbound/hubspot-exclusions.ts --action page --execute --job <job-id>
bun scripts/outbound/hubspot-exclusions.ts --action preview --job <job-id>
bun scripts/outbound/hubspot-exclusions.ts --action apply --execute --job <job-id> --hash <reviewed-preview-sha256>
```

Repeat `page` explicitly only while the saved job is pending. `preview` and `status` perform no HTTP requests or database writes. Their output can contain private CRM identifiers and should stay in the private operator workspace. Reusing a start request or applying the same completed preview is idempotent. Review a new uniquely identified pull after an incomplete terminal read; no cursor or historical result is reset.

Daily automation, if later authorized, must call this same bounded service and expose its last-good/stale status. It is not wired here. Outbound-to-HubSpot reply/deal/task creation is also not implemented; no cold contact is pushed into HubSpot.
