# AI visibility backlog

Updated 19 October 2026.

Todo list from two Profound runs on 2026-10-19, merged and deduplicated. Profound
setup: category "AI E-commerce Optimization", United States, ChatGPT, Google
Gemini and Google AI Overviews, 49 prompts over five topics. The prompts first ran
on 2026-10-19, so each run holds one partial day of data. Rankings are directional.

## Baseline (2026-10-19)

- ecentic: 0% visibility, 0% share of voice and 0 owned citations on every
  platform and topic. It was never named in an answer.
- Brands AI names most: Semrush 36.7% visibility, Profound 33.1%, Shopify 31.7%,
  Google 28.9%, then Ahrefs, Peec AI, Otterly, Amazon, WooCommerce, Yotpo, Triple
  Whale and Goodie. Profound leads on ChatGPT (34.7%); Semrush leads on AI
  Overviews (46.8%) and Gemini (49.0%).
- Citations: vendor and brand sites 86.9%, social 7.5%, earned media 5.1%, owned
  0%. YouTube is 27 of the 59 social citations, followed by G2 (11), Reddit (8)
  and LinkedIn (6).
- Technical checks pass: robots.txt allows every tracked crawler, and the
  sitemap, llms.txt, titles, canonicals and schema are fine. The gap is
  off-site presence, not crawler access.

## Todo

- [ ] **Get into the roundups AI already cites.** Pitch the editors with the free
  scan, the DUA Flavours result and an "agent-commerce optimization" one-liner.
  Targets: campaignsoftheworld.com, business.com ("Best AI Visibility
  Platforms"), fritz.ai, workflowaces.com, ecommerceguide.com,
  llm-visibility-tools.com, technologyadvice.com, Toolradar, Dialog's GEO tools
  list (askdialog.com), Surfient's Shopify GEO comparison, StoreSEO's AI shopping
  agent apps list, aiseoshift.com's listing-tool roundup, and Acom's roundup. The
  DUA Flavours quote still needs approved wording before anyone uses it.
- [ ] **YouTube.** Cut three short videos from the launch film: "How AI shopping
  agents pick products", "Why ChatGPT skips your Shopify product" and "Fix a
  listing in one click". Use the topic wording in titles and descriptions, and
  add chapters and a transcript.
- [ ] **G2, Toolradar and Reddit.** Create or complete the profiles, ask current
  merchants for reviews, and answer the cited r/indiehackers thread (and similar
  questions) with a specific, disclosed reply.
- [ ] **Comparison pages.** Add ecentic vs Semrush, vs Triple Whale and vs Goodie,
  each with a side-by-side table and a direct first sentence. Add a table to
  `/blog/ecentic-vs-profound`, which has none.
- [ ] **Topic hubs.** Build one hub per tracked topic: Agent-Commerce
  Optimization, AI-Mediated Product Discovery, AI Product Recommendation
  Diagnostics, AI Shopping Assistant Visibility, and Competitive Product Listing
  Analysis. Each hub gets a two-sentence answer, a definition, and links to the
  3–5 best posts. Link them from the blog index, the homepage and the posts they
  cover, and add them to llms.txt and the sitemap.
- [ ] **Original data.** Publish an anonymized benchmark from ecentic scans (win
  rate by agent and by product attribute) with a dated method and a downloadable
  table. Turn the DUA Flavours story into a case-study page with before and after
  numbers, linked from the homepage and pricing.
- [ ] **Freshness.** Show a visible "Updated" date and set `dateModified` on real
  edits; editorial posts currently carry `dateModified` equal to `datePublished`
  (for example ecentic-vs-profound: 2026-07-01). Refresh the sitemap `lastmod`
  for core pages. Update the homepage, /features and comparison pages monthly
  with current numbers. Profound puts the median time from publishing to first
  citation at under 7 days.
- [ ] **Consolidate overlapping "best X tools" and "alternatives" posts**, one
  deeper page per topic. Done so far: the AI-shopping-agents cluster
  (3fa95561) and /compare folded into /blog/best-ecommerce-ai-platforms
  (d6f3135b). Merging the how-to content into the pillar post is in progress.
  The other clusters still need an audit.
- [ ] **Schema.** Run the homepage, feature pages and blog templates through the
  Rich Results Test. The homepage already emits FAQPage, Organization and
  SoftwareApplication (checked 2026-10-19).
- [ ] **Re-run Profound** once it has at least 7 days of data. Compare ecentic's
  visibility and owned citations against the 0 / 0 baseline, and treat average
  position moves under 0.2 as noise.

## Market notes

- AndromedAI markets itself as an "Agentic Commerce Optimization" platform
  ("500+ catalogs optimized"; publishes to Shopify, WooCommerce, Merchant Center
  and PIMs). That's the term ecentic's positioning also fits.
- Roundups name Acom, paz.ai, getcatalog.ai, Goodie and refibuy as fixing tools,
  and Profound, PromptWatch and Otterly as monitors. Competitors frame the market
  as monitoring versus fixing, which matches the homepage line "audits tell you
  what's broken, ecentic writes and ships the fix".
