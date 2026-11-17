# Outbound mailbox readiness and Warmbly

The owner selected Warmbly's shared network on 15 November 2026. Outbound keeps
the campaign, prospect and delivery records; a hosted Warmbly workspace supplies
the participating warmup mailboxes. Copying or self-hosting Warmbly does not grant
access to that network. New self-hosted Cloud links are closed in the reviewed
upstream release, so mailbox enrollment belongs in a hosted workspace.

## Evidence and limits

The mailbox checker reads MX, SPF, DMARC and explicitly selected DKIM DNS names.
It reports record presence, clear malformed/duplicate records and unresolved
lookups separately. DKIM selectors cannot be enumerated: a selector not found
stays unknown. A published RSA key must parse as a public key; a truncated or
revoked key is invalid. Subdomains inherit a DMARC record only after a known
absence at their own name. A transient DNS failure does not prove absence.

These checks do not evaluate the actual delivery route, receiver-attested SPF or
DMARC alignment, inbox placement or sender reputation. The checker separately
verifies SMTP and IMAP for connected Google App Password mailboxes, or reads the
Gmail profile for an OAuth connection. It sends no email and does not mark the
Playbook's historical reconciliation or sender/reply test complete. Results are
saved only if the mailbox connection still has the same version.

A planning form saves the starting daily volume, daily increment and ceiling.
The defaults are two messages and an increment of one, bounded by the existing
15-message Playbook ceiling and each inbox's lower limit. These are conservative
app defaults, not a guarantee that a provider will accept them. The local preview
shows configured limits, not measured health or network pacing. Warmbly controls
the actual network ramp: its elapsed-day count excludes placement-freeze periods,
and health and placement observations can reduce the resulting target. Local
saved plans remain off; network actions require the separate Warmbly connection
and actual mailbox controls.

Additional sending domains are supported by saving their exact addresses in the
Playbook. That permits connection and checking, not delivery. Other addresses on
the same domain are not implicitly registered. Active and inactive pools remain
disjoint, and existing approval, sender identity and delivery checks still apply.

## Hosted API contract

The official base is `https://api.warmbly.com/v1`, authenticated with a Bearer
workspace key created under Settings → API keys. `READ_EMAILS` permits mailbox
listing and inspection; `WRITE_EMAILS` permits configuration and warmup lifecycle
operations. The adapter uses the following documented endpoints:

- `GET /emails?limit=...&cursor=...` and `GET /emails/:id` for current state.
- `PATCH /emails/:id` for `warmup_base`, `warmup_increase` and `warmup_max`.
- `POST /emails/:id/warmup/start`, `/pause`, `/resume` and `/stop` for explicit
  lifecycle actions.

Listing accepts a verified cursor and returns at most 100 rows per request.
Unknown response fields are discarded. Missing observations stay unknown.
Mutations are not automatically retried after an interrupted response.
Connecting a key does not prove the workspace has a paid plan, matching connected
mailboxes or access to the hosted pool. Outbound does not export stored mailbox
passwords or OAuth grants to Warmbly as part of key setup.

The staff-only controls show only exact Playbook mailbox matches. Starting or
resuming requires a saved plan, an active Warmbly mailbox, a connection check less
than 24 hours old for the current connection version, and present MX, SPF, DKIM
and DMARC observations. The ceiling must fit both the Playbook and inbox limits.
Local delivery is disabled before configuration or lifecycle requests, because
external Warmbly traffic does not belong to Outbound's delivery ledger. Pausing
or stopping Warmbly never re-enables local sending.

Every lifecycle operation reserves a durable provider journal before mutation.
An explicit provider rejection is recorded as failed; an interrupted request or
failed confirmation remains uncertain. A subsequent status read can reconcile
the exact mailbox, expected state and configured ramp without replaying a POST.
Execution and reconciliation share a PostgreSQL advisory transaction lock; the
worker owns it through its external calls, so elapsed time alone cannot release
an executing operation. The journal records preparation, configuration and
lifecycle stages. An abandoned job that never reached a lifecycle request fails
without starting anything. An interrupted configuration request remains held
until its settings are observed; reconciliation then records that settings were
saved but warmup was not started. Starting still requires a new explicit action.
An abandoned lifecycle dispatch remains uncertain until the requested state is
observed. A plan or connection change before that dispatch fails safely and
preserves the local delivery hold.
The delivery worker can also inspect pending Warmbly journal entries before
dispatch. Repeated Start cannot reset a running ramp, and a repeated Pause or
Stop in the already-requested state sends no further lifecycle request.

## Reviewed source and licensing

Reviewed [Warmbly](https://github.com/warmbly/warmbly) commit
`83c7df41de12e40a8ef1e00809703ee632a91627`. Its root/backend license is
[Apache-2.0](https://github.com/warmbly/warmbly/blob/83c7df41de12e40a8ef1e00809703ee632a91627/LICENSE),
Copyright 2026 Mindroot Ltd; `web/` and `site/` have their own MIT licenses.
There was no root NOTICE in that snapshot. No upstream source has been vendored
into Outbound: the pacing and observation code is a separate implementation.
If source is copied later, retain the applicable license and attribution, include
any applicable notices, and identify modifications as that license requires.

Primary references: [warmup guide](https://docs.warmbly.com/guides/warmup/),
[hosted-pool linking limits](https://docs.warmbly.com/guides/warmbly-cloud/),
[API authentication](https://docs.warmbly.com/api/authentication/),
[mailbox API](https://docs.warmbly.com/api/reference/mailboxes/),
[Google sender guidelines](https://support.google.com/a/answer/81126?hl=en).

The readiness and ramp fixtures cover uncertainty, malformed DKIM, duplicate SPF,
inherited DMARC, public-domain validation, shared-cap arithmetic and exact sender
registration. Adapter fixtures cover current endpoint paths, permissions,
pagination, safe projections and an uncertain mutation without a retry.
Database fixtures cover version and freshness checks, mailbox registration,
pre-dispatch local holds, durable uncertainty, read-only reconciliation and
permission loss after a successful lifecycle request.
