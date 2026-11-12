# Launch information questionnaire

> Answered on 12 November 2026. This document preserves the original questions. The accepted answers and later company details are recorded in [launch decisions](./launch-decisions-2026-11-12.md); engineering checks and deployment prerequisites are in [launch release](./launch-release-2026-11-12.md). Do not ask the owner to answer these blank historical fields again.

Audit date: 12 November 2026. These are the **15 grouped fact/approval items** remaining after checking current content, existing answers, publication guards and the prior review decisions. They are not 15 unconditional launch blockers.

**Start with Q01 and Q02.** They concern conflicting or unsupported statements in the current legal/privacy content. Q03–Q10 complete the operational and commercial story; conservative omissions are available where stated. Q11–Q15 control optional artwork, evidence or status updates, with Q13 important only if the study is published.

You can reply in chat using the IDs, or fill the Answer column below. Link to an approved document where that is easier than retyping it. “Keep omitted for launch” is a complete decision for an optional section. Known facts are prefilled so you do not need to supply them again. Provider names/settings and document references are enough; this pack does not request credentials.

**What happens after your answers:** replace the relevant pending values in English and Spanish, reconcile visible copy and machine-readable data, preserve any still-required evidence gates, and run a normal-mode release check. An unanswered optional item stays out of the public site; it is not replaced with invented copy.

Full technical findings and scope: [Launch content audit](/Users/xhurianshaba/Developer/zennit/ecentic/docs/marketing/launch-content-audit.md).

| ID | Input | Priority / release decision |
| --- | --- | --- |
| Q01 | Confirm the current operator and contracting identity | Resolve current public claim |
| Q02 | Reconcile live Privacy promises with unconfirmed security facts | Resolve current public claim |
| Q03 | Complete the operational security and contracted-provider inventory | Complete offer / supporting facts |
| Q04 | Approve complete retention and deletion wording, including leads | Complete offer / supporting facts |
| Q05 | Assign monitored public contacts and enquiry follow-up | Complete offer / supporting facts |
| Q06 | Provide the approved DPA/NDA and procurement process | Complete offer / supporting facts |
| Q07 | Ratify the real enterprise service offer with prefilled durations | Complete offer / supporting facts |
| Q08 | Supply final pilot example copy or keep the deliberate illustration | Complete offer / supporting facts |
| Q09 | Define partner benefits and permitted agency/reseller use | Complete offer / supporting facts |
| Q10 | Complete the approved DUA story’s missing narrative | Complete offer / supporting facts |
| Q11 | Keep the security data-flow diagram gated until Alvi approves it | Optional; omission available |
| Q12 | Supply founder portraits only if desired for launch | Optional; omission available |
| Q13 | Complete the simulation study before publishing its comparison | Needed only to publish study/chart |
| Q14 | Approve or keep omitting three supplied anonymous audit findings | Optional; omission available |
| Q15 | Confirm ChatGPT app publication only if its launch status has changed | Optional; omission available |

## Q01 — Confirm the current operator and contracting identity

**Applies to:** `/about`, `/contact`, `/security`, `/privacy-policy`, `/terms`, `shared footer and Organization JSON-LD`.

**Already known:** The Tirana contact address, three founders and biographies are already supplied. The retained old about namespace says ECENTIC SH.P.K., founded 4 April 2026, but the active About route reads enterpriseCompany.about. This historical value does not establish the intended Polish/Delaware operator.

**Decision / information needed:** Which entity is the launch operator and customer contracting party? Please provide the exact Polish and Delaware legal names, registered addresses, each entity’s role, and approved replacements for the zennit/Albania wording in Terms and Privacy. Is the existing Tirana address still the public contact address?

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Current operating company | Exact legal name and registered address | |
| Customer contracting / invoicing entity | Name and role | |
| Polish entity | Exact legal name, registered address and role, or explicitly not applicable | |
| Delaware entity | Exact legal name, registered address and role, or explicitly not applicable | |
| Public Tirana contact address | Pallatet Merkaj, Hyrja 1, Dera 12, Rruga Muhamed Deliu, Qesarakë, Tiranë, Albania — keep / replace | |
| Terms and Privacy replacements | Approved operator, contracting and jurisdiction wording | |

