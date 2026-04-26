# écentic — Website, Codebase & Unicorn Vision Plan

> Companion to `ecentic-a16z-research-brief.md`. Where that doc was about the pitch, this one is about the substrate the pitch rests on: what the site and the app need to say and do before a16z clicks through, and what the codebase needs to become for this to end in a $1B+ outcome.

---

## 0. TL;DR — The One-Page Call

You have a lot more shipped than the marketing site is telling the world. The app is already a real product (multi-model simulation engine, one-click write-back to Shopify + WooCommerce, Layer 1 + Layer 2 agent traffic detection, UCP profile generation + public validator, 14-table production schema with durable job queue). The marketing site is still pitching a narrower story. The first job is to close that gap.

The second job is to put proof in the door within five seconds of an a16z partner landing on ecentic.ai. A partners / program strip above the fold — Shopify, Plug and Play, Red Bull Basement, plus a "pipeline" strip below it for Mastercard, Visa, Inditex, Carrefour (marked as "in conversation via Plug and Play") — does that.

The third job is to make the product itself a wedge into the two largest prizes in agentic commerce: the **merchant-side optimization layer** (where you are today, a ~$5–20B category) and the **agentic commerce protocol layer** (UCP / ACP / TAP infrastructure, where you become the Twilio of agent-to-merchant trust — the prize that actually justifies a unicorn outcome).

Everything below is the work it takes to get from here to there.

---

## 1. What You Actually Have (and What Nobody Outside Can See)

### 1.1 Shipped, production-grade — surface it everywhere

The codebase audit surfaced fourteen shipped capabilities that are not sufficiently represented on the marketing site:

**Multi-model simulation engine.** `server/app/intelligence/simulate.ts` + `compare.ts` run every product against every selected competitor across four model perspectives (GPT-4, Claude, Gemini, Perplexity) with *different evaluation frameworks per model* — GPT-4 weights rigor, Claude weights confidence signals, Gemini weights value optimization, Perplexity weights web-verified reputation. This is the defensible part of the product. The landing page gives it three bullets. It deserves a full section with a live demo widget.

**One-click write-back to storefronts.** `server/app/optimization.ts` generates an improved title + HTML description + JSON-LD structured data, publishes to Shopify via Admin API PUT or WooCommerce via REST PUT, records `winRateBefore / estimatedLift / winRateAfter`, and enforces a 14-day cooldown. This is the "closed-loop" story a16z loves — diagnose → fix → measure lift. It is currently invisible on the site.

**Agent traffic tracking — Layer 1 + Layer 2.** `server/app/tracking.ts` + `server/utils/tracking.ts` run both a browser beacon (via Shopify ScriptTag) and referrer-based detection, classifying 20+ agent types into five categories (user-action, agentic-browser, training-crawler, search-crawler, referral). Rate-limited 1,000/hour/store. 30-day time-series and summary views exist on the dashboard. This is the *measurement* layer that every agent-commerce story is missing and that enterprise buyers will pay for. The site mentions it obliquely; it should have its own page.

**UCP profile generation + public validator.** `server/app/intelligence/ucp.ts` generates a `/.well-known/ucp` JSON-LD profile from merchant inputs and the top 20 products. `ucp-check.ts` is a public validator at `/ucp-validator` that inspects any domain for UCP compliance, parses JSON-LD, validates against the spec version, and checks robots.txt for AI bot blocks (GPTBot, Google-Extended, ClaudeBot, AppleBot-Extended, CCBot). The validator alone is a growth loop — every domain checked is a lead. It deserves a dedicated landing page and a share card.

**Competitor intelligence search.** `server/app/intelligence/search.ts` uses AI to discover 5–8 realistic competitor products per query across brand or category. This is how competitive data enters the product. Marketing undersells it — it's the "zero-config competitor onboarding" feature every PLG ecommerce tool needs.

**Background scan infrastructure.** `server/app/intelligence/background-scan.ts` + `server/utils/durable.ts` use Upstash to run simulations asynchronously at scale. Your `/api/cron/scan` processes up to 20 users per run. This is enterprise-grade job scheduling and it is not mentioned anywhere externally.

**Structured data auto-generation.** `optimization.generateStructuredData()` emits Product JSON-LD with price, SKU, availability, and brand. This directly maps to the AI-bot-readability story that every agentic-commerce article from McKinsey / Google / Mastercard is telling right now. Turn it into its own upsell.

