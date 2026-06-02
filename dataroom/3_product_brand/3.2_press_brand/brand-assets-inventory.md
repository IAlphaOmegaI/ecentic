# écentic — Brand Assets Inventory

**Last updated:** 2026-06-02
**Owner:** Mario Vukzaj (Product, contractor) — primary brand keeper
**Distribution:** Available on request via partnerships@ecentic.ai

This document inventories the brand assets we have, the assets we don't yet have, and the rules for using them.

## Brand identity at a glance

- **Wordmark:** écentic (lowercase, with the acute accent on the "é")
- **Stylization:** The "é" is the brand's distinctive mark — never substitute with a plain "e"
- **Primary brand color:** #1E40AF (deep blue — used in slide backgrounds, primary buttons, and most brand-foregrounded surfaces)
- **Secondary brand color:** #3B82F6 (bright blue — used for accents, headlines on light backgrounds, icons)
- **Dark mode:** Pure black (#000000) backgrounds with the primary blue as the accent on cover slides and section dividers
- **Typography:** Geist or Inter for digital surfaces; Times New Roman for legal and formal documents (data room, contracts, agreements)

## Assets currently available

### Logos
| Asset | Format | Location |
|---|---|---|
| Primary wordmark (white on blue) | SVG, PNG @1x/@2x/@3x | `dataroom/3_product_brand/3.2_press_brand/assets/logo/` *(to be populated by Mario)* |
| Primary wordmark (color on white) | SVG, PNG @1x/@2x/@3x | as above |
| Box icon (the "open box with sphere" mark) | SVG, PNG @1x/@2x/@3x | as above |
| Combined lockup (icon + wordmark) | SVG, PNG @1x/@2x/@3x | as above |
| Monochrome variants (black, white) | SVG, PNG | as above |

### Sales and marketing collateral
| Asset | Format | Status |
|---|---|---|
| Pitch deck (Red Bull Basement 2026 version) | PDF, Figma | Delivered in 1.1_snapshot |
| One-pager (current) | PDF, Figma | Delivered in 1.1_snapshot |
| Sales WIP deck (partner / enterprise) | PDF, Figma | Available — separate working file |
| Demo video | MP4 | Hosted at ecentic.ai/demo |

### Web assets
| Asset | Format | Location |
|---|---|---|
| Marketing website (ecentic.ai) | Live | Owned by Mario / Xhurian |
| Public UCP validator landing page | Live | ecentic.ai/validator |
| Documentation site | In progress | ecentic.ai/docs |
| Blog / Stories | In progress | ecentic.ai/blog |

### Visual identity sources
| Asset | Format | Location |
|---|---|---|
| Master Figma file (brand) | Figma | Maintained by Mario |
| Master Figma file (product UI) | Figma | Maintained by Mario + Xhurian |
| Brand color tokens (Tailwind config) | TS | In monorepo at `packages/web/` |

## Assets currently MISSING (priority to produce)

| Asset | Priority | Owner | Target date |
|---|---|---|---|
| Formal brand guidelines PDF | High | Mario | Q3 2026 |
| Press kit (zip of logo files + brand description + founder photos + boilerplate text) | High | Mario | Q3 2026 |
| High-resolution founder portraits (matching style) | High | Mario | Q3 2026 |
| Demo video in 30-second / 60-second / 3-minute variants | Medium | Mario | Q3 2026 |
| Animated product demo (15-second clip for social) | Medium | Mario | Q4 2026 |
| Sound logo (3-second audio mark for video intros) | Low | TBD | 2027 |
| Customer case study template | Medium | Iseld + Mario | Q3 2026 |
| Partner co-marketing kit (for Plug and Play, agency partners) | Medium | Iseld + Mario | Q4 2026 |

## Boilerplate text (for press, partner inclusion, social)

### Short (~30 words)
> écentic is the merchant-side optimization layer for agent commerce. It simulates how AI shopping agents — ChatGPT, Gemini, Claude, Perplexity — buy products, then auto-fixes what's losing. Based in Tirana, Albania.

### Medium (~80 words)
> écentic helps online stores get picked when AI shopping agents do the buying. The company simulates how ChatGPT, Gemini, Claude, and Perplexity shop a merchant's products against competitors, diagnoses why they win or lose, and auto-publishes optimised listings back to the merchant's store. Live on Shopify and WooCommerce. Backed by Plug and Play Tirana. Albania national winner at Red Bull Basement 2026. Headquartered in Tirana, Albania.

### Long (~180 words)
> écentic is building the optimization layer for agent commerce. As AI shopping agents — ChatGPT, Gemini, Claude, Perplexity — increasingly choose products on behalf of consumers, merchants need to ensure their listings are selected over competitors. écentic simulates these agent decisions across every major model, diagnoses why a merchant wins or loses each comparison, and auto-publishes optimised listings — titles, descriptions, structured data, and Universal Commerce Protocol profiles — back to the merchant's store. The result: merchants win more carts when an AI agent does the shopping.
>
> The company is live on the Shopify App Store with paying merchants, with active enterprise pilot conversations through Plug and Play Tirana's corporate ventures network. Founded by Xhurian Shaba, Alvi Palloshi, and Iseld Muça — three founders who have shipped three companies together before écentic. Headquartered in Tirana, Albania. Selected by Red Bull Basement as Albania's national winner for 2026, representing the country at the Silicon Valley World Final.

## Usage rules

- The "é" in écentic is mandatory in formal usage. In contexts where an acute "é" cannot be rendered (some terminal interfaces, legacy CRM fields), "ecentic" is acceptable.
- The primary brand colour (#1E40AF) is used for cover slides and the dominant brand surface; the secondary blue (#3B82F6) for accents and content highlights.
- Black backgrounds are used for high-stakes moments (cover slide, closing slide, gallery features) — never for body-content slides.
- The logo always carries clear space equal to the height of the "é" on all sides.
- The wordmark and the box icon may appear together (combined lockup) or separately — never modify the relationship within a single instance.

## Approval workflow for external use

For any external use of écentic brand assets:

- Investor decks, due-diligence materials: no approval needed (we want these to circulate)
- Partner co-marketing (Plug and Play, Shopify): Mario approves the asset selection; Xhurian or Iseld signs off on the message
- Press use: Mario provides press kit on request; founders quoted approve their own quotes before publication
- Customer testimonial use of customer logos: per the rules in `dataroom/2_traction_financials/2.1_customers/testimonials.md`

## Brand standards file (canonical)

The canonical brand standards are maintained in the Figma file owned by Mario. This document is the textual extract for the data room. In the event of conflict between this document and the Figma file, the Figma file wins.