**If unanswered:** Keep unconfirmed extra entity details out of marketing/schema, but obtain a confirmed current operator and matching approved legal wording before treating the present legal pages as launch-ready. Do not select an entity or jurisdiction from old copy by inference.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:309), [enterpriseChrome.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseChrome.en.json:31), [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:62).

## Q02 — Reconcile live Privacy promises with unconfirmed security facts

**Applies to:** `/privacy-policy`, `/security`.

**Already known:** The implementation and newer Security copy use Better Auth scrypt. The old policy instead names bcrypt/argon2. Code cannot prove the actual hosting-account encryption controls or account-specific AI-provider terms.

**Decision / information needed:** What account-specific evidence supports the Privacy page’s promises of TLS 1.2+, encryption at rest, and AI-provider retention only for the request lifecycle? Please supply the deployed controls and provider retention/training terms, or approve narrower factual wording that matches the actual accounts.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| TLS and encryption at rest | Actual deployed controls and supporting record | |
| Google / store credential protection | Actual storage and encryption controls | |
| AI request retention and training | Terms/settings for the actual Azure/Gateway/provider accounts, including exceptions | |
| Approved privacy wording | Keep supported claims / supply narrower wording or approved policy document | |

**If unanswered:** Publish reviewed, evidence-backed statements rather than the unsupported absolutes. Correct the already-known scrypt mismatch as engineering/editorial work; do not ask the user to choose a password algorithm or invent a no-training promise.

**Evidence:** [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:26), [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:78), [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:82).

## Q03 — Complete the operational security and contracted-provider inventory

**Applies to:** `/security`, `/solutions/enterprise`, `footer DPA/sub-processor destinations`.

**Already known:** Code-used providers already listed: Azure OpenAI, Anthropic, Google, Perplexity, Vercel, PostgreSQL provider, Upstash, Sentry, PostHog, Google Analytics 4, Resend, UploadThing and Stripe. No SOC 2 certification is claimed.

**Decision / information needed:** Please complete one approved production inventory: contracted provider/legal name, purpose, processing/storage location and agreement for each listed service; production database provider/region; who has production access and whether MFA is enforced; and documented backup/recovery targets. Which code-used services are actually enabled in production?

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Production hosting and database | Provider, enabled services and regions | |
| Access and MFA | Which roles have production access; where MFA is enforced | |
| Backups and recovery | Frequency, retention and documented recovery targets; say if no target is agreed | |
| Provider register below | Confirm enabled services, contracted names, locations and agreement references | |

The following is a **code-used provider inventory**, not an approved contracted subprocessor register. Mark unused services as not enabled; add any production services missing from the list. “Unknown” remains unresolved.

| Code-used service | Current purpose | Enabled? Contracted name / agreement | Processing / storage locations |
| --- | --- | --- | --- |
| Azure OpenAI | GPT simulations, listing rewrites and structured data. | | |
| Anthropic | Claude listing comparisons through Vercel AI Gateway. | | |
| Google | Gemini listing comparisons through Vercel AI Gateway. | | |
| Perplexity | Separate comparison and discovery tools through Vercel AI Gateway. | | |
| Vercel | Application hosting and AI Gateway request routing. | | |
| PostgreSQL provider | Application records, connected catalog data and credentials. | | |
| Upstash | Redis caches, session data and rate-limit counters. | | |
| Sentry | Error monitoring and application telemetry. | | |
| PostHog | Product analytics after analytics consent. | | |
| Google Analytics 4 | Website analytics after analytics consent. | | |
| Resend | Transactional email delivery. | | |
| UploadThing | Storage for uploaded files. | | |
| Stripe | ecentic plan and performance-fee billing. | | |

