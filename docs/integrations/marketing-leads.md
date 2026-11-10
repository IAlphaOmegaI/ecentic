# Marketing enquiries

The public `/demo` page and `MarketingLead` forms send an internal email through Resend. They do not create an account, subscription, store, or CRM record, and do not send an automatic reply to the visitor.

## Request types

- Demo: three client steps collect contact/company/website, business type, catalog size, markets, goals and the most relevant assistant. The last step reviews the details and submits. The existing `https://cal.com/ecentic-ai/15min` booking remains an optional separate link; it is not an enterprise duration promise.
- Interest: a dialog collects name, work email, company and catalog size. The calling page supplies the integration/channel topic.
- Integration: the form also collects the requested tool and catalog size.
- Partner: the form collects website, track, store count and an optional note.

All client copy comes from typed `enterpriseLead` and `enterpriseDemo` catalog fragments. The server passes the structured strings as props, so no client message scope is required.

`MarketingLead` accepts `kind`, `topic`, optional `title` and optional `triggerLabel`. For interest dialogs, `title` provides the contextual heading while `triggerLabel` can distinguish several requests on the same page (for example a ChatGPT feed and app). Omitting `triggerLabel` uses the localized default interest action.

## Configuration

- `RESEND_API_KEY`: existing Resend account credential.
- `FROM_EMAIL`: required existing verified sender. The endpoint does not fall back to a Resend test address.
- `MARKETING_LEAD_EMAIL`: optional internal destination; defaults to the site's existing `support@ecentic.ai` address. Set it explicitly to route sales enquiries to another monitored mailbox. Invalid destination configuration returns a retryable failure.
- Existing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: shared rate limiter. An unavailable limiter prevents sending instead of removing the limit.

Each client IP may submit three valid requests per ten-minute fixed window across all public enquiry types. Bearer headers do not create new buckets. The infrastructure must continue to provide trusted client-IP forwarding headers, as for the existing public API limiter.

`server/app/marketing-lead.ts` runs the request through `withContext`. Its `contactSecret` envelope deliberately matches the action argument redactor so personal details are not recorded in Sentry action argument attributes. The server validates and bounds every input with the shared Zod discriminated union, strips unrelated keys, and uses a fixed subject and plain-text body. The visitor's email is only `replyTo`; the recipient is server configuration.

A SHA-256 hash of the normalized submission becomes the Resend idempotency key. Identical retries are deduplicated within Resend's idempotency window. This is transport duplicate protection, not a durable enquiry database. Delivery success is displayed only after Resend returns a message ID. Missing configuration, rate-limit infrastructure failure and send failure leave the client's entered data available to retry.

## Verification without real mail

Run `cd apps/web && bun test src/server/spec/marketing-lead.test.ts`. The tests inject an in-memory sender; they never construct a Resend client or send email. They cover invalid data, supported request variants, rate-limit denial/unavailability, transport failure, normalization and stable opaque idempotency keys.

Browser testing should stop at the demo review step. To verify the failure state, abort the browser's POST to the page before pressing submit, then remove that interception. Do not submit test details to the live email action.

Before launch, verify the production sender and destination operationally. Demo response-time commitments, enterprise duration and scheduling arrangements remain commercial decisions; the pages make no unverified SLA claim.
