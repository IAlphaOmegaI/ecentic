# WebMCP store scans

Research checked **14 September 2026**. WebMCP is evolving; recheck the linked specification and Chrome documentation before changing the detector or adding browser execution.

## Product behavior

ecentic offers the same WebMCP source scan and audit at `/webmcp-scanner` without signing in and at `/dashboard/[store]/webmcp` for a connected store. The dashboard tool is free and is exempt from the subscription overlay. The authenticated action verifies ownership and uses the connected store's origin. Reports describe the current scan; they are not saved as historical measurements.

The report combines eight shopping-workflow assessments, seven audit checks, prioritized findings with merchant-specific fix hints, a tool inventory with parameter metadata, and public storefront forms that could benefit from WebMCP annotations. It shows the evidence and source location behind each finding so a developer can review the suggested change. Scanning and viewing suggestions do not implement tools or change the storefront.

The scan reports **evidence in the pages and scripts inspected**. It does not certify that a browser registered the tools, that those tools work, or that an AI shopping agent uses them. There is no readiness percentage or invented relationship with simulation win rate. “No evidence found” applies only to the inspected resources; a blocked request or incomplete scan must remain visible.

## Shopping-workflow evidence

The audit records observed storefront context separately from tool quality. Its context is `storefront` when product or catalog pages, cart forms, or commerce-tool declarations provide evidence; otherwise it remains `unconfirmed`. Context signals retain their source URLs. An unconfirmed context does not mean the business is not a store, and a storefront signal does not establish WebMCP support.

Each workflow includes matching tool names with their source and page URLs, related form IDs, and one of four statuses:

- `toolFound`: a relevant tool declaration with recoverable metadata and a declared handler or form was found in inspected source. Browser registration and successful execution remain unverified.
- `formOnly`: a relevant form was observed without matching tool evidence. Its separate form audit determines whether to suggest annotations or require manual review; this status is not a protocol error.
- `notObserved`: the inspected resources contained no matching evidence. The workflow may exist on an unvisited page, after authentication, or in runtime-generated code.
- `review`: a relevant tool declaration was observed, but incomplete or unresolved metadata, schema, or handler evidence requires manual assessment.

| Workflow | Merchant guidance |
| --- | --- |
| Catalog search (`catalogSearch`) | Explain supported product queries and filters, and how results identify products. |
| Product details (`productDetails`) | Explain product references and whether the tool retrieves details or navigates to a product page. |
| Variants (`variants`) | Describe product options or variant identifiers and distinguish selecting a variant from adding it to a cart. |
| Cart reading (`cartRead`) | Describe how shoppers can inspect their current cart, including items, quantities, and totals. |
| Cart updates (`cartUpdate`) | Clarify adding, removing, and changing quantities; explain absolute versus incremental changes and preserve the intended confirmation flow. |
| Checkout (`checkout`) | Describe the handoff to checkout and distinguish navigation from placing an order. Review implementation and consent manually. |
| Store policies (`policies`) | Explain which shipping, refund, return-policy, or FAQ topics shoppers can request; retrieving a policy is different from processing a return. |
| Orders (`orders`) | Explain authentication and whether the tool navigates to order history or retrieves order information. Review account and customer-data handling manually. |

