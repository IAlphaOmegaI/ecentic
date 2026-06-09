/**
 * Demo seeder — fills the dashboard with realistic data for a client demo.
 *
 * Seeds competitors, a 30-day scan history with simulations, AI agent traffic,
 * listing optimizations, a UCP profile and an active subscription for a user.
 *
 * Two modes (auto-detected):
 *   - attach: a real OAuth Shopify store (one with a store_account write token)
 *     exists for the user. Analytics are layered onto its REAL synced products,
 *     so published optimizations write back to the live store. The fabricated
 *     placeholder store and any same-shop duplicate connections are removed.
 *   - create: no real store found — fabricates a demo store + products.
 *
 * Idempotent and safe: re-running only wipes regenerated analytics + the
 * placeholder/duplicate store rows. It never deletes the target store, its
 * products, or its token.
 *
 * Usage:
 *   bun scripts/seed-demo.ts                        # auto-detect store, contact@ecentic.ai
 *   bun scripts/seed-demo.ts --store=<storeId>      # attach to a specific store
 *   bun scripts/seed-demo.ts --email=foo@bar.com --password=Secret123!
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/server/database";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const parseArgs = () => {
  const args = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return {
    email: args.get("email") ?? "contact@ecentic.ai",
    // null = leave the existing password untouched (don't clobber a real one).
    password: args.get("password") ?? null,
    // target store id; when omitted the real OAuth store is auto-detected.
    store: args.get("store") ?? null,
    products: Number.parseInt(args.get("products") ?? "24", 10),
  };
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const id = () => crypto.randomUUID();
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (days: number, jitterHours = 0) =>
  new Date(now - days * DAY - jitterHours * 60 * 60 * 1000);

const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

const between = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    out.push(items.slice(index, index + size));
  return out;
};

const hostnameOf = (value: string): string => {
  try {
    return new URL(
      value.startsWith("http") ? value : `https://${value}`,
    ).hostname.toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, "").toLowerCase();
  }
};

const images = (handle: string, count: number) =>
  JSON.stringify(
    Array.from(
      { length: count },
      (_value, index) =>
        `https://picsum.photos/seed/${handle}-${index}/800/800`,
    ),
  );

const jsonLd = (product: {
  title: string;
  price: string;
  sku: string;
  description: string;
}) =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: "Écentic" },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  });

// ---------------------------------------------------------------------------
// Product catalog — consumer electronics & audio (the merchant: "Écentic")
//
// `q` controls data-quality (which fields are filled): description, image
// count and structured data. `win` is the target win-rate the seeded
// simulations will aim for. Quality and win-rate are deliberately correlated
// so the optimization story (thin listing -> low win-rate) lands.
// ---------------------------------------------------------------------------

type ProductSpec = {
  title: string;
  handle: string;
  sku: string;
  price: number;
  compareAt: number | null;
  description: string | null;
  imageCount: number;
  structured: boolean;
  hasSku: boolean;
  win: number;
};

const DESC = {
  aura: "Reference-grade wireless headphones with adaptive active noise cancellation, 40mm graphene-coated drivers, and 40-hour battery life. Multipoint Bluetooth 5.4, USB-C fast charge (5 min = 5 hrs), and a detachable boom mic for calls. Includes hard travel case, 3.5mm cable, and a 2-year warranty.",
  pulse:
    "Room-filling 360° smart speaker with dual 3-inch woofers and adaptive room tuning. Works with AirPlay 2, Spotify Connect, and Matter. Far-field voice control, stereo pairing, and a recycled-aluminium body. Setup in under a minute via the Écentic app.",
  drift:
    "Compact ANC earbuds with 11mm dynamic drivers, six-mic call clarity, and 32 hours total playback with the wireless charging case. IPX5 sweat resistance, low-latency game mode, and customizable EQ in-app. Bluetooth 5.3 with multipoint.",
  volt: "100W GaN III charger with three USB-C and one USB-A port. Charges a laptop, tablet, and two phones at full speed simultaneously. Foldable prongs, smart power distribution, and travel-ready compact design. UL and CE certified.",
  beam: "Compact 4K HDR streaming soundbar with Dolby Atmos, four upward-firing drivers, and a wireless subwoofer. HDMI eARC, optical, and Bluetooth inputs. Voice-assistant ready with a low-profile design that fits under any TV.",
  halo: "15W Qi2 magnetic wireless charging pad with active cooling and foreign-object detection. Charges through most cases, includes a 30W adapter and braided USB-C cable. Non-slip recycled silicone base.",
  nomad:
    "Portable Bluetooth speaker with 20W output, IP67 waterproof and dustproof rating, and 24-hour battery. Floats, pairs in stereo, and recharges over USB-C. Built-in carabiner for on-the-go listening.",
  trek: "Lightweight over-ear headphones with 45-hour battery, 38mm drivers, and plush memory-foam earcups. Foldable design, USB-C charging, and built-in mic for calls. Tuned for balanced everyday listening.",
  spark:
    "8-in-1 USB-C hub with 4K HDMI, 100W power delivery passthrough, gigabit Ethernet, SD/microSD readers, and three USB-A 3.0 ports. Aluminium body stays cool under load. Plug-and-play, no drivers required.",
  glow: "Smart LED bulbs (4-pack) with 16 million colours, tunable white, and Matter support. Works with Alexa, Google Home, and Apple Home. Schedules, scenes, and music sync via the Écentic app. 25,000-hour rated life.",
  move: "Secure-fit fitness earbuds with ear hooks, IP68 rating, and 10mm bass drivers. 28 hours total battery, ambient mode for outdoor runs, and a quick-charge case. Sweatproof and built for movement.",
  arc: "Ergonomic wireless mouse with a silent click, 4000 DPI sensor, and USB-C rechargeable battery rated for 70 days. Multi-device switching across three computers.",
};

const productSpecs: ProductSpec[] = [
  // --- Top performers: full data (6/6), high win-rate ---
  {
    title: "Écentic Aura Pro Wireless ANC Headphones",
    handle: "aura-pro",
    sku: "EC-AURA-PRO",
    price: 299,
    compareAt: 349,
    description: DESC.aura,
    imageCount: 6,
    structured: true,
    hasSku: true,
    win: 76,
  },
  {
    title: "Écentic Pulse 360 Smart Speaker",
    handle: "pulse-360",
    sku: "EC-PULSE-360",
    price: 179,
    compareAt: 199,
    description: DESC.pulse,
    imageCount: 6,
    structured: true,
    hasSku: true,
    win: 70,
  },
  {
    title: "Écentic Drift Pro ANC Earbuds",
    handle: "drift-pro",
    sku: "EC-DRIFT-PRO",
    price: 149,
    compareAt: 179,
    description: DESC.drift,
    imageCount: 5,
    structured: true,
    hasSku: true,
    win: 67,
  },
  {
    title: "Écentic Volt 100W GaN Charger",
    handle: "volt-100w",
    sku: "EC-VOLT-100",
    price: 69,
    compareAt: null,
    description: DESC.volt,
    imageCount: 5,
    structured: true,
    hasSku: true,
    win: 64,
  },
  {
    title: "Écentic Beam 4K Streaming Soundbar",
    handle: "beam-4k",
    sku: "EC-BEAM-4K",
    price: 249,
    compareAt: 299,
    description: DESC.beam,
    imageCount: 6,
    structured: true,
    hasSku: true,
    win: 62,
  },
  {
    title: "Écentic Halo Qi2 Charging Pad",
    handle: "halo-qi2",
    sku: "EC-HALO-Q2",
    price: 49,
    compareAt: null,
    description: DESC.halo,
    imageCount: 5,
    structured: true,
    hasSku: true,
    win: 61,
  },

  // --- Good: missing structured data (5/6), solid win-rate ---
  {
    title: "Écentic Nomad Waterproof Speaker",
    handle: "nomad-spk",
    sku: "EC-NOMAD",
    price: 89,
    compareAt: 109,
    description: DESC.nomad,
    imageCount: 5,
    structured: false,
    hasSku: true,
    win: 58,
  },
  {
    title: "Écentic Trek Over-Ear Headphones",
    handle: "trek-oe",
    sku: "EC-TREK",
    price: 129,
    compareAt: null,
    description: DESC.trek,
    imageCount: 4,
    structured: false,
    hasSku: true,
    win: 55,
  },
  {
    title: "Écentic Spark 8-in-1 USB-C Hub",
    handle: "spark-hub",
    sku: "EC-SPARK-8",
    price: 59,
    compareAt: 79,
    description: DESC.spark,
    imageCount: 4,
    structured: false,
    hasSku: true,
    win: 53,
  },
  {
    title: "Écentic Glow Smart Bulbs (4-Pack)",
    handle: "glow-4pk",
    sku: "EC-GLOW-4",
    price: 39,
    compareAt: null,
    description: DESC.glow,
    imageCount: 5,
    structured: false,
    hasSku: true,
    win: 50,
  },

  // --- Fair: one extra field (4/6), mid win-rate ---
  {
    title: "Écentic Move Fitness Earbuds",
    handle: "move-fit",
    sku: "EC-MOVE",
    price: 79,
    compareAt: 99,
    description: DESC.move,
    imageCount: 1,
    structured: false,
    hasSku: true,
    win: 46,
  },
  {
    title: "Écentic Arc Wireless Mouse",
    handle: "arc-mouse",
    sku: "EC-ARC",
    price: 45,
    compareAt: null,
    description: DESC.arc,
    imageCount: 1,
    structured: false,
    hasSku: true,
    win: 43,
  },
  {
    title: "Écentic Flux 65W Travel Adapter",
    handle: "flux-65w",
    sku: "EC-FLUX-65",
    price: 39,
    compareAt: null,
    description: null,
    imageCount: 4,
    structured: false,
    hasSku: true,
    win: 41,
  },
  {
    title: "Écentic Tempo Alarm Speaker",
    handle: "tempo-alarm",
    sku: "EC-TEMPO",
    price: 59,
    compareAt: 69,
    description: null,
    imageCount: 3,
    structured: false,
    hasSku: true,
    win: 38,
  },

  // --- Fair/low: title+price+sku only (3/6) ---
  {
    title: "Écentic Clip Mini Speaker",
    handle: "clip-mini",
    sku: "EC-CLIP",
    price: 29,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: true,
    win: 35,
  },
  {
    title: "Écentic Lite Wired Earphones",
    handle: "lite-wired",
    sku: "EC-LITE",
    price: 19,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: true,
    win: 32,
  },
  {
    title: "Écentic Dock USB-C Stand",
    handle: "dock-stand",
    sku: "EC-DOCK",
    price: 34,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: true,
    win: 30,
  },
  {
    title: "Écentic Loop Lanyard Earbuds",
    handle: "loop-buds",
    sku: "EC-LOOP",
    price: 49,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: true,
    win: 28,
  },

  // --- Poor: title + price only (2/6), needs attention ---
  {
    title: "Écentic Pebble Bluetooth Speaker",
    handle: "pebble",
    sku: "",
    price: 24,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: false,
    win: 22,
  },
  {
    title: "Écentic Snap Magnetic Mount",
    handle: "snap-mount",
    sku: "",
    price: 18,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: false,
    win: 18,
  },
  {
    title: "Écentic Mini Bluetooth Speaker",
    handle: "mini-spk",
    sku: "",
    price: 22,
    compareAt: null,
    description: null,
    imageCount: 0,
    structured: false,
    hasSku: false,
    win: 14,
  },

  // --- Extra mid/good products to round out the catalog ---
  {
    title: "Écentic Surge 30W Car Charger",
    handle: "surge-30w",
    sku: "EC-SURGE",
    price: 25,
    compareAt: 35,
    description:
      "Dual-port 30W car charger with USB-C PD and USB-A, smart device detection, and an LED indicator. Compact aluminium build fits any 12V socket.",
    imageCount: 4,
    structured: true,
    hasSku: true,
    win: 57,
  },
  {
    title: "Écentic Vista Webcam 2K",
    handle: "vista-2k",
    sku: "EC-VISTA-2K",
    price: 79,
    compareAt: 99,
    description:
      "2K QHD webcam with autofocus, dual noise-cancelling mics, and a privacy shutter. Plug-and-play USB-C, 90° field of view, and low-light correction for crisp video calls.",
    imageCount: 5,
    structured: false,
    hasSku: true,
    win: 52,
  },
  {
    title: "Écentic Forge Mechanical Keyboard",
    handle: "forge-kb",
    sku: "EC-FORGE",
    price: 119,
    compareAt: 139,
    description:
      "75% hot-swappable mechanical keyboard with gasket mount, PBT keycaps, south-facing RGB, and tri-mode connectivity (USB-C, Bluetooth, 2.4GHz). Sound-dampening foam included.",
    imageCount: 6,
    structured: true,
    hasSku: true,
    win: 60,
  },
];

// ---------------------------------------------------------------------------
// Competitor catalog — real, plausible products grouped by brand.
// The first product of each brand becomes a "selected" competitor (used in the
// scan); the rest are tracked-but-unselected catalog volume.
// ---------------------------------------------------------------------------

type CompetitorSpec = {
  title: string;
  brand: string;
  price: number;
  source: string;
  /** 0..1 — how hard this competitor is to beat (lowers product win-rate). */
  strength: number;
  description: string;
};