**If unanswered:** Keep the dated code-provider inventory with its current limitation, omit unconfirmed controls/locations, and make no residency, certification, recovery or full-subprocessor promise. Resolve any stronger existing Privacy claims under Q02. No credentials or secret values are needed.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:52), [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:129), [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:149).

## Q04 — Approve complete retention and deletion wording, including leads

**Applies to:** `/privacy-policy`, `/security`, `/demo`, `/partners`, `public interest and integration forms`.

**Already known:** Existing policy: keep active-account records; remove store tokens on disconnect; retain product history unless deletion requested; remove account data on deletion; retain legally required billing references and amounts without shopper details. Marketing enquiries create no account or CRM record and no automated visitor reply. Backup purge timing and lead-email retention are not specified.

**Decision / information needed:** Please approve the actual retention/deletion schedule for accounts, disconnected catalogs, checkout/order records, billing exceptions, backups/logs, and demo/partner/waitlist emails. Who executes deletion requests, and what completion wording can we truthfully publish for data held by providers and inboxes?

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Account and catalog records | Retention and deletion behavior | |
| Disconnected store credentials/history | What is removed, what remains and for how long | |
| Checkout/order and billing records | Retention and applicable exceptions | |
| Backups and logs | Retention and deletion/purge timing | |
| Demo / partner / interest emails | Inbox/provider retention and deletion process | |
| Request handling | Monitored route, responsible role and truthful completion wording | |

**If unanswered:** Keep only verified retention behavior and a monitored request path; do not add an immediate deletion or backup-purge deadline without evidence. The owner supplies policy decisions; engineers verify each stated mechanism before publishing the final wording.

**Evidence:** [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:66), [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:90), [marketing-leads.md](/Users/xhurianshaba/Developer/zennit/ecentic/docs/integrations/marketing-leads.md:3).

## Q05 — Assign monitored public contacts and enquiry follow-up

**Applies to:** `/contact`, `/support`, `/demo`, `/partners`, `/privacy-policy`, `/terms`, `/security`.

**Already known:** Support address is support@ecentic.ai; scheduler is https://cal.com/ecentic-ai/15min. Enterprise duration is agreed separately. Lead email defaults to support@ unless MARKETING_LEAD_EMAIL is configured. There is no promised response-time SLA or visitor auto-acknowledgement.

**Decision / information needed:** Please confirm who monitors support@ecentic.ai, privacy@ecentic.ai and legal@ecentic.ai, who receives/follows up demo, partner and integration enquiries, and who owns the 15-minute calendar. Are support and calls actually available in both English and Spanish? Supply a public phone, security@ or press@ only if you want them published and they are monitored; otherwise keep them omitted.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| support@ecentic.ai | Monitored? Responsible role? | |
| privacy@ecentic.ai | Monitored? Responsible role or approved replacement? | |
| legal@ecentic.ai | Monitored? Responsible role or approved replacement? | |
| Demo / partner / integration enquiries | Destination inbox and follow-up owner | |
| https://cal.com/ecentic-ai/15min | Owner and whether this is the correct launch calendar | |
| English and Spanish service | Which support/call languages are actually staffed? | |
| Optional phone, security@, press@ | Publish with responsible owner / keep omitted | |

**If unanswered:** Use a verified existing support path and optional calendar; route specialist requests to an approved monitored inbox. Keep phone/press/security contacts and numeric response promises out until confirmed. Engineering checks sender, recipient and Redis configuration without asking for secrets in this questionnaire.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:104), [legal.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/legal.en.json:62), [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:841).

## Q06 — Provide the approved DPA/NDA and procurement process

**Applies to:** `/security#dpa`, `/contact`, `/solutions/enterprise`, `/demo`.

**Already known:** The DPA CTA goes to /demo. The site already says to agree signing arrangements before personal data and does not promise a certification/security pack.

