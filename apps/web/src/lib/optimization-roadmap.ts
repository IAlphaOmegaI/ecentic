/**
 * Research-backed outlook for how long AI-agent optimization takes to move
 * the needle — used by the Optimize dashboard "What to expect" chart.
 *
 * Sources in-repo:
 * - `docs/context/idea.md` — follow-up simulation ~24h after publish; continuous
 *   sweeps (daily / every 6h); 14-day publish cooldown per product.
 * - `docs/context/strategy.md` — activation within 14 days; first 90 days
 *   determine retention; agent traffic still early but growing fast.
 * - `docs/context/agent-visibility.md` — ChatGPT/Perplexity/Google ingest via
 *   Shopify Catalog, Merchant Center feeds, and crawls (days–weeks to reindex).
 * - DUA Flavours (customer-confirmed, 3 Sep 2026): visits from AI assistants
 *   and direct traffic +12% between April and July 2026. A visits figure; no
 *   sales figure or 30-day window was confirmed.
 * - `docs/tasks/audit-optimization-engine-rewrite.md` — win-rate threshold 55%,
 *   14-day cooldown, simulation-derived lift today.
 *
 * Timelines are intentionally faster than classic SEO: listing writes and
 * simulation lift are near-term; storefront agent traffic compounds over months.
 */

export type RoadmapPhaseId = "foundation" | "traction" | "compound";

export type RoadmapPhase = {
  id: RoadmapPhaseId;
  title: string;
  window: string;
  weekStart: number;
  weekEnd: number;
  summary: string;
  outcomes: string[];
};

export type RoadmapWeek = {
  week: number;
  label: string;
  winRate: number;
  listingsOptimized: number;
  surfacesLive: number;
  agentSignals: number;
  phaseId: RoadmapPhaseId;
};

export type RoadmapInput = {
  baselineWinRate: number;
  averageLift: number;
  pendingCount: number;
  publishedCount: number;
  productCount: number;
  /** First published optimization — anchors the "Today" marker. */
  startedAt: Date | null;
};

export type RoadmapProjection = {
  weeks: RoadmapWeek[];
  phases: RoadmapPhase[];
  todayWeek: number;
  currentPhase: RoadmapPhase;
  baselineWinRate: number;
  targetWinRate: number;
  /** Days until simulated win-rate lift is typically visible. */
  firstSimulationDays: number;
  /** Days until storefront agent-traffic / sales signals typically appear. */
  firstTrafficDays: number;
  listingsInFlight: number;
  catalogCoverage: number;
};

const FOUNDATION_PHASE: RoadmapPhase = {
  id: "foundation",
  title: "Foundation",
  window: "Days 0–14",
  weekStart: 0,
  weekEnd: 2,
  summary:
    "Scan, rewrite weak listings, and ship structured data so agents can read you. Simulation win rate moves first — usually within 24–48 hours of publish.",
  outcomes: [
    "Approve pending listing rewrites (title + description)",
    "Publish JSON-LD / feed-ready attributes on key SKUs",
    "Re-scan confirms early win-rate lift vs competitors",
  ],
};

const TRACTION_PHASE: RoadmapPhase = {
  id: "traction",
  title: "Traction",
  window: "Weeks 2–6",
  weekStart: 2,
  weekEnd: 6,
  summary:
    "Agent surfaces re-ingest your catalog (Shopify Catalog, Merchant Center, crawlers). First real visit and referral signals typically show around day 30.",
  outcomes: [
    "ChatGPT / Claude / Gemini / Perplexity re-evaluate refreshed listings",
    "Agent visit beacons and referral clicks start compounding",
    "Customer case pattern: measurable visit + sales lift near 30 days",
  ],
};

const COMPOUND_PHASE: RoadmapPhase = {
  id: "compound",
  title: "Compound",
  window: "Months 2–6",
  weekStart: 6,
  weekEnd: 24,
  summary:
    "Catalog-wide coverage, competitor response loops, and model-drift re-optimization. Win rate approaches your estimated ceiling as more SKUs stay agent-ready.",
  outcomes: [
    "Continuous sweeps catch drift when models update",
    "Competitor listing changes trigger fresh battlecards",
    "Sustained agent traffic and attributed revenue grow with coverage",
  ],
};

export const ROADMAP_PHASES: RoadmapPhase[] = [
  FOUNDATION_PHASE,
  TRACTION_PHASE,
  COMPOUND_PHASE,
];