const competitorBrands: { brand: string; products: CompetitorSpec[] }[] = [
  {
    brand: "Sony",
    products: [
      {
        title: "Sony WH-1000XM5 Wireless Headphones",
        brand: "Sony",
        price: 399,
        source: "Amazon",
        strength: 0.9,
        description:
          "Category-leading ANC over-ear headphones with 30-hour battery and 8 mics.",
      },
      {
        title: "Sony WF-1000XM5 Earbuds",
        brand: "Sony",
        price: 299,
        source: "Best Buy",
        strength: 0.85,
        description:
          "Flagship noise-cancelling earbuds with LDAC and crystal-clear calls.",
      },
      {
        title: "Sony ULT Wear Headphones",
        brand: "Sony",
        price: 199,
        source: "Amazon",
        strength: 0.6,
        description: "Bass-forward over-ear headphones with ULT power sound.",
      },
    ],
  },
  {
    brand: "Bose",
    products: [
      {
        title: "Bose QuietComfort Ultra Headphones",
        brand: "Bose",
        price: 429,
        source: "Amazon",
        strength: 0.88,
        description:
          "Immersive spatial audio headphones with world-class noise cancellation.",
      },
      {
        title: "Bose QuietComfort Earbuds II",
        brand: "Bose",
        price: 279,
        source: "Target",
        strength: 0.8,
        description: "Personalized ANC earbuds with CustomTune calibration.",
      },
      {
        title: "Bose SoundLink Flex Speaker",
        brand: "Bose",
        price: 149,
        source: "Best Buy",
        strength: 0.55,
        description: "Rugged portable speaker with PositionIQ and IP67 rating.",
      },
    ],
  },
  {
    brand: "Apple",
    products: [
      {
        title: "Apple AirPods Pro (2nd Gen, USB-C)",
        brand: "Apple",
        price: 249,
        source: "Amazon",
        strength: 0.92,
        description:
          "Adaptive Audio earbuds with the H2 chip and USB-C charging case.",
      },
      {
        title: "Apple AirPods Max",
        brand: "Apple",
        price: 549,
        source: "Best Buy",
        strength: 0.78,
        description: "Premium over-ear headphones with computational audio.",
      },
      {
        title: "Apple HomePod mini",
        brand: "Apple",
        price: 99,
        source: "Direct",
        strength: 0.6,
        description: "Compact smart speaker with room-filling 360° sound.",
      },
    ],
  },
  {
    brand: "Samsung",
    products: [
      {
        title: "Samsung Galaxy Buds3 Pro",
        brand: "Samsung",
        price: 249,
        source: "Amazon",
        strength: 0.7,
        description: "Hi-Fi earbuds with adaptive ANC and blade-light design.",
      },
      {
        title: "Samsung 45W USB-C Charger",
        brand: "Samsung",
        price: 49,
        source: "Walmart",
        strength: 0.45,
        description: "Super-fast 45W GaN charger for Galaxy devices.",
      },
    ],
  },
  {
    brand: "JBL",
    products: [
      {
        title: "JBL Charge 5 Portable Speaker",
        brand: "JBL",
        price: 179,
        source: "Walmart",
        strength: 0.4,
        description:
          "Powerful portable speaker with a built-in powerbank and IP67 rating.",
      },
      {
        title: "JBL Tune 770NC Headphones",
        brand: "JBL",
        price: 129,
        source: "Amazon",
        strength: 0.42,
        description: "Adaptive ANC headphones with 70-hour battery.",
      },
      {
        title: "JBL Flip 6 Speaker",
        brand: "JBL",
        price: 129,
        source: "Target",
        strength: 0.38,
        description: "Bold-sound waterproof portable speaker.",
      },
      {
        title: "JBL Clip 4 Speaker",
        brand: "JBL",
        price: 79,
        source: "Amazon",
        strength: 0.3,
        description: "Ultra-portable clip-on speaker with big sound.",
      },
    ],
  },
  {
    brand: "Anker Soundcore",
    products: [
      {
        title: "Soundcore Liberty 4 Earbuds",
        brand: "Anker Soundcore",
        price: 99,
        source: "Amazon",
        strength: 0.35,
        description: "ACAA 3.0 earbuds with heart-rate sensing and ANC.",
      },
      {
        title: "Anker 65W GaN Charger",
        brand: "Anker Soundcore",
        price: 39,
        source: "Amazon",
        strength: 0.3,
        description: "Compact 65W three-port GaN fast charger.",
      },
      {
        title: "Soundcore Motion 300 Speaker",
        brand: "Anker Soundcore",
        price: 79,
        source: "Walmart",
        strength: 0.32,
        description: "Hi-Res portable speaker with BassUp technology.",
      },
    ],
  },
  {
    brand: "Sonos",
    products: [
      {
        title: "Sonos Era 100 Smart Speaker",
        brand: "Sonos",
        price: 249,
        source: "Best Buy",
        strength: 0.72,
        description:
          "Acoustically tuned smart speaker with Trueplay and stereo sound.",
      },
      {
        title: "Sonos Ray Soundbar",
        brand: "Sonos",
        price: 279,
        source: "Amazon",
        strength: 0.65,
        description: "Compact soundbar for crisp dialogue and punchy bass.",
      },
      {
        title: "Sonos Roam 2 Speaker",
        brand: "Sonos",
        price: 179,
        source: "Target",
        strength: 0.58,
        description:
          "Portable WiFi and Bluetooth speaker with automatic tuning.",
      },
    ],
  },
  {
    brand: "Beats",
    products: [
      {
        title: "Beats Studio Pro Headphones",
        brand: "Beats",
        price: 349,
        source: "Amazon",
        strength: 0.6,
        description:
          "Wireless headphones with personalized spatial audio and ANC.",
      },
      {
        title: "Beats Fit Pro Earbuds",
        brand: "Beats",
        price: 199,
        source: "Best Buy",
        strength: 0.55,
        description: "Secure-fit earbuds with active noise cancellation.",
      },
    ],
  },
  {
    brand: "Sennheiser",
    products: [
      {
        title: "Sennheiser Momentum 4 Wireless",
        brand: "Sennheiser",
        price: 349,
        source: "Amazon",
        strength: 0.75,
        description: "Audiophile wireless headphones with 60-hour battery.",
      },
      {
        title: "Sennheiser Accentum Wireless",
        brand: "Sennheiser",
        price: 179,
        source: "Amazon",
        strength: 0.5,
        description: "Balanced ANC headphones with 50-hour playtime.",
      },
    ],
  },
  {
    brand: "Jabra",
    products: [
      {
        title: "Jabra Elite 10 Gen 2 Earbuds",
        brand: "Jabra",
        price: 279,
        source: "Best Buy",
        strength: 0.62,
        description: "Dolby Atmos earbuds with natural ANC and comfort fit.",
      },
      {
        title: "Jabra Elite 8 Active Earbuds",
        brand: "Jabra",
        price: 199,
        source: "Amazon",
        strength: 0.52,
        description: "Rugged workout earbuds with adaptive hybrid ANC.",
      },
    ],
  },
  {
    brand: "Marshall",
    products: [
      {
        title: "Marshall Emberton II Speaker",
        brand: "Marshall",
        price: 169,
        source: "Amazon",
        strength: 0.48,
        description:
          "Portable speaker with signature Marshall sound and 30+ hour battery.",
      },
      {
        title: "Marshall Stanmore III Speaker",
        brand: "Marshall",
        price: 379,
        source: "Best Buy",
        strength: 0.5,
        description: "Classic-styled home speaker with wide soundstage.",
      },
    ],
  },
  {
    brand: "Belkin",
    products: [
      {
        title: "Belkin BoostCharge Pro 3-in-1 (Qi2)",
        brand: "Belkin",
        price: 149,
        source: "Apple",
        strength: 0.45,
        description: "MagSafe-compatible 3-in-1 fast wireless charger.",
      },
      {
        title: "Belkin 65W Dual USB-C Charger",
        brand: "Belkin",
        price: 49,
        source: "Amazon",
        strength: 0.35,
        description: "Compact dual-port GaN charger for laptops and phones.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// AI agent traffic — agentType -> { category, detectionMethod, weight, ua }.
// Weight drives the relative volume of visits across the last 30 days.
// ---------------------------------------------------------------------------

const agentMix = [
  {
    type: "chatgpt-user",
    category: "user-action",
    method: "user-agent",
    weight: 22,
    ua: "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)",
  },
  {
    type: "chatgpt-referral",
    category: "referral",
    method: "referrer",
    weight: 16,
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    referrer: "https://chatgpt.com/",
  },
  {
    type: "oai-searchbot",
    category: "search-crawler",
    method: "user-agent",
    weight: 10,
    ua: "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
  },
  {
    type: "gptbot",
    category: "training-crawler",
    method: "user-agent",
    weight: 8,
    ua: "Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)",
  },
  {
    type: "claude-user",
    category: "user-action",
    method: "user-agent",
    weight: 9,
    ua: "Mozilla/5.0 (compatible; Claude-User/1.0; +https://anthropic.com)",
  },
  {
    type: "claude-referral",
    category: "referral",
    method: "referrer",
    weight: 7,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    referrer: "https://claude.ai/",
  },
  {
    type: "claudebot",
    category: "training-crawler",
    method: "user-agent",
    weight: 5,
    ua: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://anthropic.com/claudebot)",
  },
  {
    type: "claude-searchbot",
    category: "search-crawler",
    method: "user-agent",
    weight: 4,
    ua: "Mozilla/5.0 (compatible; Claude-SearchBot/1.0; +https://anthropic.com)",
  },
  {
    type: "perplexity-user",
    category: "user-action",
    method: "user-agent",
    weight: 7,
    ua: "Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/bot)",
  },
  {
    type: "perplexity-referral",
    category: "referral",
    method: "referrer",
    weight: 5,
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    referrer: "https://www.perplexity.ai/",
  },
  {
    type: "perplexitybot",
    category: "search-crawler",
    method: "user-agent",
    weight: 4,
    ua: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)",
  },
  {
    type: "gemini-referral",
    category: "referral",
    method: "referrer",
    weight: 6,
    ua: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
    referrer: "https://gemini.google.com/",
  },
  {
    type: "google-extended",
    category: "training-crawler",
    method: "user-agent",
    weight: 3,
    ua: "Mozilla/5.0 (compatible; Google-Extended/1.0)",
  },
  {
    type: "perplexity-comet",
    category: "agentic-browser",
    method: "user-agent",
    weight: 2,
    ua: "Mozilla/5.0 (compatible; Perplexity-Comet/1.0)",
  },
  {
    type: "chatgpt-agent",
    category: "agentic-browser",
    method: "user-agent",
    weight: 2,
    ua: "Mozilla/5.0 (compatible; ChatGPT-Agent/1.0)",
  },
] as const;

const pageTypes = [
  "product",
  "product",
  "product",
  "product",
  "collection",
  "homepage",
] as const;

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const seed = async () => {
  const {
    email,
    password,
    store: storeArg,
    products: productCount,
  } = parseArgs();

  // --- Resolve the target user -------------------------------------------
  const [user] = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!user) {
    console.error(
      `No user found with email "${email}". Pass --email=<existing email>.`,
    );
    process.exit(1);
  }

  const userId = user.id;
  console.log(`Seeding demo data for ${email} (${userId})`);

  // --- Ensure the account can log in -------------------------------------
  // Always verify email; only (re)set the password when --password is passed,
  // so we never clobber the real password of a live account.
  await db
    .update(schema.user)
    .set({ emailVerified: true })
    .where(eq(schema.user.id, userId));

  if (password) {
    const auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema }),
      emailAndPassword: { enabled: true },
    });
    const context = await auth.$context;
    const hash = await context.password.hash(password);

    const [credential] = await db
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, userId),
          eq(schema.account.providerId, "credential"),
        ),
      )
      .limit(1);

    if (credential) {
      await db
        .update(schema.account)
        .set({ password: hash, updatedAt: new Date() })
        .where(eq(schema.account.id, credential.id));
    } else {
      await db.insert(schema.account).values({
        id: id(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: hash,
      });
    }
  }

  // --- Resolve the target store ------------------------------------------
  // Prefer a real OAuth store (one with a store_account write token). Only the
  // fabricated placeholder (ecentic-demo.myshopify.com) is ever deleted, so a
  // genuine connected store + its token are never destroyed by re-runs.
  const DEMO_DOMAIN = "ecentic-demo.myshopify.com";

  const stores = await db
    .select()
    .from(schema.store)
    .where(eq(schema.store.userId, userId));

  const accounts = stores.length
    ? await db
        .select({ storeId: schema.store_account.storeId })
        .from(schema.store_account)
        .where(
          inArray(
            schema.store_account.storeId,
            stores.map((store) => store.id),
          ),
        )
    : [];
  const tokened = new Set(accounts.map((account) => account.storeId));

  const target = (() => {
    if (storeArg) return stores.find((store) => store.id === storeArg) ?? null;
    return (
      stores.find(
        (store) => tokened.has(store.id) && !store.domain.includes(DEMO_DOMAIN),
      ) ?? null
    );
  })();

  if (storeArg && !target) {
    console.error(`No store "${storeArg}" found for ${email}.`);
    process.exit(1);
  }

  const mode = target ? "attach" : "create";
  const targetHost = target ? hostnameOf(target.domain) : null;

  // --- Clean prior analytics (regenerated below) -------------------------
  // Safe by construction: never deletes the target store, its products, or its
  // token. Only user-scoped analytics + the placeholder and same-shop
  // duplicate store rows are removed.
  console.log(`Clearing prior demo analytics (${mode} mode)...`);
  await db.delete(schema.scan).where(eq(schema.scan.userId, userId)); // cascades simulations (scanId)
  await db
    .delete(schema.competitor)
    .where(eq(schema.competitor.userId, userId)); // cascades simulations (competitorId)
  await db
    .delete(schema.agentVisit)
    .where(eq(schema.agentVisit.userId, userId));
  await db
    .delete(schema.agentTrafficDaily)
    .where(eq(schema.agentTrafficDaily.userId, userId));
  await db
    .delete(schema.listingOptimization)
    .where(eq(schema.listingOptimization.userId, userId));
  await db
    .delete(schema.ucpProfile)
    .where(eq(schema.ucpProfile.userId, userId));
  await db
    .delete(schema.subscription)
    .where(eq(schema.subscription.userId, userId));

  for (const store of stores) {
    if (store.id === target?.id) continue; // never the target store
    const isPlaceholder = store.domain.includes(DEMO_DOMAIN);
    // Same shop connected more than once: a redundant duplicate row. The shop
    // stays connected through the target, so removing the extra row is safe.
    const isDuplicateShop =
      targetHost !== null && hostnameOf(store.domain) === targetHost;
    if (!isPlaceholder && !isDuplicateShop) continue; // keep unrelated stores
    await db.delete(schema.store).where(eq(schema.store.id, store.id)); // cascades products + its store_account
    console.log(
      `Removed ${isPlaceholder ? "placeholder" : "duplicate"} store ${store.domain} (${store.id}).`,
    );
  }

  // --- Store + products --------------------------------------------------
  // attach mode: layer analytics onto the real, already-synced products so
  //   that published fixes write back to the live Shopify store.
  // create mode: fabricate a demo store + products (no real store found).
  const { storeId, domain, productRows } = await (async () => {
    if (mode === "attach" && target) {
      const host = (() => {
        try {
          return new URL(target.domain).hostname;
        } catch {
          return target.domain.replace(/^https?:\/\//, "");
        }
      })();

      const real = await db
        .select()
        .from(schema.product)
        .where(eq(schema.product.storeId, target.id));

      if (real.length === 0) {
        console.error(
          `Store ${target.domain} has no products — sync the store first.`,
        );
        process.exit(1);
      }

      // Map curated win-rates back onto real products by title; fall back to a
      // data-quality estimate for anything not in the seeded catalog.
      const winByTitle = new Map(
        productSpecs.map((spec) => [spec.title.trim().toLowerCase(), spec.win]),
      );
      const qualityKeys = [
        "title",
        "description",
        "price",
        "images",
        "sku",
        "structuredData",
      ] as const;
      const winFor = (product: (typeof real)[number]) => {
        const matched = winByTitle.get(product.title.trim().toLowerCase());
        if (matched !== undefined) return matched;
        const filled = qualityKeys.filter((key) => {
          const value = product[key];
          if (!value) return false;
          if (key === "images") return value !== "[]";
          return true;
        }).length;
        return clamp(
          Math.round((filled / qualityKeys.length) * 100 * 0.7) +
            between(-6, 6),
          12,
          80,
        );
      };

      const ranked = real.map((product) => ({
        product,
        win: winFor(product),
      }));

      // Interleave by win so the overview's 10-newest sample stays balanced.
      const order = ranked
        .map((entry, index) => ({ index, win: entry.win }))
        .sort((a, b) => b.win - a.win);
      const interleaved: number[] = [];
      let low = 0;
      let high = order.length - 1;
      while (low <= high) {
        interleaved.push(order[low++].index);
        if (low <= high) interleaved.push(order[high--].index);
      }
      const rank: number[] = new Array(ranked.length);
      interleaved.forEach((index, position) => {
        rank[index] = position;
      });

      // Repoint createdAt (sample ordering) + updatedAt ("last scan") only —
      // no other real product data is touched.
      for (const [index, entry] of ranked.entries()) {
        await db
          .update(schema.product)
          .set({
            createdAt: daysAgo(0, rank[index] * 2 + 2),
            updatedAt: daysAgo(0, 1),
          })
          .where(eq(schema.product.id, entry.product.id));
      }

      console.log(`Found ${real.length} real products on ${host}.`);

      return {
        storeId: target.id,
        domain: host,
        productRows: ranked.map(({ product, win }) => ({
          id: product.id,
          win,
          title: product.title,
          externalId: product.externalId,
          url: product.url ?? `https://${host}/`,
        })),
      };
    }

    // create mode — fabricate the demo store + products.
    const newStoreId = id();
    await db.insert(schema.store).values({
      id: newStoreId,
      userId,
      storeId: String(between(60000000000, 69999999999)),
      platform: "shopify",
      name: "Écentic",
      domain: DEMO_DOMAIN,
      status: "connected",
      trackerApiKey: `ec_live_${crypto.randomUUID().replace(/-/g, "")}`,
      storefrontHosts: [DEMO_DOMAIN, "ecentic.ai"],
      lastSyncedAt: daysAgo(0, 3),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(0, 3),
    });

    const specs = productSpecs.slice(
      0,
      clamp(productCount, 3, productSpecs.length),
    );
    const winOrder = specs
      .map((spec, index) => ({ index, win: spec.win }))
      .sort((a, b) => b.win - a.win);
    const interleaved: number[] = [];
    let low = 0;
    let high = winOrder.length - 1;
    while (low <= high) {
      interleaved.push(winOrder[low++].index);
      if (low <= high) interleaved.push(winOrder[high--].index);
    }
    const rank: number[] = new Array(specs.length);
    interleaved.forEach((specIndex, position) => {
      rank[specIndex] = position;
    });

    const rows = specs.map((spec, index) => {
      const price = spec.price.toFixed(2);
      const description = spec.description;
      const structured =
        spec.structured && description
          ? jsonLd({ title: spec.title, price, sku: spec.sku, description })
          : null;
      return {
        id: id(),
        storeId: newStoreId,
        userId,
        externalId: `gid://shopify/Product/${between(7000000000000, 7999999999999)}`,
        title: spec.title,
        description,
        price,
        compareAtPrice: spec.compareAt ? spec.compareAt.toFixed(2) : null,
        currency: "USD",
        images:
          spec.imageCount > 0 ? images(spec.handle, spec.imageCount) : "[]",
        url: `https://${DEMO_DOMAIN}/products/${spec.handle}`,
        sku: spec.hasSku ? spec.sku : null,
        status: "active",
        structuredData: structured,
        syncedAt: daysAgo(0, 3),
        createdAt: daysAgo(0, rank[index] * 2 + 2),
        updatedAt: daysAgo(0, 1),
        win: spec.win,
      };
    });

    await db
      .insert(schema.product)
      .values(rows.map(({ win: _win, ...row }) => row));

    return {
      storeId: newStoreId,
      domain: DEMO_DOMAIN,
      productRows: rows.map((row) => ({
        id: row.id,
        win: row.win,
        title: row.title,
        externalId: row.externalId,
        url: row.url,
      })),
    };
  })();

  console.log(
    `${mode === "attach" ? "Attached analytics to" : "Created demo store"} ${domain} (${productRows.length} products).`,
  );

  // --- Competitors -------------------------------------------------------
  // The flagship (first) product of each brand is "selected" and created
  // newest, so it appears in the overview's 10-competitor sample with sims.
  const selectedCompetitors: {
    id: string;
    brand: string;
    strength: number;
  }[] = [];

  const competitorRows: (typeof schema.competitor.$inferInsert)[] = [];
  let selectedIndex = 0;
  let secondaryIndex = 0;

  for (const group of competitorBrands) {
    group.products.forEach((competitor, indexInBrand) => {
      const selected = indexInBrand === 0;
      const competitorId = id();
      const createdAt = selected
        ? daysAgo(0, selectedIndex++ * 2 + 1) // selected = newest
        : daysAgo(10, secondaryIndex++ * 6); // unselected = older
      competitorRows.push({
        id: competitorId,
        userId,
        title: competitor.title,
        description: competitor.description,
        price: competitor.price.toFixed(2),
        currency: "USD",
        image: `https://picsum.photos/seed/${competitor.brand.replace(/\s+/g, "")}-${indexInBrand}/600/600`,
        url: `https://www.${competitor.source.toLowerCase().replace(/\s+/g, "")}.com`,
        source: competitor.source,
        brand: competitor.brand,
        selected,
        createdAt,
        updatedAt: createdAt,
      });
      if (selected)
        selectedCompetitors.push({
          id: competitorId,
          brand: competitor.brand,
          strength: competitor.strength,
        });
    });
  }

  await db.insert(schema.competitor).values(competitorRows);
  console.log(
    `Inserted ${competitorRows.length} competitors (${selectedCompetitors.length} selected).`,
  );

  // --- Latest scan + simulations ----------------------------------------
  const models = ["gpt4", "claude", "gemini", "perplexity"] as const;
  const modelOffset: Record<(typeof models)[number], number> = {
    gpt4: -0.04,
    claude: 0.05,
    gemini: 0.02,
    perplexity: -0.03,
  };

  const reasonsWin = [
    "PRODUCT lists 6 images and full specifications; COMPETITOR provides fewer concrete details.",
    "PRODUCT has structured data and a clear warranty; COMPETITOR omits certifications.",
    "PRODUCT description front-loads measurable specs, winning the comparison on completeness.",
    "PRODUCT pricing is competitive for the spec set; evidence favors PRODUCT.",
  ];
  const reasonsLoss = [
    "COMPETITOR has more reviews and richer imagery; PRODUCT listing is thin.",
    "PRODUCT is missing structured data and key specifications, lowering buyer confidence.",
    "PRODUCT has no product images, so COMPETITOR wins on visual evidence.",
    "COMPETITOR provides clearer dimensions and certifications than PRODUCT.",
  ];

  const latestScanId = id();
  const latestScanCreatedAt = daysAgo(0, 6);

  // Center the competitor-strength effect on the *average* selected strength
  // so it only adds per-brand variance (premium brands are harder to beat)
  // without dragging the overall win-rate below the product targets.
  const averageStrength =
    selectedCompetitors.reduce(
      (sum, competitor) => sum + competitor.strength,
      0,
    ) / selectedCompetitors.length;

  const simulationRows: (typeof schema.simulation.$inferInsert)[] = [];
  let latestWins = 0;

  for (const product of productRows) {
    for (const competitor of selectedCompetitors) {
      for (const model of models) {
        const probability = clamp(
          product.win / 100 +
            modelOffset[model] -
            (competitor.strength - averageStrength) * 0.5,
          0.04,
          0.96,
        );
        const productWon = Math.random() < probability;
        if (productWon) latestWins += 1;
        const productScore = productWon ? between(58, 86) : between(28, 52);
        const competitorScore = productWon ? between(30, 55) : between(58, 84);
        simulationRows.push({
          id: id(),
          scanId: latestScanId,
          productId: product.id,
          competitorId: competitor.id,
          model,
          winner: productWon ? "product" : "competitor",
          reasoning: productWon ? pick(reasonsWin) : pick(reasonsLoss),
          productScore,
          competitorScore,
          createdAt: latestScanCreatedAt,
        });
      }
    }
  }

  const latestTotal = simulationRows.length;
  const latestLosses = latestTotal - latestWins;

  // Worst product drives the headline finding.
  const worst = [...productRows].sort((a, b) => a.win - b.win)[0];
  const worstFinding = {
    name: worst.title,
    missingAttributes: [
      "Product images",
      "Detailed specifications",
      "Structured data (schema.org)",
      "Customer reviews",
    ],
    impactDescription: `"${worst.title}" loses most AI comparisons because the listing has no images, a thin description, and no structured data. Adding rich media and specs is the single biggest win-rate opportunity in the catalog.`,
    lossPercentage: clamp(100 - worst.win, 60, 88),
  };

  await db.insert(schema.scan).values({
    id: latestScanId,
    userId,
    status: "completed",
    totalSimulations: latestTotal,
    completedSimulations: latestTotal,
    wins: latestWins,
    losses: latestLosses,
    topFinding: worstFinding,
    createdAt: latestScanCreatedAt,
    updatedAt: latestScanCreatedAt,
  });

  for (const part of chunk(simulationRows, 1000))
    await db.insert(schema.simulation).values(part);

  console.log(
    `Inserted latest scan + ${simulationRows.length} simulations (${latestWins}W / ${latestLosses}L = ${Math.round((latestWins / latestTotal) * 100)}%).`,
  );

  // --- Historical scans (trend line) -------------------------------------
  // Status "completed" so the dashboard trend/activity/insights populate.
  // Climb to just under the latest scan so the trend line peaks at "now".
  const historyRates = [30, 32, 34, 36, 38, 39, 40, 41, 42];
  const historyScans = historyRates.map((rate, index) => {
    const total = between(900, 1200);
    const wins = Math.round((rate / 100) * total);
    const createdAt = daysAgo(28 - index * 3, 4);
    return {
      id: id(),
      userId,
      status: "completed",
      totalSimulations: total,
      completedSimulations: total,
      wins,
      losses: total - wins,
      topFinding: {
        name: pick(productRows.filter((p) => p.win < 45)).title,
        missingAttributes: pick([
          ["Product images", "Structured data"],
          ["Detailed specifications", "Customer reviews"],
          ["Structured data (schema.org)", "Brand details"],
        ]),
        impactDescription:
          "Listings missing images and structured data continue to lose AI comparisons. Prioritize the lowest-win-rate products for optimization.",
        lossPercentage: between(55, 78),
      },
      createdAt,
      updatedAt: createdAt,
    };
  });

  await db.insert(schema.scan).values(historyScans);
  console.log(`Inserted ${historyScans.length} historical scans.`);

  // --- Listing optimizations (published + dismissed) ---------------------
  // Pending suggestions are computed live from low-win-rate products, so we
  // only persist a few "published" (with before/after lift) and "dismissed".
  const lowWinProducts = [...productRows].sort((a, b) => a.win - b.win);
  const published = lowWinProducts.slice(2, 6); // skip the 2 worst (leave pending)
  const dismissed = lowWinProducts.slice(6, 8);

  const optimizationRows: (typeof schema.listingOptimization.$inferInsert)[] =
    [];
  for (const product of published) {
    const before = product.win;
    const lift = clamp(55 - before, 8, 38);
    const publishedAt = daysAgo(between(2, 12));
    optimizationRows.push({
      id: id(),
      userId,
      productId: product.id,
      status: "published",
      proposedTitle: `${product.title} — ANC, 40H Battery, USB-C, 2-Year Warranty`,
      proposedDescription:
        "<p>Optimized listing with front-loaded specifications, expanded feature bullets, and schema.org structured data for AI shopping agents.</p><ul><li>Comprehensive technical specifications</li><li>Trust signals: warranty, returns, certifications</li><li>Six high-resolution product images</li></ul>",
      winRateBefore: before,
      estimatedLift: lift,
      winRateAfter: clamp(before + lift, 0, 99),
      publishedAt,
      createdAt: publishedAt,
      updatedAt: publishedAt,
    });
  }
  for (const product of dismissed) {
    const updatedAt = daysAgo(between(3, 9));
    optimizationRows.push({
      id: id(),
      userId,
      productId: product.id,
      status: "dismissed",
      proposedTitle: null,
      proposedDescription: null,
      winRateBefore: null,
      estimatedLift: null,
      winRateAfter: null,
      publishedAt: null,
      createdAt: updatedAt,
      updatedAt,
    });
  }

  await db.insert(schema.listingOptimization).values(optimizationRows);
  console.log(
    `Inserted ${optimizationRows.length} listing optimizations (${published.length} published, ${dismissed.length} dismissed).`,
  );

  // --- UCP profile -------------------------------------------------------
  const ucpJson = JSON.stringify(
    {
      "@context": "https://ucp.ai/schema",
      "@type": "Merchant",
      name: "Écentic",
      description:
        "Premium consumer electronics and audio — headphones, speakers, chargers, and smart home devices designed for everyday life.",
      logo: `https://${domain}/logo.png`,
      paymentMethods: [
        "Visa",
        "Mastercard",
        "American Express",
        "Apple Pay",
        "Shop Pay",
        "PayPal",
      ],
      shippingPolicy:
        "Free 2-day shipping on orders over $50. Ships to US, CA, UK, EU.",
      returnPolicy:
        "30-day free returns. 2-year warranty on all audio products.",
      contact: { email: "contact@ecentic.ai" },
      sustainability:
        "Recycled-aluminium bodies, plastic-free packaging, and a free trade-in recycling program.",
      certifications: ["FCC", "CE", "UL", "RoHS"],
      catalog: {
        totalProducts: productRows.length,
        topCategories: ["Headphones", "Speakers", "Chargers", "Smart Home"],
      },
    },
    null,
    2,
  );

  await db.insert(schema.ucpProfile).values({
    id: id(),
    userId,
    merchantName: "Écentic",
    description:
      "Premium consumer electronics and audio — headphones, speakers, chargers, and smart home devices designed for everyday life.",
    logoUrl: `https://${domain}/logo.png`,
    paymentMethods:
      "Visa, Mastercard, American Express, Apple Pay, Shop Pay, PayPal",
    shippingPolicy:
      "Free 2-day shipping on orders over $50. Ships to US, CA, UK, EU.",
    returnPolicy: "30-day free returns. 2-year warranty on all audio products.",
    contactEmail: "contact@ecentic.ai",
    sustainability:
      "Recycled-aluminium bodies, plastic-free packaging, and a free trade-in recycling program.",
    certifications: "FCC, CE, UL, RoHS",
    generatedJson: ucpJson,
    autoUpdate: true,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(0, 5),
  });
  console.log("Inserted UCP profile.");

  // --- Subscription ------------------------------------------------------
  await db.insert(schema.subscription).values({
    id: id(),
    userId,
    stripeCustomerId: `cus_demo_${crypto.randomUUID().slice(0, 12)}`,
    stripeSubscriptionId: `sub_demo_${crypto.randomUUID().slice(0, 12)}`,
    stripePriceId: "price_demo_dominate_monthly",
    plan: "dominate",
    status: "active",
    currentPeriodStart: daysAgo(18),
    currentPeriodEnd: daysAgo(-12), // 12 days in the future
    cancelAtPeriodEnd: false,
    createdAt: daysAgo(48),
    updatedAt: daysAgo(18),
  });
  console.log("Inserted subscription (dominate / active).");

  // --- Agent visits ------------------------------------------------------
  const weightedAgents = agentMix.flatMap((agent) =>
    Array.from({ length: agent.weight }, () => agent),
  );
  const TOTAL_VISITS = 920;
  const visitRows: (typeof schema.agentVisit.$inferInsert)[] = [];

  for (let visit = 0; visit < TOTAL_VISITS; visit += 1) {
    const agent = pick(weightedAgents);
    // Bias toward recent days (square distribution) to show growth.
    const dayOffset = Math.floor(29 * (1 - Math.random() ** 2));
    const product = Math.random() < 0.78 ? pick(productRows) : null;
    const pageType = product ? "product" : pick(pageTypes);
    const pageUrl = product
      ? product.url
      : pageType === "collection"
        ? `https://${domain}/collections/audio`
        : `https://${domain}/`;
    visitRows.push({
      id: id(),
      storeId,
      userId,
      productId: product?.id ?? null,
      externalProductId: product?.externalId ?? null,
      agentType: agent.type,
      agentCategory: agent.category,
      detectionMethod: agent.method,
      detectionLayer: agent.category === "referral" ? 2 : 1,
      pageUrl,
      pageType,
      referrer: "referrer" in agent ? agent.referrer : null,
      userAgent: agent.ua,
      createdAt: daysAgo(dayOffset, between(0, 23)),
    });
  }

  for (const part of chunk(visitRows, 1000))
    await db.insert(schema.agentVisit).values(part);
  console.log(`Inserted ${visitRows.length} agent visits across 30 days.`);

  console.log("\n✅ Demo seed complete.");
  console.log(`   Login:    ${email}`);
  console.log(
    `   Password: ${password ?? "(unchanged — pass --password to reset)"}`,
  );
  console.log(`   Store:    ${domain} (${mode} mode)`);
  if (mode === "attach")
    console.log(
      "   Products are real & connected — published optimizations write to Shopify.",
    );
};

void seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Demo seed failed.");
    console.error(error);
    process.exit(1);
  });