**Decision / information needed:** What approved DPA can be supplied, who handles requests and signs it, and what is the policy for a customer NDA? Which security questionnaire materials can we share today, under what conditions, and is there any approved compliance roadmap wording beyond the current statement that SOC 2 is unavailable?

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| DPA | Approved document/version or no standard document yet; request route and signatory | |
| Customer NDA | Acceptance/signing policy before non-public data | |
| Security questionnaires | Owner, available materials and sharing conditions | |
| Compliance wording | Keep current no-certification statement / provide approved roadmap wording | |

**If unanswered:** Keep public-data-first scoping and the current requirements discussion. Do not publish a document download, signature promise, certification date or non-public-data engagement until its documents and handling are agreed.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:117), [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:136), [enterpriseSolutions.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseSolutions.en.json:639).

## Q07 — Ratify the real enterprise service offer with prefilled durations

**Applies to:** `/solutions/enterprise`, `/demo`.

**Already known:** Current offer says public-data baseline, one market/category, written targets on day one, a founder on the account, authorized changes and a written readout; fees agreed on first call. Proposed 25 questions and 3 runs per assistant remain TODO values, not approved facts.

**Decision / information needed:** Can we keep the current 4-week fixed-fee audit, 6-week pilot and 3-month design study? Please confirm the delivery owner, scope/fees or quote process, target-setting and any outcome-linked fee, assistant/question collection method, run counts, weekly client time, and actual readout/report-sharing formats. Also confirm the current claim that pilots are in scoping across enterprise retail, travel and flexible workspace.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Audit: 4 weeks, fixed fee | Keep / replace; scope and pricing or quote process | |
| Pilot: 6 weeks, one market/category | Keep / replace; baseline, repeat and readout | |
| Design study: 3 months | Keep / replace; prototype and readout scope | |
| Delivery team | Confirm founder-on-account and engineering access, or replacement | |
| Method: proposed 25 questions × 3 runs | Confirm / replace; models, versions/access and collection method | |
| Customer time and outputs | Weekly involvement; actual reports/files and sharing rights | |
| Targets and outcome-linked fees | How these are agreed; approved offer wording | |
| Current pilot pipeline claim | Confirm retail, travel and flexible workspace are in scoping / remove claim | |

**If unanswered:** Describe a scoped engagement agreed on the first call, preserving public-data-first and explicit limitations. Remove precise duration, staffing, fee and active-pipeline assertions that the commercial owner cannot support. Do not turn service measures into automated dashboard features.

**Evidence:** [enterpriseSolutions.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseSolutions.en.json:413), [enterpriseSolutions.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseSolutions.en.json:467), [enterprisePage.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterprisePage.en.json:9).

## Q08 — Supply final pilot example copy or keep the deliberate illustration

**Applies to:** `/solutions/enterprise#pilot`.

**Already known:** Current example: Spain, outdoor backpacks, public product pages; category lead/ecentic analyst, merchandising lead/catalog editor, business owner/ecentic lead; question set and baseline workbook, approved change list, matched re-run/change log, summary/limits/next decision. The user requested this filled sample for visual review and final copy is still an open task.

**Decision / information needed:** For the final pilot illustration, keep Spain/outdoor backpacks/public pages or replace them? Please supply the final market/category, starting data, stage responsibilities, question/fact-check examples, baseline and repeat/readout deliverables, measurement limits and next decision—or explicitly retain this as an illustrative planning example.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Example status | Keep clearly illustrative / replace with approved real planning brief | |
| Market/category | Current: Spain / outdoor backpacks | |
| Starting data | Current: public product pages | |
| Stage responsibilities | Final roles for baseline, changes, matched repeat and readout | |
| Questions, outputs and limits | Approved examples, deliverables, measurement limits and next decision | |

Keeping this as a clearly labeled planning illustration is valid. It does not need to become a customer case study. Final service promises belong in Q07.