const TOTAL_WEEKS = 24;
const FIRST_SIMULATION_DAYS = 2;
const FIRST_TRAFFIC_DAYS = 30;
const MAX_TARGET_WIN_RATE = 88;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

const phaseForWeek = (week: number): RoadmapPhase => {
  const match = ROADMAP_PHASES.find(
    (phase) => week >= phase.weekStart && week < phase.weekEnd,
  );
  // Weeks at/after the final phase end land in Compound.
  return match ?? COMPOUND_PHASE;
};

const weekLabel = (week: number) => {
  if (week === 0) return "Now";
  if (week % 4 === 0) return `Month ${week / 4}`;
  return `W${String(week).padStart(2, "0")}`;
};

/**
 * Build a 6-month projected win-rate curve personalized to the store's current
 * baseline, estimated lift, and how far into the optimization loop they already are.
 */
export const buildOptimizationRoadmap = (
  input: RoadmapInput,
): RoadmapProjection => {
  const baselineWinRate = clamp(Math.round(input.baselineWinRate), 5, 95);
  const averageLift = clamp(input.averageLift, 4, 28);
  const productCount = Math.max(input.productCount, 1);
  const listingsInFlight = input.pendingCount + input.publishedCount;

  const coverageSeed = clamp(
    (input.publishedCount + input.pendingCount * 0.35) / productCount,
    0.12,
    1,
  );

  const targetWinRate = clamp(
    Math.round(baselineWinRate + averageLift * (0.55 + coverageSeed * 0.45)),
    baselineWinRate + 3,
    MAX_TARGET_WIN_RATE,
  );

  const todayWeek = (() => {
    if (!input.startedAt) return 0;
    const elapsedMs = Date.now() - input.startedAt.getTime();
    const elapsedWeeks = Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000));
    return clamp(elapsedWeeks, 0, TOTAL_WEEKS);
  })();

  const weeks: RoadmapWeek[] = Array.from(
    { length: TOTAL_WEEKS + 1 },
    (_, week) => {
      const phase = phaseForWeek(week);

      const winRate = (() => {
        // Foundation: sharp climb as published rewrites land in the next scan.
        if (week <= 2) {
          const progress = easeOutCubic(week / 2);
          return Math.round(
            baselineWinRate +
              (targetWinRate - baselineWinRate) * 0.42 * progress,
          );
        }

        // Traction: slower climb while agent indexes catch up (~30 day mark).
        if (week <= 6) {
          const foundation =
            baselineWinRate + (targetWinRate - baselineWinRate) * 0.42;
          const progress = easeOutCubic((week - 2) / 4);
          return Math.round(
            foundation + (targetWinRate - foundation) * 0.38 * progress,
          );
        }

        // Compound: asymptotic approach to the personalized ceiling.
        const traction =
          baselineWinRate +
          (targetWinRate - baselineWinRate) * (0.42 + 0.38 * 0.38);
        const progress = easeOutCubic((week - 6) / (TOTAL_WEEKS - 6));
        return Math.round(traction + (targetWinRate - traction) * progress);
      })();

      const listingsOptimized = Math.round(
        Math.min(
          productCount,
          listingsInFlight * 0.25 +
            productCount * coverageSeed * easeOutCubic(week / TOTAL_WEEKS),
        ),
      );

      const surfacesLive = (() => {
        if (week < 1) return 1;
        if (week < 3) return 2;
        if (week < 6) return 3;
        return 4;
      })();

      // Indexed agent-signal intensity — relative, not a promise of raw visits.
      const agentSignals = Math.round(
        8 +
          (week <= 4 ? week * 6 : 24 + (week - 4) * 11) *
            (0.7 + coverageSeed * 0.5),
      );

      return {
        week,
        label: weekLabel(week),
        winRate,
        listingsOptimized,
        surfacesLive,
        agentSignals,
        phaseId: phase.id,
      };
    },
  );

  const currentPhase = phaseForWeek(todayWeek);

  return {
    weeks,
    phases: ROADMAP_PHASES,
    todayWeek,
    currentPhase,
    baselineWinRate,
    targetWinRate,
    firstSimulationDays: FIRST_SIMULATION_DAYS,
    firstTrafficDays: FIRST_TRAFFIC_DAYS,
    listingsInFlight,
    catalogCoverage: Math.round(coverageSeed * 100),
  };
};