**Blog CMS.** `server/app/blog.ts` + `blogPost` table mean the blog is database-backed, not static MDX. Implication: you have a content engine, and the blog infra can host gated research drops (e.g., "Q2 2026 AI Agent Win Rate Report") without any additional engineering. Use it.

**Multi-integration surface.** Shopify (OAuth + Admin API + ScriptTag + webhook handler), WooCommerce (REST v3 basic auth), XML/JSON feeds (including Google Shopping namespace), CSV upload. Four *live* integrations, and the marketing site leads with Shopify alone. Parity messaging matters for BigCommerce conversations and for any a16z partner who prides themselves on spotting platform-agnostic tools.

**Public scan sharing.** `/share/[id]` route + `scan.getShareData()` means any user can share a scan result as a public link. This is latent growth. Wire it into the dashboard UI as a "Share report" button with OG tags, and every shared scan becomes a viral loop.

**Full product detail view.** `/dashboard/products/[id]` shows 5-tab simulation history, per-model breakdowns, competitor matchups, reasoning. Screenshots of this view belong on the features page and in the pitch deck, not buried behind auth.

**Enterprise schema already in place.** The `store` table supports unlimited stores per user (multi-brand / multi-region). `user.company` + `user.jobTitle` fields exist. The `agentTrafficDaily` aggregation table is built for high-scale reporting. The substrate for an enterprise SKU is there.

**Admin / cron bearer-token auth.** `/api/cron/scan` accepts `Authorization: Bearer CRON_SECRET`. This matters because it means you can expose a scan-as-a-service API to partners (e.g., Shopify Plus agencies, Plug and Play portfolio companies) with minimal extra engineering.

**Four-tier pricing hooks in code.** The product cap (100 per account, tracked as "slots remaining") and publishable-platform gating for optimization are already baked in. This is hidden monetization infrastructure that the pricing page should expose more aggressively.

### 1.2 Stubbed / gapped — decide: build or kill

The audit found seven gaps that need explicit decisions before the a16z conversation, because a half-built SKU slide is worse than a no-SKU slide.

- `/dashboard/reports` — route exists, page is empty. Either ship a reports surface (weekly digest PDF, monthly agent-traffic report, YoY win-rate delta) or delete the nav item. Recommendation: ship the weekly digest because it's a retention-critical feature for the Compete tier.
- Product Export button — UI exists, action not wired. Ship the CSV export — it's a three-hour task and removes a very common "can I get my data out" objection in enterprise demos.
- BigCommerce integration — "Coming soon" tile only. Decision: deprioritize (lower TAM than Shopify + WooCommerce in the near term) unless Plug and Play surfaces a BigCommerce-heavy buyer in the Inditex / Carrefour conversation.
- Amazon SP-API — "Coming soon" tile only. Decision: this one is strategic. Amazon is the single biggest agentic-commerce surface area; an Amazon listing optimizer is a different product with different unit economics. Call it a *v2 product* in the pitch, not a roadmap checkbox.
- Billing / Stripe — settings surface exists, integration does not. Ship Stripe + metered billing before the a16z call. Running a paid product (even with 50 customers) resolves the #1 question a16z will ask: "Are people paying?"
- Team invites — UI exists, role assignment logic does not. For the pitch, either build it (2-week task) or narrow the pitch to single-merchant — not both.
- Email notifications — notifications section exists, no Resend integration wired beyond auth. The weekly digest + alert email are the most obvious retention features. Cheap, high-leverage, build.

---

## 2. Partners / Program Strip — Spec

### 2.1 Why this is your single highest-ROI site change

Above-the-fold social proof is the most efficient signal you can send an a16z partner skimming your site between two other pitches. A well-designed logo row compresses four pieces of information — "this is a real company, not a weekend project; big brands take them seriously; they've already cleared a selection process; their ecosystem is a network, not just a product" — into a one-second glance.

You have three categories of logo to work with, and they should not all live in the same strip. Mixing them dilutes each.

### 2.2 Three strips, three stories

**Strip A — "Built on & selected by" (primary, above the fold, immediately after the hero CTA).** This is your credentialing strip. The logos are earned, not aspirational.