**If unanswered:** Keep the visible illustrative label and existing non-numerical planning example. Do not recast it as an actual engagement, testimonial, outcome or approved service staffing promise. Update EN and ES together when the owner supplies final text.

**Evidence:** [review-followups.md](/Users/xhurianshaba/Developer/zennit/ecentic/docs/marketing/review-followups.md:5), [enterprisePilotPreview.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterprisePilotPreview.en.json:3), [enterprise-pilot.tsx](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/app/[locale]/(main)/solutions/_components/page-bodies/enterprise-pilot.tsx:16).

## Q09 — Define partner benefits and permitted agency/reseller use

**Applies to:** `/partners`, `/solutions/agencies-and-partners`, `/terms`.

**Already known:** Three tracks already chosen: agencies/resellers, technology partners, creators/affiliates. One account can hold that owner’s stores; delegated agency permissions/team seats and white-label reports are not claimed. Partner logos require written agreement.

**Decision / information needed:** For each partner track, what benefits, eligibility, joining fee, referral/margin/payment terms and access/materials are approved? Confirm the application-to-call/onboarding/joint-selling process, client-account ownership and report-sharing rights, and how approved reseller use is covered alongside the current Terms.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Agencies / resellers | Eligibility, benefits, joining fee, margin/referral/payment terms | |
| Technology partners | Eligibility, access, benefits and commercial terms | |
| Creators / affiliates | Eligibility, compensation basis and payment terms | |
| Application and onboarding | Call duration (20 minutes is an unconfirmed proposal), access, materials, joint selling | |
| Client accounts | Approved ownership/access arrangement; do not imply unbuilt delegated roles | |
| Client reports | Permitted outputs/formats, consent, branding/attribution and distribution rights | |
| Resale agreement | Approved arrangement that reconciles reseller use with current Terms | |

**If unanswered:** Keep an expression-of-interest application with tailored terms agreed before partner access. Do not imply approved commissions, reseller rights, delegated access, white-label reports or a complete onboarding programme. No need to invent replacement answers to filtered FAQs.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:406), [enterpriseSolutions.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseSolutions.en.json:355), [enterpriseSolutions.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseSolutions.en.json:392).

## Q10 — Complete the approved DUA story’s missing narrative

**Applies to:** `/stories/dua-flavours`, `/stories`, `/resources`, `shared DUA result tile`.

**Already known:** Already approved: DUA Flavours is a UK flavors brand; +12% visits from AI assistants OR direct traffic, April–July 2026; written permission 3 September 2026. It is not sales, revenue, causality or an AI-only traffic measure. The evidence status is approved. Do not ask again for these facts or permission.

**Decision / information needed:** Xhurian: please supply DUA’s approved starting position, the products and exact fields ecentic changed with dates, and what happened in April before the Shopify app’s 20 May 2026 launch. If expanding the method, supply the analytics source and comparison definition behind the already-approved 12% aggregate; do not invent a weekly series or stronger outcome.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Starting position | Approved DUA context before the work | |
| Actual work | Products, fields changed, dates and responsible team | |
| April start | Explain work before the Shopify app launch on 20 May 2026 | |
| Optional expanded method | Analytics source and comparison definition behind the approved aggregate | |

Do **not** reapprove the supplied +12% result or written publication permission. Preserve its exact meaning: visits from AI assistants **or direct traffic**, April–July 2026, with no sales, revenue, AI-only or causal claim.

**If unanswered:** Keep the approved qualified aggregate result and permission statement, with unfilled narrative omitted. Do not present the short result tile as a fully documented before/after intervention story. Further analytics-method detail is an enhancement, not a reapproval of the supplied aggregate.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:516), [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:549), [marketing-evidence.ts](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/content/marketing-evidence.ts:158).

## Q11 — Keep the security data-flow diagram gated until Alvi approves it

**Applies to:** `/security#data-flow-review (review mode only)`.

