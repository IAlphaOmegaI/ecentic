# Landing Page Redesign — Implementation Plan

**Goal:** Make the homepage simpler, faster to understand, and more "American" (benefit-first, punchy, one clear action). Feedback said the current page is *too technical and hard to understand*. Inspiration: [tolt.com](https://tolt.com) — one clear headline, one obvious CTA, real proof, no jargon.

**The headline change:** a clean **banner hero** with (1) a plain-English benefit headline, (2) a real customer result — *DUA Flavours grew AI-agent visits +15% and sales +12% in 30 days* (confirmed, with written permission to publish), and (3) an **"Install now"** action that installs on **Shopify** or **WooCommerce**.

> This is a handoff doc for an implementing agent. Follow it top-to-bottom. Do not improvise architecture. When something says "verbatim," copy it exactly. When you hit a `⚠️ CONFIRM`, use the given default and leave a `// TODO(confirm):` comment.

---

## 0. Rules you MUST obey (read first)

These are the project's coding conventions (`zenn-style` + `CLAUDE.md`). A dumber model gets these wrong most often, so they're listed up front:

1. **`const` only, never `let`.** Derive with `map`/`filter`/`reduce`.
2. **Single-word, non-abbreviated names.** `platform` not `p`, `index` not `idx`.
3. **Semantic Tailwind tokens only.** Use `text-primary`, `bg-background`, `text-foreground-dimmed`, `border-accent-foreground`. **NEVER** `text-gray-500`, `bg-white`, `#fff`, raw hex, or `text-blue-600`.
4. **Reuse the design system.** Buttons come from `@zenncore/web/components/button`. Icons from `@zenncore/icons`. Never write a raw `<button>` or inline SVG icon.
5. **Buttons that navigate use the `render` prop**, not an `onClick`:
   ```tsx
   <Button color="primary" render={<Link href="/sign-up" />}>Install now</Button>
   ```
6. **Static data lives outside the component** as a `const [...] as const` array (see §22 of zenn-style).
7. **Components are named-export arrow functions with implicit return** when the body is only a return. Next.js `page.tsx` stays a default export.
8. **Server components by default.** Only add `"use client"` if you use a hook, state, or an event handler. The new hero, install CTA, and proof band are all **server components** (plain links + images — no `"use client"`).
9. Headings use `className="font-body ..."`. (`font-header` is a legacy undefined token — do not use it.)
10. Keep copy **short and plain**. No "infrastructure," "structured data," "UCP," "GEO," "simulate," "diagnose" in the primary above-the-fold copy. Save any technical words for deeper sections.

---

## 1. Before → After (section map)

The homepage lives in `apps/web/src/app/(main)/page.tsx` and renders components from `apps/web/src/app/(main)/_components/`.

| Order | CURRENT section | ACTION | Why |
|---|---|---|---|
| 1 | `Navbar` | **Edit** copy/links | Simplify nav, CTA → "Install now" |
| 2 | `Hero` ("40% of shoppers…") | **Rewrite** | New banner + result stat + Install CTA |
| 3 | `PartnershipBanner` (EU × ecentic) | **Remove from home** | Distraction from primary CTA — keep it on `/pricing` |
| 4 | `PartnersStrip` | **Keep** (tiny copy tweak) | Trust logos = good social proof |
| 5 | `DiscoveryShift` (350-line animation) | **Remove from home** | Long + abstract; a big "too technical" offender |
| 6 | `BlindSpot` (JSON, "FATAL: Agent Rejected") | **Remove from home** | The single most technical/scary section |
| 7 | `WhyNow` (Visa/Mastercard milestone cards) | **Remove from home** | Informative but heavy; not needed to convert |
| 8 | `Steps` | **Keep + simplify copy** | "How it works" in 3 plain steps |
| 9 | `Features` | **Keep + simplify copy** | Benefit-led, not feature-led |
| 10 | `UCPCallout` | **Remove from home** | Jargon; keep the `/ucp-validator` link in footer |
| 11 | `Comparison` (table) | **Keep** (optional) | Good objection-handler; leave near the bottom |
| 12 | `Testimonials` | **Keep** | People trust people |
| 13 | `Booking` (Cal.com) | **Keep** | Secondary path for "not ready to install" |
| 14 | `Footer` | **Edit** CTA | CTA band → "Install now" |
| — | **NEW** `Proof` (stat band) | **Create** | Turns the removed technical sections into one plain results band |
| — | **NEW** `InstallCta` (platform buttons) | **Create** | Reused in hero + footer |

**Net effect:** the page goes from ~13 dense sections (two of them 200–350 lines of animation/JSON) to a tight, skimmable funnel: **Hero → Logos → Proof → How it works → Features → (Comparison) → Testimonials → Book a demo → Footer**.

> **Do NOT delete** the removed component files — they're reused on other routes or may be restored. Just stop rendering them from `page.tsx` (comment them out, as the file already does for `Pricing`/`DiscoveryPaths`).

---

## 2. Copy bank (use verbatim)

All final copy in one place. `⚠️ CONFIRM` = ask the owner / leave a TODO.

### Hero
- **Eyebrow:** `Built for Shopify & WooCommerce`
- **H1:** `Be the product AI recommends.`
- **Subhead:** `Shoppers now ask ChatGPT, Gemini, and Perplexity what to buy. ecentic makes sure the answer is your product — and sends those buyers straight to your store.`
- **Result line (the star):** `DUA Flavours grew AI-agent visits +15% and sales +12% — in 30 days.` (Confirmed by the customer, with written permission to publish. Brand name is `DUA Flavours` — two words, `DUA` uppercase.)
- **CTA buttons:** `Install on Shopify` and `Install on WooCommerce`
- **Microcopy under CTA:** `2-minute setup · No credit card · See your free score first`

### Proof band (stat tiles) — all sources are real, keep attributions
- Tile 1: value `+15%` — label `AI-agent visits for DUA Flavours in 30 days` — source `ecentic customer`
- Tile 2: value `+12%` — label `sales for DUA Flavours in 30 days` — source `ecentic customer`
- Tile 3: value `31%` — label `higher conversion from AI-referred shoppers` — source `Salesforce, 2025`
- Tile 4: value `13%` — label `sales growth for stores built for AI agents (vs 2% without)` — source `Adobe / Bain`
- **Band heading (optional, above tiles):** `AI is already sending shoppers. The only question is whether they land on you.`

### How it works (Steps) — replaces existing Steps copy
- **Section H2:** `Live in three steps.`
- **Section subhead:** `Connect your store and ecentic does the rest.`
- Step 1 — title `Connect your store` — body `Install on Shopify or WooCommerce in about two minutes. No developer needed.`
- Step 2 — title `See where you lose` — body `ecentic asks the top AI shopping agents to shop your catalog and shows you exactly which products they skip — and why.`
- Step 3 — title `Get picked` — body `One click rewrites your listings so agents recommend you first. Then watch your AI visits and sales climb.`

### Features — replaces existing Features copy
- **Section H2:** `Everything you need to win the AI shopper.`
- Card 1 — title `Your AI score` — body `See how often ChatGPT, Claude, Gemini, and Perplexity pick your products.`
- Card 2 — title `Beat your competitors` — body `Find out who agents recommend instead of you, and what they have that you don't.`
- Card 3 — title `One-click fixes` — body `ecentic rewrites your titles, descriptions, and product data so agents choose you.`
- Card 4 — title `Track the payoff` — body `Watch AI-agent visits and revenue grow week over week.`

### Navbar
- Links (keep it to 3): `How it works` → `/#how`, `Pricing` → `/pricing`, `Blog` → `/blog`
- CTA button: `Install now` → `/sign-up`

### Footer CTA band
- **Eyebrow:** `Get picked by AI`
- **H2:** `Ready to be the product agents recommend?`
- **Body:** `Install free on Shopify or WooCommerce and see your AI score in minutes.`
- Replace the single "Get your free Win Rate Report" button with the `InstallCta` component (both platform buttons).

---

## 3. Install flow — how the buttons actually work

The core new interaction is **"Install on Shopify / Install on WooCommerce."** Here's the wiring, from simplest to fancier. **Implement the DEFAULT.**

**DEFAULT (do this):**
- **Shopify → `https://apps.shopify.com/ecentic-ai`** — the live App Store listing. This is the real, native one-click install for Shopify merchants, so send them straight there.
- **WooCommerce → `/sign-up?platform=woocommerce`** — into the signup funnel: `/sign-up` → email/verify → onboarding → `connect` step (which already has a WooCommerce API-key sub-page at `/onboarding/connect/woocommerce`). The `?platform=` param is a harmless hint for now.

Do **not** try to deep-link `/api/integrations/shopify/install` from the homepage — that route requires a known `?shop=<store>.myshopify.com` domain and an authenticated user, so it can't be a cold-visitor entry point. The App Store listing is the correct cold-visitor Shopify entry point.

**Optional stretch (only if time):** make onboarding preselect the platform. In `apps/web/src/app/(auth)/onboarding/connect/_components/platform-grid.tsx`, read `?platform=` (via `nuqs` or `searchParams`) and auto-highlight/redirect to the matching sub-page. Skip this if unsure — the default already sends users into the right funnel.

---

## 4. Step-by-step tasks

Do these in order. After each file, run nothing yet — verify at the end (§6).

### Task 1 — Create `InstallCta` (reused by hero + footer)

**New file:** `apps/web/src/app/(main)/_components/install-cta.tsx`

```tsx
import Link from "next/link";
import Image from "next/image";
import { Button } from "@zenncore/web/components/button";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/ecentic-ai"; // live Shopify App Store listing

const platforms = [
  { name: "Shopify", logo: shopify, href: SHOPIFY_APP_STORE_URL },
  { name: "WooCommerce", logo: woocommerce, href: "/sign-up?platform=woocommerce" },
] as const;

export const InstallCta = ({ className }: { className?: string }) => (
  <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
    {platforms.map((platform) => (
      <Button
        key={platform.name}
        color="primary"
        size="lg"
        render={<Link href={platform.href} />}
      >
        <Image src={platform.logo} alt="" className="size-5" />
        Install on {platform.name}
      </Button>
    ))}
  </div>
);
```

Notes for the implementer:
- Import `cn` from `@zenncore/utils` (that's where the current components import it — copy the exact import line from `apps/web/src/app/(main)/_components/hero.tsx`).
- `@/public/images/shopify.svg` and `@/public/images/woocommerce.svg` already exist — do not add new assets.
- `alt=""` on the logo is correct — the button text already names the platform, so the logo is decorative.
- If `Button` has no `size="lg"` variant, drop the `size` prop (only `size="icon"` is guaranteed — check `packages/web/src/components/button.tsx` and size via `className` padding if needed).
- This is a **server component** — no `"use client"`.

### Task 2 — Rewrite the hero

**Replace file:** `apps/web/src/app/(main)/_components/hero.tsx`

Requirements:
- Keep it inside the page container (no full-bleed breakout — simpler and less error-prone than the current `-left-[calc(50vw-50%)] w-screen` trick).
- Centered banner: eyebrow → H1 → subhead → result line → `InstallCta` → microcopy → product image.
- Use the copy from §2 verbatim.
- The **result line** must visually pop: render it as a pill/badge using `bg-primary/10 text-primary` with a trending-up icon from `@zenncore/icons` (e.g. `TrendUpIcon` / `ArrowUpIcon` — pick one that exists; grep `packages` or `@zenncore/icons` exports).
- Product image: reuse an existing screenshot if one exists in `apps/web/public/screenshots/` (list that folder first). If none is suitable, reuse `@/public/images/background.webp` inside a bordered rounded card (`rounded-2xl border border-accent-foreground overflow-hidden`). Add `priority` to the image (above the fold).

Skeleton (fill classes to match the site's spacing; keep tokens semantic):

```tsx
import Image from "next/image";
import { InstallCta } from "./install-cta";
// import a trend/arrow-up icon that exists in @zenncore/icons
// import a hero/screenshot image

export const Hero = () => (
  <section className="flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
    <p className="font-body text-foreground-dimmed text-sm uppercase tracking-wide">
      Built for Shopify &amp; WooCommerce
    </p>

    <h1 className="max-w-3xl font-body font-semibold text-4xl text-foreground-rich md:text-6xl">
      Be the product AI recommends.
    </h1>

    <p className="max-w-2xl text-foreground-dimmed text-lg">
      Shoppers now ask ChatGPT, Gemini, and Perplexity what to buy. ecentic makes
      sure the answer is your product — and sends those buyers straight to your store.
    </p>

    <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-medium text-primary text-sm">
      {/* <TrendUpIcon className="size-4" /> */}
      DUA Flavours grew AI-agent visits +15% and sales +12% — in 30 days.
    </p>

    <InstallCta className="justify-center" />

    <p className="text-foreground-dimmed text-sm">
      2-minute setup · No credit card · See your free score first
    </p>

    <div className="mt-6 w-full max-w-4xl overflow-hidden rounded-2xl border border-accent-foreground">
      <Image
        src={/* screenshot or background.webp */ undefined as never}
        alt="ecentic dashboard showing AI win rate"
        priority
        className="w-full"
      />
    </div>
  </section>
);
```

### Task 3 — Create the `Proof` stat band

**New file:** `apps/web/src/app/(main)/_components/proof.tsx`

- Static `stats` array outside the component (copy from §2, `as const`).
- Render a heading + a responsive grid of stat tiles (`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4`).
- Each tile: big value (`font-body font-semibold text-4xl text-primary`), label (`text-foreground`), source (`text-foreground-dimmed text-xs`).
- Server component. Semantic tokens only.

```tsx
const stats = [
  { value: "+15%", label: "AI-agent visits for DUA Flavours in 30 days", source: "ecentic customer" },
  { value: "+12%", label: "sales for DUA Flavours in 30 days", source: "ecentic customer" },
  { value: "31%", label: "higher conversion from AI-referred shoppers", source: "Salesforce, 2025" },
  { value: "13%", label: "sales growth for stores built for AI agents (vs 2% without)", source: "Adobe / Bain" },
] as const;

export const Proof = () => (
  <section className="flex flex-col gap-10 px-4 py-16">
    <h2 className="max-w-2xl font-body font-semibold text-2xl text-foreground-rich md:text-3xl">
      AI is already sending shoppers. The only question is whether they land on you.
    </h2>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-2 border-accent-foreground border-l pl-4">
          <span className="font-body font-semibold text-4xl text-primary">{stat.value}</span>
          <span className="text-foreground">{stat.label}</span>
          <span className="text-foreground-dimmed text-xs">{stat.source}</span>
        </div>
      ))}
    </div>
  </section>
);
```

### Task 4 — Simplify `Steps` copy

**Edit file:** `apps/web/src/app/(main)/_components/steps.tsx`

- Keep the existing layout/markup/icons. **Only swap the text** for the "How it works" copy in §2.
- Change the section's heading to `Live in three steps.` and subhead to `Connect your store and ecentic does the rest.`
- Replace the three step titles/bodies (`Simulate/Diagnose/Optimize`) with `Connect your store` / `See where you lose` / `Get picked` and their bodies.
- **Add `id="how"`** to the section's root element so the navbar `/#how` link scrolls here (if the section root doesn't already have an id).

### Task 5 — Simplify `Features` copy

**Edit file:** `apps/web/src/app/(main)/_components/features.tsx`

- Keep the 4-card grid + icons. Swap heading to `Everything you need to win the AI shopper.` and replace the 4 card titles/descriptions with §2's Feature copy.
- Remove the word "Infrastructure" and other jargon from the heading.

### Task 6 — `PartnersStrip` (tiny tweak)

**Edit file:** `apps/web/src/app/(main)/_components/partners-strip.tsx`

- Keep as-is. Optionally change the heading `Backed by and selected by` → `Backed by and built for` if it reads cleaner. Low priority.

### Task 7 — Navbar

**Edit file:** `apps/web/src/components/navbar.tsx`

- Trim the `links` array to exactly: `{ href: "/#how", label: "How it works" }`, `{ href: "/pricing", label: "Pricing" }`, `{ href: "/blog", label: "Blog" }`.
- Change the primary CTA label from `Get Started` to `Install now` (keep it linking to `/sign-up`, keep the `ArrowRightIcon`).
- Do the same in the mobile `Sheet` menu.

### Task 8 — Footer CTA

**Edit file:** `apps/web/src/components/footer.tsx`

- In the top CTA band, replace the H2 with `Ready to be the product agents recommend?`, the eyebrow with `Get picked by AI`, and the body with `Install free on Shopify or WooCommerce and see your AI score in minutes.`
- Replace the single `Button` ("Get your free Win Rate Report" → `/sign-up`) with `<InstallCta />` (import it from `../app/(main)/_components/install-cta` — adjust the relative path; if the import path is awkward from `components/`, it's fine to keep a single `Install now` button → `/sign-up` here instead and only use the two-platform `InstallCta` in the hero). Keep the rest of the footer (link columns, socials) unchanged.

### Task 9 — Rewire `page.tsx`

**Edit file:** `apps/web/src/app/(main)/page.tsx`

New render order inside `<main>`:

```tsx
<Navbar />
<Hero />
<PartnersStrip />
<Proof />
<Steps />
<Features />
<Suspense><Comparison /></Suspense>   {/* keep as-is, optional */}
<Testimonials />
<Booking />
{/* keep the existing sr-only SEO <section> exactly as it is */}
<Footer />
```

- **Add** the `import { Proof } from "./_components/proof";` line.
- **Comment out** (do not delete the imports/usages destructively — match how `Pricing` is already commented): `<PartnershipBanner />`, `<DiscoveryShift />`, `<BlindSpot />`, `<WhyNow />`, `<UCPCallout />`. Remove their now-unused imports or leave them if that causes lint churn — prefer removing unused imports to keep Biome happy.
- Update the `Hero` import if you renamed anything (you didn't — same path).
- Leave the JSON-LD `<script>` and `metadata`/`createMetadata` block untouched **except**: the page `<title>` and `description` can be simplified to match the new plain tone (optional):
  - title: `ecentic — Be the product AI recommends`
  - description: `Get picked by AI shopping agents. ecentic optimizes your Shopify or WooCommerce listings so ChatGPT, Gemini, and Perplexity recommend you first.`
  - Keep it ≤160 chars for the description.

---

## 5. Things NOT to touch

- The `(auth)`, `dashboard`, `onboarding`, and `api` routes — out of scope.
- `Comparison`, `Testimonials`, `Booking` internals — render them as-is (only their *placement* changes).
- The JSON-LD schema block in `page.tsx` (SEO). Leave it.
- The `Plus` corner-cross markers and `border-accent-foreground` dividers — they're the site's visual signature; keep the existing pattern where sections already use them.
- Do not add new npm packages. Everything needed (`Button`, `Image`, `Link`, icons, `cn`) already exists.

---

## 6. Verification (do this before declaring done)

1. **Lint:** from `apps/web`, run `bun run lint` (Biome, `--write --unsafe`). Fix anything it flags in the files you touched. No `let`, no unused imports.
2. **Typecheck:** `bun run typecheck`. ⚠️ **This repo has ~74 pre-existing type errors — a clean zero is NOT expected.** Compare the error count/list before and after your change; you must not *add* new errors. If the count is unchanged (or only your intended files differ), you're good.
3. **Run it:** `bun run dev:web`, open `http://localhost:3000`, and check:
   - Hero shows the headline, the `+12%` result line, and two install buttons (Shopify + WooCommerce).
   - Clicking **Install on Shopify** goes to `/sign-up?platform=shopify`; **Install on WooCommerce** → `/sign-up?platform=woocommerce`.
   - The page no longer shows the old JSON/"FATAL: Agent Rejected" block, the Google-vs-ChatGPT animation, or the Visa/Mastercard milestone cards.
   - Order is: Hero → logos → stat band → 3 steps → features → comparison → testimonials → book a demo → footer.
   - Navbar CTA says **Install now**; footer CTA reflects the new copy.
   - Resize to mobile width — hero stacks, buttons go full-width, nothing overflows horizontally.
4. **No console errors** in the browser. Broken image `src`? Fix the screenshot import (fall back to `background.webp`).

---

## 7. Open questions to confirm with the owner (leave as `TODO(confirm)` if unanswered)

1. **Keep the Cal.com booking section and the EU partnership banner off the homepage?** (Plan removes the EU banner from home and keeps a slim booking section. Easy to flip.)
2. **Headline choice** — plan uses `Be the product AI recommends.` Alternatives if the owner prefers: `Get picked by AI shoppers.` / `Win the AI shopper's cart.`

_Resolved:_ DUA Flavours stats confirmed (+15% visits, +12% sales, publish permission granted). Shopify install target confirmed: `https://apps.shopify.com/ecentic-ai`.

---

## 8. Why this converts better (rationale, for reviewers)

Grounded in the referenced SaaS landing-page guidance (benefits-over-features, minimalist design, one prominent CTA, social proof, clear content hierarchy) and the tolt.com pattern (plain headline → obvious CTA → proof → simple 3-step → light comparison → testimonials → repeat CTA):

- **One benefit headline** replaces the abstract "40% of shoppers…" stat-hook.
- **A real customer result** (+12%) above the fold is the strongest possible proof and the emotional hook.
- **One obvious action** ("Install now" on your platform) removes the "what do I even do here" friction.
- **The two heaviest technical sections are gone** from the primary path — that was the literal "too technical" feedback. Their substance is distilled into one plain stat band.
- Everything reuses existing components and tokens, so it stays on-brand and low-risk.