These are useful shopping workflows, not eight mandatory WebMCP capabilities. Missing workflow evidence does not create a protocol failure or reduce a readiness score. A store may intentionally omit a workflow or provide it through a separate authenticated or hosted experience. Product-data completeness, Schema.org markup, catalog imports, and UCP profiles are separate concerns; none establishes that a browser-agent tool exists. The guidance follows Chrome's emphasis on clear purpose, understandable parameters, and explicit effects, while remaining distinct from the draft's required registration metadata. [Chrome best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices), [Tool dictionary](https://webmachinelearning.github.io/webmcp/#dictdef-modelcontexttool)

Classification uses normalized tool names and conservative opening-purpose evidence. Accept camelCase, snake_case, and kebab-case; do not infer another capability merely because a description mentions it. For example, a search tool saying it does not change the cart is not cart-update evidence. Form purpose is inferred from observed action, labels, and fields; ambiguous forms receive manual-review findings.

## Audit findings and form opportunities

Each check has a `pass`, `attention`, or `unknown` result. A pass means the inspected source satisfies that check; it does not establish browser compatibility or successful execution. Summary counts distinguish high-priority findings, improvements, form opportunities, passed checks, and checks that remain unknown.

| Check | Evidence and review scope |
| --- | --- |
| Discovery | Named tool declarations recovered from HTML or registration code. API signals without recovered definitions leave the inventory unknown. |
| Metadata | Missing names or descriptions, short descriptions, and possible duplicate names within the same page. Registrations on separate pages can legitimately reuse a name. |
| Parameters | Recovered parameter names, types, descriptions, and required state; missing descriptions and unnamed controls on annotated forms. Dynamically constructed schemas remain unresolved. |
| Implementation | A declared, missing, or unresolved imperative handler and declarative automatic submission. The scanner does not execute the handler. |
| Forms | Forms without annotations, possible related tools, and cases requiring manual review. An ordinary form without WebMCP attributes is an opportunity, not a protocol failure. |
| Coverage | Whether resource failures or scan limits prevented inspection of part of the discovered source. |
| Runtime | Always unknown for this source scan. Native browser registration and execution are not checked. |

Confidently missing required tool metadata or an imperative handler receives high priority. Potential duplicate registrations and automatic submission receive review findings: source order, conditional registration, and intended confirmation behavior can make them legitimate. Unresolved definitions stay informational. Descriptions shorter than 40 characters and missing parameter descriptions produce quality suggestions with an explicit heuristic threshold; they are not WebMCP conformance requirements. An omitted `inputSchema` does not fail a parameterless tool. [Tool dictionary](https://webmachinelearning.github.io/webmcp/#dictdef-modelcontexttool), [Chrome best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)

The form inventory includes forms without tool annotations and retains their page, selector, label, action, method, automatic-submission flag, and eligible field metadata. It excludes field values and credentials. Related tool names are a heuristic hint that an imperative tool may already cover the workflow; they do not prove equivalence or availability on that page. Search, product, and variant matching shares the workflow classifier, including naming variants and conservative opening-purpose evidence. Those forms, sensitive forms, checkout, order, return, and account flows, dialog forms, and forms already declaring `toolautosubmit` receive manual-review findings rather than enablement suggestions. Field-inferred product and variant forms also receive guidance without snippets: identifiers and options alone cannot establish whether submission reads, selects, adds to a cart, or purchases. Forms on sites with unconfirmed storefront context and forms with an unknown purpose also receive no enablement snippet. A GET method alone does not establish that a form is read-only: subscription forms can also use GET.

Equivalent form opportunities are grouped by purpose, action, method, and field structure, with every observed page and selector retained as a location. The raw form inventory remains available. Distinct source registration sites remain available to the duplicate-name audit even when identical tool definitions are consolidated in the displayed inventory; conditional fallback sites therefore produce a review hint, not a claim of a runtime collision.

For recognized storefront form opportunities, suggested code contains only `toolname` and `tooldescription` attribute additions. Fix hints reflect the observed shopping task, such as selecting a variant, applying a discount, estimating shipping, or updating a cart. Developers must review the proposed purpose and name, add the attributes to the existing form, and preserve its action, fields, validation, and consent flow. Suggestions do not add `toolautosubmit`, rewrite form handlers, or enable sensitive forms. Existing automatic submission is disclosed for review, not treated as inherently invalid.

The [WebMCP Verify example report](https://www.webmcpverify.com/report/d6c946ab-b043-410e-8ea8-4400c5055957) informed the grouped checks, evidence, and fix-hint presentation. ecentic keeps protocol requirements, quality suggestions, and adoption opportunities distinct. Either the declarative or imperative API can expose tools; supporting both is not required. General SEO or AI-crawler checks do not establish WebMCP conformance, and an aggregate readiness score would obscure the source scan's unknowns.

## What WebMCP exposes

WebMCP lets a loaded page expose JavaScript functions or annotated HTML forms to browser agents. Tool availability can depend on the page, session, and current application state. Chrome explicitly describes discovery as requiring a visit to the site. This is different from discovering a backend UCP profile at `/.well-known/ucp`. The current WebMCP API does not define a comparable universal HTTP discovery endpoint. [Chrome overview](https://developer.chrome.com/docs/ai/webmcp), [WebMCP explainer](https://github.com/webmachinelearning/webmcp)

[webmcp.com](https://webmcp.com/) is a directory maintained by nekuda, useful for finding examples. It is not the specification authority. ecentic scans the submitted store rather than treating directory membership, a mention of “WebMCP,” or an SDK script filename as proof of available tools.

The September 10 draft is a **W3C Community Group draft**, not a W3C Standard. The current API lives on `document.modelContext`; older examples use `navigator.modelContext`. Both can appear in deployed storefronts. [Current specification](https://webmachinelearning.github.io/webmcp/)

| Surface | Evidence to inspect | Meaning |
| --- | --- | --- |
| Declarative HTML | `<form toolname="…" tooldescription="…">` | A source declaration for a tool; browser registration remains unverified. |
| Current JavaScript | `document.modelContext.registerTool(...)` | Registration code exists; static analysis cannot prove it ran. |
| Earlier JavaScript | `navigator.modelContext.registerTool(...)`, `provideContext({ tools: [...] })` | Earlier API integration evidence; retain compatibility detection. [Historical proposal](https://github.com/webmachinelearning/webmcp/blob/fac8e9618ae9b7eef538fd9e5864c418cd061b33/docs/proposal.md) |
| API reference only | References to `modelContext` without an inspectable registration | Integration evidence, with no inferred tool count. |

## Declarative inspection

Both `toolname` and `tooldescription` belong on the form. Missing or empty metadata is a useful repair finding. The optional boolean `toolautosubmit` controls whether tool invocation submits the form automatically; its absence is not a defect. Parameter descriptions can use `toolparamdescription`, associated labels, or `aria-description`. [Chrome declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api)

The parameter name comes from the form control's `name`. Chromium trims whitespace, skips disabled or read-only controls, and associates controls using the form's listed elements, including controls outside the form with `form="id"`. Hidden inputs participate only when they have a nonempty `toolparamdescription`. Multiple radios or checkboxes sharing a name represent one parameter group. An HTML source field inventory is not the browser's complete generated JSON Schema: the specification's detailed synthesis rules are still under development. [Chromium schema implementation](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/forms/form_mcp_schema.cc), [Chromium parameter naming](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/html/forms/html_form_control_element.cc), [Declarative explainer](https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md)

HTML parsing must ignore comments and inert examples. A literal declaration inside an escaped code example, script string, or uninstantiated template is not an active form declaration.

## JavaScript inspection

Parse script syntax without executing it. Inspect actual model-context call expressions and extract metadata only when statically available. Comments, strings containing example code, and unrelated objects with a `registerTool` method must not become registrations. Calls with computed arguments or schema-building functions can be reported as evidence while their names or schemas remain unknown.

The current `ModelContextTool` dictionary requires `name`, `description`, and `execute`. **`inputSchema` is optional in the draft IDL**; its absence is valid for a parameterless tool and must not be labeled a conformance error. Extract input property names, types, descriptions, and required state from a statically recoverable schema when available. Preserve absent and unresolved schema states, and distinguish a declared handler from a missing or unresolved one. A missing or dynamically constructed schema cannot establish that inputs are unusable. [Tool dictionary](https://webmachinelearning.github.io/webmcp/#dictdef-modelcontexttool)

Registration can be conditional or deferred, and tools can later be removed. Even an inspectable, apparently complete call is source evidence rather than confirmation of runtime availability. Current registrations return promises and can be revoked through an `AbortSignal`. [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)

Shopify's conditional loader on monos.com passes its WebMCP module URL through a helper whose options default to `window` and `document`. The scanner follows statically resolved imports and script-element `src` assignments, including literal URLs passed through these loader parameters. It then inspects the referenced module for registrations. Small data-returning helpers, object registries, `Object.values`, and array mapping can expose tool metadata without executing the site's JavaScript. Registration evidence must still trace back to a browser model-context API; an unrelated object containing tool-shaped data is insufficient.

## Implementation and limits

The shared report types live in `apps/web/src/lib/webmcp.ts`. The entry points are `apps/web/src/server/app/webmcp.ts`; fetching and orchestration are in `server/utils/webmcp.ts`, tool and form inspection in `server/utils/webmcp-source.ts`, storefront and shopping-workflow classification in `server/utils/webmcp-commerce.ts`, deterministic audit checks in `server/utils/webmcp-audit.ts`, dependency discovery in `server/utils/webmcp-modules.ts`, shared response limits in `server/utils/webmcp-limits.ts`, and throttling in `server/utils/webmcp-rate-limit.ts`.

The source scan is intentionally bounded:

- Fetch the entered page and up to two additional pages, prioritizing one product-detail page and one collection or catalog page from observed same-origin browsing links. Recognize product URLs nested under collections. If the entered page has no product link, a collection page can reveal the product link used for the remaining slot. The limit remains three page requests within the same overall budget.
- Select only browsing links to likely product, collection, product-category, catalog, shop, or search pages. Exclude query-bearing links and cart, checkout, account, order, login, logout, and action paths. Do not select sensitive workflows as crawl destinations merely to fill the shopping-workflow assessments.
- Inspect executable inline scripts and fetch up to **12 unique external JavaScript URLs**, including CDN resources. Start with directly linked scripts and statically resolved inline imports or injected scripts, then follow up to **three dependency edges** beyond those starting resources.
- Discover static imports, exports from another module, literal dynamic imports, and statically traceable script-element `src` assignments or `setAttribute("src", ...)` calls. Resolve external-module imports against the module URL, inline imports against the document base, and injected script URLs against the document base. Bare module specifiers requiring import maps remain unresolved.
- Fetch in batches of at most four. Prioritize WebMCP or model-context filenames and dependencies reached through them; filenames guide the crawl but do not establish tool support. Track attempted URLs to stop cycles, and cap the reference inventory at 512 URLs. Dependency discovery has its own operation, depth, and per-source URL limits.
- Limit each HTML response to 8 MiB and each external script to 1 MiB, with a six-second request timeout and a twenty-second overall budget. Fetching and parsing share decoded UTF-8 byte limits; Shopify themes such as monos.com can exceed 4 MiB of HTML. Parser work, element, depth, and finding budgets remain independently bounded.
- Reuse the existing `HTTP.page` URL, redirect, SSRF, and response-size safeguards for every request.
- Apply a four-scans-per-minute IP limit through Redis, with a bounded process fallback.

Initial page failure produces an unreachable result; an oversized response instead explains the size limit and suggests a product or collection page. Failed secondary pages or scripts leave a partial report with coverage information. The script count includes inspected inline scripts as well as fetched external files. The same shared-module definition is counted once when several inspected pages reference it. The scan does not execute scripts, submit forms, or call tools.

Client-rendered forms, dependencies beyond the resource or depth budgets, runtime-computed URLs, unresolved import maps, authenticated tools, unvisited routes, and later application states can still be missed. Conversely, a statically referenced module can be inspected even when a consent or feature check would prevent that browser from loading it. A static scan cannot measure browser compatibility, successful registration, successful execution, or agent adoption. These limits belong alongside the findings, not only in technical documentation.

## Runtime verification: a separate future capability

For stronger evidence, use an isolated browser with native WebMCP support, load the selected page, and enumerate registered tools without calling them. Chrome documents an origin trial beginning with Chrome 149 and the local testing flag `chrome://flags/#enable-webmcp-testing`. Secure contexts, origin isolation, and the `tools` Permissions Policy affect availability. [Chrome setup and restrictions](https://developer.chrome.com/docs/ai/webmcp), [Origin trial announcement](https://developer.chrome.com/blog/ai-webmcp-origin-trial)

The current read-only enumeration call is:

```js
const tools = await document.modelContext.getTools();
const inventory = tools.map(({ name, description, inputSchema, origin }) => ({
  name,
  description,
  inputSchema,
  origin,
}));
```

Wait for page initialization and observe `toolchange` within a bounded interval. `getTools()` defaults to tools available from same-origin documents in the frame tree. Cross-origin tools require compatible permissions and explicit `exposedTo` / `fromOrigins` arrangements. Do not serialize the returned `window` references. The inventory is a snapshot of the visited page state, not an inventory of every workflow in the store. [Discovery and origin rules](https://developer.chrome.com/docs/ai/webmcp/imperative-api#discover-tools), [Current inspector implementation](https://github.com/beaufortfrancois/model-context-tool-inspector/blob/main/content.js)

Earlier Chrome tooling used `navigator.modelContextTesting.listTools()` and `registerToolsChangedCallback(...)`; those are legacy testing surfaces, not the current discovery contract. A future browser adapter should feature-detect APIs and record the browser/version used. [Historical inspector implementation](https://github.com/beaufortfrancois/model-context-tool-inspector/blob/d0e067a0f215c4afdb3d88d3bc1a5024ee9eec4e/content.js)

Injecting a mock `modelContext` to capture calls can assist development, but it changes the page's environment. Such captures must remain distinct from native browser registration. Tool execution, including search or cart operations, is outside a discovery scan; do not call `executeTool` to count or inspect tools.

## Primary examples for verification

- [Google order-tracking demo](https://googlechromelabs.github.io/webmcp-tools/demos/order-tracking/) has a declarative `get_order_status` form, a required `timeframe` select, and `toolautosubmit`. Its [source](https://github.com/GoogleChromeLabs/webmcp-tools/blob/main/demos/order-tracking/index.html) provides a small positive HTML example.
- [Google WebMCP demos](https://github.com/GoogleChromeLabs/webmcp-tools/tree/main/demos) provide imperative and declarative examples for development checks. Use public pages as scan fixtures without invoking their tools.
- Ordinary forms must remain outside the registered-tool inventory while still being available to the form-opportunity audit. Negative registration fixtures should also include escaped documentation examples, comments, inert templates, unrelated registration methods, and failed script fetches. Assertions should distinguish missing evidence from incomplete coverage, missing metadata from unresolved metadata, and adoption opportunities from protocol defects.

## Native browser cross-check: Monos, 14 September 2026

An independent check of `https://monos.com/` used **Google Chrome for Testing 151.0.7922.34**, headless, with WebMCP enabled and a fresh isolated browser session. No tools, forms, cart actions, or account actions were invoked. Both `document.modelContext.getTools` and the `Document.prototype.modelContext` getter were native browser implementations. Page-level enumeration and Chrome DevTools Protocol enumeration each returned the same **10 registered tools**:

```text
browse_store
cancel_cart
get_cart
get_product
manage_orders
proceed_to_checkout
search_catalog
search_shop_policies_and_faqs
show_variant
update_cart
```

Every CDP registration stack pointed to `https://cdn.shopify.com/storefront/webmcp/webmcp-0.1.1.js`. The inspected bundle was 65,509 bytes, identified its Shopify build as `b6784f12b7ea5ba9f1ee374ca863f643776f2a2d`, and had SHA-256 `f302b9c970017571219f658f9351ecb4bbb58fe22b4a72ae81dc987bc929f6b4`. The updated static parser independently recovered all ten names and all top-level input names from that bundle. Descriptions matched after trimming surrounding whitespace; input property order differed without changing the names.

This case explains why directly linked scripts alone are insufficient. Monos includes an inline loader that passes an escaped CDN URL to a helper, checks browser API availability, and appends a module script after origin-trial setup and page initialization. The original HTML does not need a `script[src]` element pointing at the WebMCP bundle.

### Reproducing the native inventory

1. Launch a fresh Chrome instance with remote debugging and WebMCP support. For local development, Chrome provides its WebMCP testing flag; the Blink runtime feature `WebMCPTesting` also implies `WebMCP`. Record the exact browser version and whether testing features were enabled. [Chrome setup](https://developer.chrome.com/docs/ai/webmcp#local_webmcp), [Chromium feature definitions](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/runtime_enabled_features.json5)
2. Navigate to the storefront and allow its initial scripts to settle. Attach a CDP session to that page target and register listeners for `WebMCP.toolsAdded` and `WebMCP.toolsRemoved` before sending `WebMCP.enable`.
3. `WebMCP.enable` emits existing registrations through `toolsAdded`. Maintain an inventory keyed by frame ID and tool name. For JavaScript tools, preserve the registration `stackTrace` as source evidence; declarative registrations can include a `backendNodeId`. These are experimental protocol fields and require browser-version checks. [CDP WebMCP domain](https://chromedevtools.github.io/devtools-protocol/tot/WebMCP/)
4. Stop after a bounded observation interval and close the isolated browser. Discovery requires no `WebMCP.invokeTool` or page-level `executeTool` call.

The alternative page-level call is `await document.modelContext.getTools()`. In the verified Chrome 151 build, `inputSchema` was a JSON string; newer interfaces may return an object. Normalize either representation before inspecting property names.

This cross-check establishes the registered inventory in that browser and page state on that date. It does not turn the deployed source scanner into a runtime verifier. Shipping browser verification requires a production browser deployment and network isolation for page-initiated requests; it is separate from expanding bounded source discovery.