| Logo | Position | Caption on hover |
|---|---|---|
| Shopify | "Shopify App Store partner" | Live on the Shopify App Store. OAuth + write-back verified. |
| Plug and Play | "Plug and Play Tirana — Batch 2" | Accelerator with 30+ unicorn alumni (Honey, Dropbox, PayPal, Lending Club). |
| Red Bull Basement | "Red Bull Basement — Albania national winner" | Represented Albania at the Silicon Valley World Final, June 2026. |
| (optional) GOAL Silicon Valley | "GOAL x Plug and Play SV cohort" | Only include if you were in the top 10 of Batch 2. |

Styling note: the `@zenncore/web` system is monochrome / semantic-token; render logos as `grayscale + opacity-60` at rest and fade to full color on section hover. Fixed height (~28px), auto width. Horizontal wrap on mobile.

**Strip B — "Trusted by merchants running on" (secondary, after the Features section).** This is the platform-ecosystem strip. These are integrations, not endorsements.

| Logo | Caption |
|---|---|
| Shopify | Live |
| WooCommerce | Live |
| Google Shopping | Feed support |
| BigCommerce | Coming Q3 2026 |
| Amazon | Coming Q4 2026 |

**Strip C — "In conversation with" (tertiary, on an Enterprise page — NOT the homepage).** This is the Mastercard / Visa / Inditex / Carrefour pipeline. You don't want these on the homepage without a signed LOI, because it reads as LinkedIn-fluff to a16z. But on an Enterprise page you can frame them honestly: *"Introduced via Plug and Play. Pilot conversations underway."* a16z won't penalize honesty there; they'll penalize a homepage that implies deals exist when they don't.

### 2.3 Implementation

Create a new component at `apps/web/src/app/(main)/_components/partners-strip.tsx`:

```tsx
// apps/web/src/app/(main)/_components/partners-strip.tsx
import Image from "next/image";
import Link from "next/link";

type Partner = {
  name: string;
  href: string;
  logo: string; // public path, e.g. "/partners/shopify.svg"
  caption: string;
};

const primary: Partner[] = [
  {
    name: "Shopify App Store",
    href: "https://apps.shopify.com/",
    logo: "/partners/shopify.svg",
    caption: "Shopify App Store partner",
  },
  {
    name: "Plug and Play Tirana",
    href: "https://www.plugandplaytechcenter.com/locations/tirana/",
    logo: "/partners/plug-and-play.svg",
    caption: "Plug and Play — Tirana",
  },
  {
    name: "Red Bull Basement",
    href: "https://basement.redbull.com/",
    logo: "/partners/red-bull-basement.svg",
    caption: "Red Bull Basement — Albania national winner",
  },
];

export const PartnersStrip = () => (
  <section
    aria-label="Backed by and selected by"
    className="mx-auto w-full border-accent-foreground border-t border-b py-8"
  >
    <p className="text-center text-muted-foreground text-xs tracking-widest uppercase">
      Backed by and selected by
    </p>
    <ul className="mt-6 flex flex-wrap items-center justify-center gap-10 md:gap-14">
      {primary.map((partner) => (
        <li key={partner.name}>
          <Link
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block opacity-60 transition-opacity hover:opacity-100"
            aria-label={partner.caption}
          >
            <Image
              src={partner.logo}
              alt={partner.name}
              width={140}
              height={32}
              className="h-7 w-auto grayscale transition-[filter] group-hover:grayscale-0"
            />
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
```

Wire it into `apps/web/src/app/(main)/page.tsx` immediately after `<Hero />` and before `<BlindSpot />`:

```tsx
<Navbar />
<Hero />
<PartnersStrip />        {/* new */}
<BlindSpot />
<Steps />
...
```

Add the logos as SVGs under `apps/web/public/partners/`. Use the official brand kits — Shopify has one at shopify.com/brand, Plug and Play has one in its partner portal, Red Bull Basement logo is on redbull.com/basement. Store them under a `partners/` subfolder so they're easy to audit.

For the secondary integration strip, add `PlatformsStrip` alongside and render it inside the Steps or Features block.

For the tertiary pipeline strip, create `/enterprise/page.tsx` (see §3.2) and render it there only.

### 2.4 Copy variants — pick one

- Conservative: **"Backed by and selected by"** — safe, accurate, works today.
- Category-claiming: **"Building the agent-commerce stack with"** — works if you want to signal that you're a category co-creator, not a vendor.
- Spiky: **"The platforms that chose us first"** — best if combined with a narrative in the Hero ("We didn't win Red Bull Basement Albania because we were pretty — we won because we were the only ones building for the agent internet").