**Already known:** Six proposed connections: catalog import, AI request, model response, listing Apply, structured-data publication, separate Google sync. Each has proposed what/when/control text. The review explicitly assigns every connection to Alvi.

**Decision / information needed:** If the diagram should ship publicly, can Alvi approve or correct the what/when/control text for all six connections, including exactly what data reaches each model and the separate publishing/sync actions? Otherwise retain the review-only gate.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Publish this diagram? | Keep review-only / Alvi approves with corrections below | |
| Import | What data, when it moves and permission/control | |
| AI request and response | Exact fields sent/returned, model routing and timing | |
| Listing Apply | Generation/publication action and control | |
| Structured data | Separate publish action and storefront rendering dependency | |
| Merchant Center | Separate supplemental sync, fields, account boundary and timing | |

**If unanswered:** Leave the diagram out of normal production. Alvi’s approval is required to publish this illustration, not to launch the site without it; deployment facts and public legal assertions are separate Q02/Q03 issues.

**Evidence:** [security-flow.tsx](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/app/[locale]/(main)/security/_components/security-flow.tsx:9), [interactiveSecurity.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/interactiveSecurity.en.json:5).

## Q12 — Supply founder portraits only if desired for launch

**Applies to:** `/about`.

**Already known:** Names, roles, biographies and LinkedIn URLs for Xhurian, Alvi and Iseld are already supplied. Fil Rouge logo omission is an intentional review decision, so it is not a launch asset request; About can use the program’s text name.

**Decision / information needed:** If founder photos are wanted at launch, provide approved portraits for the three named founders and any crop/credit requirements. Otherwise keep the current text-only team section.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Founder portraits | Keep text-only / provide approved portraits with crop and credit requirements | |

**If unanswered:** Keep text-only founder cards and the intentional Fil Rouge omission/text fallback. Do not request new founder biographies, invent portraits or reopen the logo decision.

**Evidence:** [enterpriseCompany.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseCompany.en.json:261), [body.tsx](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/app/[locale]/(main)/about/_components/body.tsx:144), [annotation-pass.md](/Users/xhurianshaba/Developer/zennit/ecentic/docs/marketing/annotation-pass.md:36).

## Q13 — Complete the simulation study before publishing its comparison

**Applies to:** `/`, `/es`.

**Already known:** 36,797 simulated purchases; year 2026. ChatGPT 51.6% supplied. Claude/Gemini approximate 18.5% is not an exact plotted result. Perplexity is separated from the three store-scan models. This is simulated choice research, not real shopping traffic.

**Decision / information needed:** Alvi: what are the exact Claude and Gemini selection shares, selection counts and decision totals for each model, denominator definition, and reviewed methodology for the 36,797-purchase study? Does Perplexity have a comparable result from the same study?

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| Publish study/chart at launch? | Keep omitted / complete the evidence below | |
| Exact model results | Claude, Gemini and ChatGPT selection counts, decision totals and exact shares | |
| Denominator | Definition and allocation behind each percentage | |
| Perplexity | Comparable study result? If not, keep excluded | |
| Study sample and method | Real/sample products, product count, categories, questions/selection, runs, models/versions, dates | |
| Simulated purchase | Exact definition; any supported additional findings | |
| Research publication | Approved write-up/PDF, citation date and public source if publishing the paper | |

**If unanswered:** Keep the unapproved simulation chart omitted. Retain approved catalog findings and DUA tile. Do not derive missing denominators/counts or plot the approximate 18.5% as exact.

**Evidence:** [marketing-evidence.ts](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/content/marketing-evidence.ts:4), [enterpriseEvidence.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseEvidence.en.json:205), [measured-evidence.tsx](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/components/marketing/measured-evidence.tsx:21).

## Q14 — Approve or keep omitting three supplied anonymous audit findings

**Applies to:** `/`, `/es`, `/solutions/enterprise`, `/es/solutions/enterprise`, `/solutions/retailers-and-marketplaces`, `/es/solutions/retailers-and-marketplaces`.

