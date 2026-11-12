# Website launch content audit

> Historical audit snapshot. The owner has since answered the questionnaire, including the company identity, and authorized policy drafting. Use [launch decisions](./launch-decisions-2026-11-12.md) for the accepted dispositions and [launch release](./launch-release-2026-11-12.md) for implementation, verification and deployment prerequisites. Unfilled fields below are the original questions, not the current status.

12 November 2026 · Current repository and local site · Read-only application audit

**The site is not ready for final content sign-off yet.** Two current identity/policy issues need owner resolution, nine other grouped inputs complete the operational/commercial/evidence story, and four grouped additions or status decisions are optional. The [15-item questionnaire](/Users/xhurianshaba/Developer/zennit/ecentic/docs/marketing/launch-questionnaire.md) contains prefilled facts, answer fields, and release fallbacks.

## What was found

- **109 English pending catalog entries, mirrored in Spanish: 218 total.** These are source leaves, not 109 separate unanswered questions. Each is mapped to an owner decision or engineering disposition in the [complete crosswalk](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/pending-content-crosswalk.json).
- Running the actual message-preparation helper in normal mode makes 144 pending string leaves empty and retains confirmed surrounding prose in 32. The remaining 42 raw leaves are 36 security-diagram review fields behind a server publication gate and 6 unused legacy pilot fields, not 42 public leaks.
- The local server currently renders review mode. Its security page can show the gated draft and raw review questions; this is separate from a normal production build.
- Existing legal copy is outside the enterprise-only sanitizer, so its operator conflicts and unverified security/retention assertions or gaps do not disappear when review mode is disabled.
- Four content defects outside the pending catalog are already reproducible: nonexistent REST-results guidance, the wine rewrite-preview promise, stale promoted article feature claims, and dead English DUA links. API/MCP plan descriptions also drift from the current offer. These are agent work, not requests for new product decisions.

## Owner information and approvals

| ID | Topic | Priority | Launch disposition if unanswered |
| --- | --- | --- | --- |
| Q01 | Confirm the current operator and contracting identity | blocking | Keep unconfirmed extra entity details out of marketing/schema, but obtain a confirmed current operator and matching approved legal wording before treating the present legal pages as launch-ready. Do not select an entity or jurisdiction from old copy by inference. |
| Q02 | Reconcile live Privacy promises with unconfirmed security facts | blocking | Publish reviewed, evidence-backed statements rather than the unsupported absolutes. Correct the already-known scrypt mismatch as engineering/editorial work; do not ask the user to choose a password algorithm or invent a no-training promise. |
| Q03 | Complete the operational security and contracted-provider inventory | important | Keep the dated code-provider inventory with its current limitation, omit unconfirmed controls/locations, and make no residency, certification, recovery or full-subprocessor promise. Resolve any stronger existing Privacy claims under Q02. No credentials or secret values are needed. |
| Q04 | Approve complete retention and deletion wording, including leads | important | Keep only verified retention behavior and a monitored request path; do not add an immediate deletion or backup-purge deadline without evidence. The owner supplies policy decisions; engineers verify each stated mechanism before publishing the final wording. |
| Q05 | Assign monitored public contacts and enquiry follow-up | important | Use a verified existing support path and optional calendar; route specialist requests to an approved monitored inbox. Keep phone/press/security contacts and numeric response promises out until confirmed. Engineering checks sender, recipient and Redis configuration without asking for secrets in this questionnaire. |
| Q06 | Provide the approved DPA/NDA and procurement process | important | Keep public-data-first scoping and the current requirements discussion. Do not publish a document download, signature promise, certification date or non-public-data engagement until its documents and handling are agreed. |
| Q07 | Ratify the real enterprise service offer with prefilled durations | important | Describe a scoped engagement agreed on the first call, preserving public-data-first and explicit limitations. Remove precise duration, staffing, fee and active-pipeline assertions that the commercial owner cannot support. Do not turn service measures into automated dashboard features. |
| Q08 | Supply final pilot example copy or keep the deliberate illustration | important | Keep the visible illustrative label and existing non-numerical planning example. Do not recast it as an actual engagement, testimonial, outcome or approved service staffing promise. Update EN and ES together when the owner supplies final text. |
| Q09 | Define partner benefits and permitted agency/reseller use | important | Keep an expression-of-interest application with tailored terms agreed before partner access. Do not imply approved commissions, reseller rights, delegated access, white-label reports or a complete onboarding programme. No need to invent replacement answers to filtered FAQs. |
| Q10 | Complete the approved DUA story’s missing narrative | important | Keep the approved qualified aggregate result and permission statement, with unfilled narrative omitted. Do not present the short result tile as a fully documented before/after intervention story. Further analytics-method detail is an enhancement, not a reapproval of the supplied aggregate. |
| Q11 | Keep the security data-flow diagram gated until Alvi approves it | optional | Leave the diagram out of normal production. Alvi’s approval is required to publish this illustration, not to launch the site without it; deployment facts and public legal assertions are separate Q02/Q03 issues. |
| Q12 | Supply founder portraits only if desired for launch | optional | Keep text-only founder cards and the intentional Fil Rouge omission/text fallback. Do not request new founder biographies, invent portraits or reopen the logo decision. |
| Q13 | Complete the simulation study before publishing its comparison | important | Keep the unapproved simulation chart omitted. Retain approved catalog findings and DUA tile. Do not derive missing denominators/counts or plot the approximate 18.5% as exact. |
| Q14 | Approve or keep omitting three supplied anonymous audit findings | optional | Keep these three rows omitted and publish only the already-approved 88%/9,699 and 20/20 findings. Do not ask again for approved results. |
| Q15 | Confirm ChatGPT app publication only if its launch status has changed | optional | Keep Coming soon, existing interest collection and the current no-date wording. Do not promote Live without a verified directory listing. |