The first is Stripe's voice. The third is Linear's voice. Pick the one that matches the rest of the site, and rewrite the whole homepage in that voice (most sites fail because each section speaks in a different tone).

---

## 3. Website Changes — IA, Pages, Conversion, SEO

### 3.1 Current landing sections

From `apps/web/src/app/(main)/page.tsx`:

`Navbar → Hero → BlindSpot → Steps → Features → Comparison → Testimonials → Pricing → DiscoveryPaths → Footer`

This is a decent funnel. It's missing social proof, it's missing a dedicated "what runs underneath" slot for the agent traffic + UCP story, and it's missing a clear enterprise CTA. Below is the recommended new IA.

### 3.2 Recommended IA

**Homepage (in order):**

1. Navbar with three items: Platform, Pricing, Enterprise (new). Docs / Blog as secondary.
2. Hero — unchanged headline "Win Every AI Shopping Agent's Cart". Keep it.
3. **PartnersStrip** (new — §2)
4. BlindSpot — unchanged. This is your "why now" section.
5. **AgentTrafficLive** (new) — a short, animated section showing real-time agent visits by model family (ChatGPT, Claude, Gemini, Perplexity). Pull from a demo account's `agentTrafficDaily` data. This puts the measurement story on the homepage.
6. Steps — unchanged.
7. Features — rewrite to highlight four capabilities with depth: *Simulate*, *Diagnose* (Agent Replay), *Optimize & Publish* (one-click write-back), *Measure* (agent traffic). Current Features section undersells Optimize + Measure.
8. **UCPCallout** (new) — tightly scoped card linking to `/ucp-validator` and `/ucp`. "Check your store's UCP profile in 10 seconds →". This drives the validator-as-growth-loop.
9. Comparison — unchanged. Keep the competitor table.
10. Testimonials — unchanged but add at least one named enterprise-lite logo here (e.g., a Shopify Plus merchant from the P&P portfolio) before the a16z meeting.
11. Pricing — minor rewrite (§3.3).
12. **DiscoveryPaths** — unchanged but add an "Enterprise" card pointing to `/enterprise`.
13. Footer — add a "Programs" column listing Plug and Play Tirana, Red Bull Basement, Shopify App Store, with links.

**New pages to ship:**

- `/enterprise` — pipeline logos (Mastercard, Visa, Inditex, Carrefour marked "in conversation via Plug and Play"), agent-traffic-for-scale pitch, compliance section (SOC 2 Type II status, GDPR, data residency), "Talk to sales" CTA routed to a Cal.com or HubSpot form.
- `/ucp-validator` — already exists in code per the audit. Make it a first-class marketing destination. Add share cards ("3 of your competitors are blocking GPTBot — here's yours ✓"). Every submitted domain is a lead.
- `/agent-traffic` — dedicated page for the measurement story. Stats, methodology, a free tier that's "measure only" with no simulation. Converts the "I just want to see who's visiting me" curious-browser into a signup.
- `/platforms/shopify`, `/platforms/woocommerce` — already exist. Add `/platforms/google-shopping-feed` and a stub `/platforms/amazon` (with email capture) to plant SEO flags.
- `/for/agencies` — this is the quiet TAM expander. Shopify Plus agencies each manage 20–200 merchants; if you can get into their toolkit, one agency deal is 20+ merchants.
- `/compare/{competitor}` — spin up five pages: `/compare/profound`, `/compare/bluefish`, `/compare/daydream`, `/compare/firmly`, `/compare/skyfire`. Use the existing `/compare/best-ai-ecommerce-tools` page as the hub and spoke out. This is the highest-ROI SEO play for a category-leadership narrative.
- `/blog/reports` — subsection of the blog for gated research ("Q2 2026 AI Shopping Agent Win Rate Index — 10K products, 4 models, 90 days"). Downloadable PDF gated by email. Every download is a qualified lead and every journalist citation is free distribution.

### 3.3 Pricing page — sharpen the tiers

The code already enforces a 100-product cap and publishable-platform gating. The current marketing pricing (Scan free / Compete $149 / Dominate $449 / Enterprise) is reasonable but can be sharper. Recommendations:

- **Scan (Free)** — keep. Its job is to qualify leads and fill the demo dashboard.
- **Compete ($149/mo)** — add "weekly optimization digest" and "share-scan links" (both already partially in code).
- **Dominate ($449/mo)** — add "unlimited scan frequency", "agent-traffic alerts", "team seats (3)".
- **Enterprise (custom)** — explicit promises that match pipeline-logo expectations: "SSO, SOC 2 Type II, custom SLAs, multi-brand rollups, dedicated CSM, API access, UCP signing service". Don't promise what the code can't deliver in ≤90 days post-signing.

### 3.4 Hero copy — minor sharpening

Current: "Win Every AI Shopping Agent's Cart" is fine, but the subheadline can do more work. Current subheadline (inferred from search snippets) is passive. Replace with something like:

> **Win every AI shopping agent's cart.**
> Simulate how GPT-4, Claude, Gemini, and Perplexity compare your products against competitors. Diagnose why you lose. Publish the fix in one click. Measure the agent traffic that results.

Four verbs — Simulate, Diagnose, Publish, Measure — map 1:1 to the four features and become the navigational spine of the whole site.

### 3.5 SEO — concrete moves

The codebase already has `lib/seo.ts`, `sitemap.ts`, `robots.ts`, structured data inlined on pages, and full schema.org Organization + SoftwareApplication + AggregateRating + Review markup. This is well-executed. The SEO moves that are missing:

- Ship a `llms.txt` at the site root ([proposal](https://llmstxt.org/)) listing the canonical URLs for every page. The AI agents you're helping merchants win for — they're now reading these files. It's 90 minutes of work and it's a weirdly strong market signal.
- Enable the `/.well-known/ucp` endpoint on ecentic.ai itself (not just as a feature for customers). Eat your own dog food. When an a16z partner pastes ecentic.ai into your own validator, they should see a ✓.
- Write three flagship long-form pieces before the a16z application: (a) "How GPT-4, Claude, Gemini, and Perplexity actually evaluate product listings — a 10,000-product study", (b) "The agent traffic iceberg: what your Shopify analytics is missing", (c) "Why we built écentic for the UCP / ACP / TAP future". These are the three pieces a16z partners will Google when they see your name.
- Add `og:image` per page with a Vercel-OG-rendered summary card so every shared link looks like a product, not a default.

### 3.6 Conversion surface

Two cheap wins:

- Wire `/ucp-validator` submissions into a lead capture — right now it's a tool; it should be a funnel entry. After validation, offer: "Claim your free scan → see how agents compare you to 5 competitors".
- Add a persistent dashboard banner for free-tier users showing a teaser: "Your top product would win 12% more often with these 3 fixes — upgrade to Compete". This is the natural place to convert Scan → Compete.

---

## 4. Codebase Changes — What to Build, Kill, and Harden

### 4.1 Ship before the a16z application (6–8 weeks)

These are the codebase changes that directly protect the pitch. Each has a defensible a16z-answer attached.

**Stripe + metered billing.** `server/app/billing.ts` — Stripe Checkout for the three paid tiers, usage-based metering for API calls and simulation counts on Enterprise. Answer to "are people paying": yes, here's the ARR run-rate.

**Weekly digest email.** `server/app/digest.ts` + Resend integration — a weekly email summarizing win rate change, top wins, biggest losses, and one recommended action. Answer to "what's retention look like": here's the hook that gets weekly opens.

**Reports surface (`/dashboard/reports`).** Deliver a monthly PDF of agent-traffic + win-rate over time. Answer to "what's the enterprise product": this, plus SSO.

**Team seats.** Complete the team-invite logic. Answer to "who else uses this inside the company": four seats per Compete account, unlimited per Enterprise.

**Public API (read-only to start).** Wrap the existing repository layer in a small REST or tRPC-over-HTTP surface at `/api/v1/*` with API-key auth. Answer to "what's the platform play": agencies and OEMs can query scan results programmatically, which unlocks the agency SKU and the Plug and Play partner distribution.

**UCP signing service.** `server/app/intelligence/ucp-sign.ts` — you already emit the UCP JSON; add HTTP Message Signatures (RFC 9421 / Web Bot Auth style) so merchants can cryptographically sign their UCP profile with a key écentic manages. This is the wedge into the agent-authentication layer that matters for the Mastercard + Visa conversations. It is 2–3 weeks of crypto-careful work and it gives you a story no competitor has.

**Amazon SP-API spike.** Not a full integration, but enough of a spike to show the design. Answer to "how do you expand beyond Shopify": here's the architecture and here's our estimated ship date.

**Remove the `/dashboard/reports` nav item if Reports doesn't ship in time.** Dead nav is worse than no nav.

### 4.2 Harden the moat (3–6 months)

These are the moves that take the product from "smart optimizer" to "infrastructure the ecosystem is built on". They are what actually justify a unicorn outcome.

**Model-specific evaluation frameworks as open benchmarks.** Your `compare.ts` has four distinct scoring rubrics per model. Publish them as an open methodology (`/methodology/scoring`), invite other researchers to extend, and run a quarterly public leaderboard of agent-selection behavior. This is how Common Crawl became infrastructure — Common Crawl is just a crawl, the moat is the network of researchers that standardize on it.

**Write-back beyond Shopify / WooCommerce.** BigCommerce and Amazon are table stakes but the real unlock is *merchant-owned* surfaces — Shopify headless storefronts, custom Next.js commerce apps, Salesforce Commerce Cloud. Ship a `@ecentic/js` SDK that any storefront can drop in to accept écentic-generated metadata updates without needing a full platform integration. This turns the write-back moat from "platforms we're built on" to "any commerce surface".

**UCP as a service.** Run a hosted `/.well-known/ucp` for merchants who don't want to host it themselves, with signing, rotation, and an audit log. Charge per verification. This is the Auth0 / Segment pattern: the value is the signing surface, not the data.

**Agent simulation as a commerce primitive.** Spin off `intelligence/simulate.ts` as a standalone "Agent Simulation API" that any developer can call — not just to evaluate product listings, but to simulate agent decisions on any commerce object (cart bundling, upsell ordering, shipping option selection, post-purchase agent). This is the "Retool → dev-tools company" move. It also gives you a second product with different unit economics to show on the pitch slide.

**Multi-agent orchestration.** Today simulations run in parallel against four model perspectives. The next architectural step is *sequential* — a "buyer agent" that negotiates, a "comparison agent" that evaluates, a "decision agent" that commits. Each stage gives you a new measurement surface. This is the move that keeps you ahead of Profound (which is stuck on discovery) and Bluefish (which is stuck on monitoring).

**Enterprise infra tier.** VPC deployment, SOC 2 Type II audit (start now — 6-month minimum), HIPAA-adjacent data handling for merchants with regulated categories, SSO (Okta, Google Workspace, Azure AD). The Inditex / Carrefour conversation will die without these.

**Commerce data warehouse connector.** Export scan + agent-traffic data to Snowflake, BigQuery, Databricks. Merchants over $100M already have data teams. They will not copy-paste from a dashboard. Without this, you're a tool; with this, you're a data source.

### 4.3 Kill or defer

Being sharp about what you're *not* building is as strategic as what you're building. The following should be explicitly out of scope for 2026:

- **Order / customer data.** Stay out of the order graph. The Shopify listing is scoped `read_products, write_products, read_script_tags, write_script_tags` — keep it that way. The moment you ingest PII you become a privacy-review line item in every enterprise deal.
- **Your own storefront or PDP editor.** Don't build a "listing builder". The value is *optimizing the listing that already exists*, not hosting it. This separates you from Klevu / Algolia / Shogun.
- **Paid ads optimization.** Tempting (the data is adjacent) but a different buyer and a different sales motion. Don't fragment the pitch.
- **BigCommerce before the a16z application.** Unless a named P&P pipeline account asks, defer.

### 4.4 Non-functional hardening

- Rate-limit the `/api/tracking/agent-visit` endpoint per-IP in addition to per-store (currently it's 1,000/hour/store; add 100/minute/IP with a Redis bucket) to survive a spike from a malicious agent.
- Add a `scan.retries` count to the simulation job so transient LLM failures don't stall the pipeline.
- Sentry has a DSN; add PostHog event tracking on the key funnel events (install Shopify → first scan → first optimization → first publish) so the pitch deck's funnel numbers are real.
- Biome config is already in place; run a `bun run lint` + `bun run typecheck` pre-commit hook across the monorepo before investor due diligence.

---

## 5. The Unicorn Vision

### 5.1 What a unicorn outcome actually requires

$1B outcomes in commerce infrastructure come from one of three shapes:

- **Platform** — you become the layer every merchant must adopt because their ecosystem adopted you (Shopify, Stripe, Square).
- **Protocol** — you define or co-define the spec that the ecosystem converges on (Plaid, Twilio in the early days, Auth0).
- **Marketplace / aggregator** — you aggregate supply or demand so efficiently that the other side has no choice but to transact through you (Faire, Instacart).

écentic's path is *protocol*, not platform or marketplace. Don't pretend otherwise. The market is too big and too fast for écentic to become the Shopify of agentic commerce. It can absolutely become the *Plaid of agentic commerce* — the trust + measurement + optimization layer sitting between merchants and every AI shopping agent.

### 5.2 The three-chapter story

**Chapter 1 (now → end of 2026): "Win every agent's cart" — the optimization wedge.** You are today. Merchant-side SaaS. Shopify-first. Scan → diagnose → optimize → measure. ARR target: ~$2–5M by end of 2026, mostly Compete-tier SMB and mid-market, with 2–3 Enterprise design-partners sourced from Plug and Play. This is the chapter a16z funds.

**Chapter 2 (2027): "The measurement layer every agentic-commerce story is missing" — agent traffic as a standalone product.** Spin the agent-traffic tracking + UCP validator into a freemium product that doesn't require connecting a store. Every ecommerce operator wants to know who's crawling them; nobody is giving them that for free. Grow to hundreds of thousands of domains indexed, convert a fraction to paid écentic customers. ARR target: $20–40M. This is the chapter that compounds.

**Chapter 3 (2028 onward): "The signing + trust infrastructure for agent-to-merchant commerce" — UCP-as-a-service, Agent Simulation API, enterprise protocol tooling.** By this point the UCP / ACP / TAP protocols are live, Mastercard / Visa / Amazon / OpenAI are all shipping agent-commerce rails, and every merchant touching those rails needs a signing + validation + benchmark layer. You are that layer. You are also the place where *the agents themselves* come to benchmark — "does our model pick product A over product B the way a real buyer would?" becomes a question you answer for OpenAI, Anthropic, Google, Perplexity. ARR target: $100M+, with a platform-revenue mix (agent-side + merchant-side + data-side).

### 5.3 The metrics a16z will score you on

a16z's public writing (Alex Rampell's "Apps Fund" thesis, Angela Strange's fintech infra posts, the "KYA" newsletter) converges on five metrics for a category like this:

- **Magic moment → activation rate.** For écentic this is: installed Shopify app → ran first scan → saw per-model breakdown. Instrument it, hit 60%+.
- **Weekly active within paid cohort.** For a tool this should be 70%+. Weekly digest + agent-traffic alerts are the path.
- **Net revenue retention (NRR).** Enterprise-adjacent SaaS needs 115%+ NRR. This is where the Compete → Dominate → Enterprise natural expansion lives.
- **Net new logos per month.** At seed, 10–20 is the floor. At Series A, 40+.
- **Quality of revenue.** Named logos > headcount. One Shopify Plus merchant in the P&P ecosystem paying $5K/mo beats 50 unnamed $99/mo accounts for the pitch.

### 5.4 Team shape

Once the Series A lands, the team shape that makes this vision plausible:

- Founder / CEO — strategy, fundraising, top 5 enterprise deals.
- Founding engineer(s) — keep shipping the core simulation + write-back engine.
- Head of GTM — owns Shopify App Store + P&P partner channel + the /compare/* SEO plays.
- Head of Research — owns the public benchmark + leaderboard + quarterly report. This is not optional if you want to become a protocol-layer company.
- Head of Enterprise — comes in after the first two Enterprise logos close. Not before.
- DevRel (quarter-time of founding eng) — ship `@ecentic/js`, the Agent Simulation API docs, and the Shopify Plus agency program.

### 5.5 Risks that will come up in the a16z diligence call, with pre-baked answers

- *"What happens if Shopify ships native agent-optimization?"* → They will ship something. We'll be the cross-platform, measurement-backed layer that even Shopify merchants who want third-party benchmarks use. Moat is the multi-model methodology + the data flywheel, not the Shopify integration.
- *"What happens if OpenAI / Google ship their own product-selection APIs?"* → That's the Chapter 3 unlock, not the threat. If they ship it, merchants still need a neutral party to benchmark their performance *across* those APIs. That's us.
- *"Why do merchants pay for this today when nobody measures AI-agent-driven revenue?"* → Because (a) they see it in agent-traffic logs, (b) losing to a competitor on Claude or Perplexity is visible in our dashboard in a way it isn't in Google Analytics, and (c) the optimization is cheap to try and easy to measure with before/after win rates.
- *"Isn't this a feature, not a company?"* → Every SEO tool in 2010 was "a feature, not a company" and the category produced Semrush ($2B), Ahrefs ($1B+), Moz ($100M+). Agentic commerce is going to be a bigger market than SEO was, because 100% of searches will touch an agent, not just some.

---

## 6. Sequence (the 90-day plan)

**Weeks 1–2: credibilize the site.** PartnersStrip, pricing sharpening, hero rewrite, three flagship blog posts queued. Ship `/enterprise`. Eat own dog food on `/.well-known/ucp` and `llms.txt`.

**Weeks 3–6: close the product gaps.** Stripe + metered billing. Weekly digest email. Team seats. Product Export. Reports surface (monthly PDF).

**Weeks 7–10: moat moves.** UCP signing service (MVP). Public API (read-only). Five `/compare/*` pages. First gated research report ("Q2 2026 AI Shopping Agent Win Rate Index").

**Weeks 11–12: pitch.** Submit to a16z with a brief that points to live product, live payments, live pipeline, and a live public benchmark. Target Alex Rampell primary, Angela Strange or David Haber secondary, Connie Chan as consumer-AI wild card. Include the research report as the appendix.

---

## 7. Appendix — Files to Touch

New:

- `apps/web/src/app/(main)/_components/partners-strip.tsx`
- `apps/web/src/app/(main)/_components/agent-traffic-live.tsx`
- `apps/web/src/app/(main)/_components/ucp-callout.tsx`
- `apps/web/src/app/(main)/enterprise/page.tsx`
- `apps/web/src/app/(main)/agent-traffic/page.tsx`
- `apps/web/src/app/(main)/for/agencies/page.tsx`
- `apps/web/src/app/(main)/compare/[competitor]/page.tsx` (dynamic route)
- `apps/web/public/partners/shopify.svg`, `plug-and-play.svg`, `red-bull-basement.svg`
- `apps/web/public/llms.txt`
- `apps/web/src/app/.well-known/ucp/route.ts` (ecentic.ai's own UCP profile)
- `apps/web/src/server/app/billing.ts` (Stripe)
- `apps/web/src/server/app/digest.ts` (weekly email)
- `apps/web/src/server/app/intelligence/ucp-sign.ts` (HTTP Message Signatures)

Modify:

- `apps/web/src/app/(main)/page.tsx` — insert PartnersStrip, AgentTrafficLive, UCPCallout
- `apps/web/src/app/(main)/_components/hero.tsx` — four-verb subheadline
- `apps/web/src/app/(main)/_components/pricing.tsx` — tier sharpening
- `apps/web/src/app/(main)/dashboard/_components/trial-card.tsx` — convert to Stripe upgrade CTA
- `apps/web/src/server/app/optimization.ts` — hook into Stripe metering
- `apps/web/src/lib/seo.ts` — extend for new routes
- `apps/web/src/app/sitemap.ts`, `apps/web/src/app/robots.ts` — add new routes + llms.txt reference

Delete / defer:

- `/dashboard/reports` nav item until Reports surface ships
- BigCommerce "Coming soon" tile (or ship it — don't leave dead promises)

---

## 8. Sources

- Codebase inventory: `/Users/xhurianshaba/Developer/zennit/ecentic` (explored 21 Apr 2026)
- [ecentic.ai — Win Every AI Shopping Agent's Cart](https://ecentic.ai/)
- [ecentic.ai — Features](https://ecentic.ai/features)
- [ecentic.ai — Best AI Tools for Ecommerce 2026](https://ecentic.ai/compare/best-ai-ecommerce-tools)
- [Red Bull Basement 2026 — Albania application portal](https://albaniatech.org/red-bull-basement-takes-you-to-silicon-valley/)
- [Red Bull Basement World Final](https://www.redbull.com/int-en/events/red-bull-basement-world-final)
- [Plug and Play Tech Center](https://www.plugandplaytechcenter.com/)
- Companion research brief: `/Users/xhurianshaba/Documents/Claude/Projects/écentic/ecentic-a16z-research-brief.md`