**Already known:** The three counts and denominators are supplied, not missing. 45/45 belongs to the same large spirits marketplace as the approved 88% of 9,699 and 20/20 failed answers. 167/167 is a flexible workspace network. 6/6 is a skincare brand; denominator is countries tested, not orders. 88% of 9,699 and 20/20 are already approved. Exact faulty-product count for 88% is unknown and should remain null.

**Decision / information needed:** Xhurian: may we publish each anonymous result: 45/45 pages missing price, stock or rating; 167/167 unusable descriptions; 6/6 country checkout tests blocked by one shipping setting? Answer approve/omit for each.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| 45 / 45 missing price, stock or rating | Approve anonymous publication / omit | |
| 167 / 167 unusable descriptions | Approve anonymous publication / omit | |
| 6 / 6 countries with shipping-setting checkout failures | Approve anonymous publication / omit | |

These are publication decisions, not requests for replacement numbers. The existing 88% of 9,699 and 20/20 findings are already approved; the exact numerator behind the rounded 88% remains unknown.

**If unanswered:** Keep these three rows omitted and publish only the already-approved 88%/9,699 and 20/20 findings. Do not ask again for approved results.

**Evidence:** [marketing-evidence.ts](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/content/marketing-evidence.ts:38), [enterpriseEvidence.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseEvidence.en.json:219), [measured-evidence.tsx](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/components/marketing/measured-evidence.tsx:83).

## Q15 — Confirm ChatGPT app publication only if its launch status has changed

**Applies to:** `/platform`, `/es/platform`, `/platform/sell`, `/es/platform/sell`, `/ai-channels`, `/es/ai-channels`, `/ai-channels/chatgpt`, `/es/ai-channels/chatgpt`, `/integrations`, `/es/integrations`.

**Already known:** Store scans already support ChatGPT. Generic UCP/checkout tools do not prove a published ChatGPT app. A ChatGPT product feed is a separate planned integration, not proof of app publication. No launch date is promised.

**Decision / information needed:** Has ecentic’s ChatGPT app actually been approved and published? If yes, provide its public directory URL and confirmed supported scope; otherwise the current Coming soon status can remain.

| Field | Current value / information to provide | Your answer |
| --- | --- | --- |
| ChatGPT app publication | Still not published / published | |
| If published | Public directory URL and confirmed approved capabilities; no date or feature inference | |

**If unanswered:** Keep Coming soon, existing interest collection and the current no-date wording. Do not promote Live without a verified directory listing.

**Evidence:** [enterprisePlatform.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterprisePlatform.en.json:1020), [enterpriseChannels.en.json](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/messages/fragments/enterpriseChannels.en.json:173), [ai-channels.ts](/Users/xhurianshaba/Developer/zennit/ecentic/apps/web/src/content/ai-channels.ts:48).

## You do not need to provide these again

- Current plan amounts and the choice to preserve billing terms while removing the cap callout.
- Founder names, roles, biographies and existing LinkedIn URLs.
- DUA’s approved aggregate result and publication permission.
- New real-customer data for the clearly labeled sample products, scores, conversations and source diffs.
- A Fil Rouge homepage logo: that tile was deliberately removed in the review.
- Proof that the WooCommerce plugin is published: its official listing was verified during this audit.
- Public McKinsey/Adobe/Copilot/OpenAI citations: retrieving usable primary sources is agent research; unsupported extras stay omitted.
- A film transcript from scratch: the current 58-second launch film exists with audio. I can prepare and verify captions; an original script or caption file is useful only if you already have one.

## Launch completion rule

Every pending item must end in one of three states: **approved factual content**, **truthful agreed wording**, or **explicit omission from this launch**. Keep the historical audit record in docs, and remove obsolete placeholders from shipped message catalogs once their disposition is settled. Do not enable review mode or pending evidence simply to fill the page.