“Blocking” here means the present public content cannot be signed off as accurate until the conflicting claim is resolved. It is not a legal certification or a claim that every optional document is mandatory for every launch. In particular, research, portraits, an unpublished ChatGPT app and the Alvi diagram may stay omitted or qualified.

## Engineering and editorial work — no new owner facts required

Owner-approved entity/policy wording and routing may be dependencies, as noted. These tasks are recorded for implementation; this audit did not silently modify application code, published database content, billing, or production settings.

| ID | Work item | Concrete scope |
| --- | --- | --- |
| E01 | Align public API/MCP plan facts and plan vocabulary | Correct /api/v1/plans claims for the free models, daily scheduling and autonomous optimization. Align MCP list_plans/checkout vocabulary with the existing Scale plan, or explicitly route Scale through web pricing until supported. Do not alter pricing, billing or enable jobs to justify stale copy. |
| E02 | Remove the nonexistent REST-results instruction | Correct EN/ES docs Webhooks copy: the published API does not expose dashboard scan/listing result retrieval. Describe the actual dashboard/API boundary instead of directing readers to an unavailable endpoint. |
| E03 | Correct the wine-sector rewrite-review promise | Tell merchants to verify original facts and permitted claims before Apply. Apply currently generates and publishes in one action; do not promise a completed-rewrite preview. |
| E04 | Update promoted editorial articles to current product facts | Correct ecentic-vs-ecomtent, ecentic-vs-alhena-ai and ecentic-vs-profound feature paragraphs and their translations. Update the published Postgres content through the editorial workflow as well as the seed source, then revalidate; a seed-only edit is insufficient. Preserve article URLs and useful editorial material. |
| E05 | Repair English DUA story destinations | Change /stories/dua-flavors to the existing /stories/dua-flavours in Resources and Stories. Protect already-shared typo URLs with an alias if appropriate. No new customer information is needed. |
| E06 | Reconcile known legal-copy implementation facts | During the approved legal copy update, correct the known scrypt mismatch, incomplete subscription examples and Shopify scope descriptions. Localize the Terms metadata prefix. User decisions are needed for actual entity/policy choices, not for choosing an algorithm or inventing technical facts. |
| E07 | Verify enquiry delivery and scheduling after routing is confirmed | Check production sender, destination, Resend/Redis readiness and calendar destination using the approved operational test path. Current audit did not submit a form or send mail. Do not describe successful enquiry delivery as a booked appointment or visitor auto-reply. |
| E08 | Prepare verified captions for the existing product film | The responsive follow-up restored the deployed October film, ecentic-launch-20261008.mp4 (58.048 seconds, AAC audio), replacing the August banner reference. It still has no VTT/SRT or caption track element. Produce and verify captions/transcript, then add accessible EN/ES treatment as appropriate. An original script is optional helpful input, not a blocker requiring the user to write one. |
| E09 | Close pending-copy dispositions and verify a normal release | Apply answers in EN/ES, archive retired interactivePilot fields and obsolete asset placeholders, keep unpublished research/security gates unless approved, and omit unsupported extra market/timeline citations or research their primary sources. Build without NEXT_PUBLIC_REVIEW=1 and check complete HTML, metadata, JSON-LD and serialized messages for raw/pending copy. Keep optional unapproved content out of navigation and sitemaps. |

