# Claude campaign criteria

Outbound calls Anthropic directly to generate a complete campaign-criteria
preview. It does not import Claude app chats, projects or memory. Input consists
of the current criteria, selected targeting fields from the saved Playbook and
optional staff notes. Mailbox credentials, sender identities, tokens and message
histories are excluded. System instructions prohibit invented facts and sending.

Staff save a Claude Console API key in Integrations, with a model and optional
workspace ID. Sonnet 5.5 is the default; Opus 5.5 is also available. These IDs were
verified against the [official model catalog](https://platform.claude.com/docs/en/models/overview)
on 15 November 2026. Validation uses `GET /v1/models?limit=100` and confirms that
the selected model appears. It verifies key access, not the account's balance or
monthly credit entitlement. Keys use the existing AES-256-GCM encrypted provider
column; status reads never return the key. Prefer a workspace-scoped service
account key for this shared application. An unscoped key needs its
`anthropic-workspace-id`. See [API key setup](https://platform.claude.com/docs/en/get-api-key).

The direct `@ai-sdk/anthropic` provider calls the Messages API, using native
structured outputs and full local Zod validation. Its system prompt is sent as
an actual system block, separate from staff/source material. Generation has a
5,000-token output ceiling, a 60-second request timeout and no automatic retries.
The existing Azure email-drafting path is unchanged. Claude does not execute
discovery, save campaign criteria, approve messages or send mail.

Each explicit Generate action carries a new UUID. The server reserves that UUID
in `outbound_integration_job` before calling Claude, under the workspace lock.
Repeating the same UUID only reads its existing result and never calls Claude
again. A completed preview, model, token usage and provider request/message IDs
are saved; the raw staff notes are represented by a hash in the receipt. Recover
preview reads this record without consuming API credits. A lost response or
abandoned request remains uncertain; staff may explicitly start a new request
with a new UUID, knowing the earlier request may have consumed credits. A failed
final acknowledgement attempts to preserve the validated preview for recovery.

The preview retains its original campaign and Playbook revisions. A changed or
archived campaign, or a changed Playbook, marks it stale. Applying a preview still
requires the existing explicit criteria-save action. Generated previews carry
their job ID into that save; the server checks the original campaign and Playbook
revisions together under the workspace lock before writing. Staff can edit the
proposed criteria, but a stale preview requires a new generation. A completed job
or an uncertain job with a validated, recoverable output can supply a preview;
unfinished, failed and unrelated jobs cannot. Manual criteria edits and
copy/paste of the Claude questionnaire remain available without a generation ID.

## Subscription credits and authentication

Anthropic's current [monthly API credits guide](https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans)
states that Max includes $100 monthly API credit and Ultra includes $200. New
subscribers become eligible after seven days. An eligible subscriber claims the
credit in claude.ai **Settings → Billing → API credits → Link organization**.
Use the same Console organization that owns the Outbound key. One organization
can be linked, and switching it later requires support. Credits renew each
billing cycle, do not roll over, and are consumed before purchased credits.
If no credits remain, requests stop unless the organization has paid credits,
auto-reload or invoiced billing. The owner's actual eligibility and balance must
be checked in their account; saving a key does not claim these credits.

The hosted app uses a Console API key, not a copied Claude Code OAuth/session
token. Subscription login supports Anthropic's native tools and ordinary
individual Claude Code/Agent SDK use; custom app authentication is a separate
integration. See [authentication and credential use](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use).

No SQL migration is required: the provider discriminator is a text column and
existing JSON configuration/job columns hold the model and receipts. Deployment
requires the existing database/auth/encryption setup and the added pinned
`@ai-sdk/anthropic` dependency. The in-app credential form is sufficient; optional
environment fallbacks are `OUTBOUND_CLAUDE_API_KEY` and
`OUTBOUND_CLAUDE_WORKSPACE_ID`. No credentials or credit purchases are automated.

Tests exercise the real SDK against mocked HTTP, encrypted persistence, request
ID deduplication, stale previews, usage receipts and recovery. A live generation
test requires the owner's Console key and available balance.
