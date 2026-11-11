# Marketing evidence and chart boundaries

Checked November 10, 2026. Data lives in `apps/web/src/content/marketing-evidence.ts`; translated presentation copy lives in `apps/web/messages/fragments/enterpriseEvidence.{en,es}.json`. Machine-readable primary-source receipts, including article hashes, are in [evidence-source-checks.json](./evidence-source-checks.json). These records preserve what was verified; they do not establish future availability.

## Research and audit figures

| Figure | Evidence and publication state | Required presentation |
|---|---|---|
| C1: 36,797 simulated purchases, ChatGPT 51.6% | Supplied in the website brief. Exact Claude/Gemini shares, per-model selection counts/denominators and methodology remain pending Alvi. The approximate 18.5% is not an exact plot value. | Omit the chart in normal production while `status` is pending. Review may show the known value and missing-value states. Never map null to zero or derive counts from 36,797. Perplexity is separate in `optionalModels` until comparable-rate confirmation. No link to the unpublished research route. |
| C2: 88% of 9,699 products had a data fault | Already approved for anonymous publication in the original request. The percent is rounded; exact faulty-product count was not supplied. | Show 88% and the 9,699-product sample. Keep `failureCount: null`; never calculate an apparent exact count. |
| C2: 20 of 20 answers failed to name the marketplace for two bottles it stocks | Already approved as 0 of 20 successes in the original request; 20 of 20 failures is the same observation. This is the same company as the 88% catalog finding. | Consistent failure direction. Each row uses its own sample; do not imply different companies or independent data sets. |
| C2: 45 of 45 pages missing price/stock/rating, 167 of 167 unusable descriptions, 6 of 6 payment failures | Values are supplied in the brief, but their publication approval is still pending Xhurian. | Filter out from normal production before creating client props. In review, mark as pending. Chart and table must use the same filtered rows. |
| C5: DUA Flavours +12% visits, April–July2026 | User-supplied, approved aggregate combining AI-assistant **or direct** visits; written confirmation dated September 3, 2026. Story starting point, exact changes and April activity remain pending. | The approved tile may publish. No weekly series, conversion, revenue or causal lift claim. Keep “visits, not sales” and the mixed-traffic limitation. |
| C6: market context | McKinsey $3–5T by 2030 and Adobe +393% / 60% figures lack retrieved primary verification. All numeric data fields remain null. | Optional; omit from normal production. A review-only pending state must not turn the unverified figures into plotted values. |

Approval provenance belongs here and in data comments, not in public chart captions. Public C2 citation names the anonymous catalog/answer checks and audited sample only.

## C3 primary sources

All six article bodies returned HTTP200 on November 10, 2026 and their publication dates were read directly. Search tooling returned infrastructure 404, so retrieval used ordinary direct HTTPS requests. No third-party reporting or search snippets were accepted as source evidence.

| Event | Primary source | Scope kept in public copy |
|---|---|---|
| Jan 11: Google UCP | [Google announcement](https://blog.google/products/ads-commerce/agentic-commerce-ai-tools-protocol-retailers-platforms/) | An open protocol, not automatic merchant admission. |
| May 13: Alexa for Shopping | [Amazon announcement](https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant) | Combines Rufus and Alexa+ on Amazon's shopping surfaces. |
| Sep 8: Meta Muse | [Meta announcement](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) | Purchases require approval; the article documents Link checkout. Its later update date is not the launch date. |
| Oct 15: Universal Cart | [Google announcement](https://blog.google/products-and-platforms/products/shopping/universal-cart-launch/) | US Search/Gemini rollout; supported Google Pay checkout or merchant-cart handoff. Merchant remains seller of record. |
| Oct 28: Shopify agent tools | [Shopify developer announcement](https://www.shopify.com/news/fall-26-edition-developer) | WebMCP on Liquid/Hydrogen storefronts and checkout; buyer approval before completing checkout. Native Shopify capability is not a new ecentic connection. |
| Nov 4: Shop Direct Merchant Workspace | [Amazon announcement](https://www.aboutamazon.com/news/retail/amazon-shop-direct-merchant-workspace) | Eligible-merchant self-service registration/catalog sharing. Shop Direct existed before this workspace; Buy for Me is conditional. |

Microsoft's January 8 launch article was not readable (HTTP403/generic redirect), so no exact-date event was added. The OpenAI March 24 article was also HTTP403. A proposed termination of one checkout offering must not be generalized to all approved app/plugin checkout. These two events remain inventory questions, not timeline dots. Six verified events are preferable to an unsupported eight-event chronology.

The [Shopify merchant companion](https://www.shopify.com/news/fall-26-edition-merchant), also checked November 10, describes Shop Pay in personal agents including Claude Duet. Therefore the site must not categorically say Claude can never buy. It does not establish a dedicated ecentic Claude checkout connection or universal capability in every Claude session.

## C4 profile/comparison parity contract

`channelComparisons` derives key/order/status/href/check date/source URLs from `aiChannels`. Translated table rows must not store their own statuses. Each `enterpriseEvidence.channels.rows[key]` is a condensed statement of the matching `enterpriseChannels.pages[key]` shops/reads/entry sections and capabilities. When a verified platform fact changes, review both surfaces and both locales in the same change. Never promote ecentic's status based only on a platform's buying capability.

| Channel | Qualifiers that both surfaces must preserve |
|---|---|
| Google | Select-merchant native-checkout eligibility in US/Canada/Australia; Universal Cart's US rollout; Google-controlled admission; supported Google Pay or merchant handoff. |
| ChatGPT | Approved app/plugin checkout versus ordinary merchant links; feed approval separate from checkout; ecentic app publication unconfirmed. |
| Claude | Merchant-provided catalog/cart/checkout tools and merchant-built agents; no dedicated ecentic checkout connection; no universal prohibition on consumer Claude purchases. |
| Copilot | English, US buyers and USD; selected onboarding restrictions; Shopify tracking is distinct from the planned feed. |
| Perplexity | Documented US Buy with Pro/merchant-program route; no unverified PayPal export or live ecentic feed. |
| Amazon | US and merchant eligibility; Buy for Me versus merchant link; workspace launch distinct from program origin; ecentic connector Coming soon. |

The comparison is a compact shared Table, not an artificial chart. It links to the profiles that contain source URLs and full limitations. No normal production counter should count Simulated as a live integration.

## Server/client and review rules

The chart server wrappers filter approval/pending states before constructing small client display props. `evidencePending` is a separate inventory of ID, owner and chart; translated questions live under `enterpriseEvidence.pending[id].question`. Do not send these questions or the entire message namespace to a client chart. Raw TODO markers must appear only in the review build or source review inventory.

C1/C2 charts and their accessible tables read the same values. Keyboard-focusable chart rows must expose the same count, denominator, source and missing-data caveats as the table. C5 is a stat tile until a real weekly series is supplied. C6 is never drawn as a growth curve.

ICU values: `simulations.caption(sampleSize)`, `findings.count(count,total)`, `findings.rounded(percentage,total)`, `findings.roundedDetail(percentage,total)`, `timeline.caption(date)`, `channels.caption(date)`, `dua.figure(percentage)`. Other structured copy comes from `getMessages`; shared toggle labels are `presentation.action.primary|secondary`, and DUA's story action is `dua.action.primary`.