The earlier [12-group design audit](/Users/xhurianshaba/Developer/zennit/ecentic/output/design-audit-followup-2026-11-12/report.md) is also still open. Its scroll traps, action clipping, static-art fallback and shared-layout repairs are a separate implementation backlog; this content audit does not mark them fixed.

## Already resolved or intentionally omitted

- The current billing amounts and the instruction to preserve billing terms are already established; no new pricing decision was invented.
- DUA’s +12% aggregate and written publication permission are already approved. Missing narrative is tracked separately.
- Current labeled samples can stay: product conversations, source diffs, score examples, tool initial states and the explicitly illustrative pilot.
- Founder identities/biographies and existing contact address are known. Current legal operator/contracting roles remain unresolved.
- WooCommerce publication was resolved against its official WordPress.org listing; older audit uncertainty is stale.
- Resources contains published local editorial cards; it is not an empty archive.
- The old Compare missing-server-title warning is stale; current title/metadata are present.
- Fil Rouge homepage omission was requested. Founder portraits are optional.
- A missing research PDF does not block a site that does not publish the research page. The intended research URL currently returns 404.
- MarketingFaq filters wholly unresolved FAQs. Normal mode omits them rather than showing blank answers.

## Release acceptance

1. Confirm Q01/Q02 and reconcile every occurrence, including Terms, Privacy, footer, About, Contact, Security and Organization data.
2. For every other item, record approved content, conservative agreed wording, or explicit omission. No “pending confirmation” label belongs in the release.
3. Complete E01–E09 and the outstanding design repairs. Recheck affected rendered pages and machine-readable documents in both locales.
4. Build and inspect normal mode with the review flag disabled. Verify full response bodies as well as visible pages: metadata, JSON-LD, RSC/client messages and public API/MCP summaries must agree.
5. Verify approved enquiry delivery, calendar and contact destinations; do not equate a local source check with production service readiness.
6. Confirm optional research/security content stays unpublished until its explicit approval is recorded; intentional samples keep their labels.
7. Check the published editorial rows after corrections and perform the final live release smoke check. Record actual checks rather than carrying forward old receipts.

## Coverage and limits

Root fetched all **61 registered public routes in English and Spanish: 122 local HTML responses**. All returned 200 and supplied a title, description, canonical URL and Open Graph image URL; no empty href was found. All were on the review server, so this is not a production-mode sign-off. Both Security responses contained the expected review-only raw questions; the rest contained no raw TODO text. Metadata URL presence does not by itself prove every external asset loads.

Primary review covered 40 route/locale states, 72 internal anchor destinations and read-only public plan/MCP responses. Content review checked all eight sector implementations, public docs/tools/recovery instructions, 28 unique Solutions destinations and 32 resource/docs targets. Trust reviewed all company, security, policy, support, demo/partner, enterprise and customer-proof source paths and their EN/ES publication gates.

The promoted local comparison articles received targeted live fact checks. This was not an exhaustive sentence-by-sentence verification of every historical blog article, every competitor’s current offering, or every jurisdiction’s requirements. Additional historical articles need an editorial sweep before claiming an archive-wide factual sign-off.

No production deployment/database was inspected; no authenticated dashboard, real scan, checkout, form submission, email delivery, OAuth flow or purchase was executed. No credentials were read. Film analysis checked stream metadata and caption presence, not a verified transcript. All screenshot viewing remained delegated; root viewed no screenshots.

Normal-mode behavior was checked through the current sanitizer/evidence helpers and source gates. An independent complete production build still needs release verification. The application source was left unchanged.

## Evidence and working records

- [Fill-in questionnaire](/Users/xhurianshaba/Developer/zennit/ecentic/docs/marketing/launch-questionnaire.md)
- [Consolidated questions and engineering register](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/launch-register.json)
- [All 218 pending source leaves with resolution IDs](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/pending-content-crosswalk.json)
- [122-response local HTML census](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/root/public-html-census.json)
- [Primary pages, evidence and plan-catalog audit](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/primary/report.md)
- [Trust, company and commercial audit](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/trust/report.md)
- [Solutions, docs, tools and editorial audit](/Users/xhurianshaba/Developer/zennit/ecentic/output/launch-content-audit-2026-11-12/content/report.md)

This current register supersedes the older 146-string content snapshot for launch planning. Historical audits remain useful provenance; they are not proof that an unresolved field is still exposed, that an old defect persists, or that an already supplied fact needs to be requested again.
