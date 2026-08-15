import { createAzure } from "@ai-sdk/azure";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/database";

/**
 * One-time backfill of `blog_post.faqs` for rows written before the column
 * existed.
 *
 * English comes from three places, in order: the `faqJsonLd` BabyLoveGrowth
 * ships with its newer articles, the hand-written pairs below for the older BLG
 * ones that have no FAQ block at all, and — for editorial posts — `seed.ts`,
 * which owns them and should be run first (`bun run db:seed`).
 *
 * Spanish is lifted from the translated FAQ prose already stored on the Spanish
 * row where one exists, and translated from English where it does not. Only
 * `faqs` (and the section the pairs came out of) is written: these Spanish
 * bodies are already reviewed, and re-running the whole article translation to
 * reach one field would risk them for nothing.
 *
 * Standalone by necessity — `server/app/blog` reaches `server/utils/ai`, whose
 * `@ai-sdk/rsc` and Sentry imports only resolve inside Next. BLG is read over
 * plain fetch and Azure is addressed directly, both mirroring what those
 * modules do.
 *
 * Re-runnable. Pass `--force` to redo rows that already have pairs; by default
 * they are left alone.
 *
 *   bun --env-file=.env.local scripts/backfill-blog-faqs.ts
 */

type Faq = { question: string; answer: string };

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

/**
 * BabyLoveGrowth started emitting `faqJsonLd` partway through our catalog, so
 * its three oldest articles carry no FAQ — not in the payload and not in the
 * body. These are written from each article's own claims, keyed by slug so a
 * re-ingest of the same post can carry them forward rather than re-derive them.
 */
const AUTHORED_BLG_FAQS: Record<string, readonly Faq[]> = {
  "ai-search-visibility": [
    {
      question: "What is AI search visibility?",
      answer:
        "The frequency and quality of your brand's citations in AI-generated answers — how often ChatGPT, Gemini, Perplexity, and Google AI Overviews name you as a source, not merely mention you in passing. It is measured by sampling a fixed prompt set across those surfaces rather than by a single ranking position.",
    },
    {
      question:
        "How do you measure AI visibility when there is no rank to check?",
      answer:
        "By citation-based sampling: run a frozen set of prompts across the major AI surfaces on a schedule, count how often your brand appears as a cited source, and score the sentiment and quality of each citation. A mention carrying a pricing caveat or a mixed-review flag can cost you more than no mention at all.",
    },
    {
      question: "Which AI platforms are worth tracking?",
      answer:
        "Start with the four that actually send commerce traffic — ChatGPT, Gemini, Perplexity, and Google AI Overviews. Adding surfaces past those raises the cost of a measurement program faster than it raises its accuracy, so widen only once the first four are stable.",
    },
    {
      question: "How do I connect AI citations to revenue?",
      answer:
        "Pair citation-share growth with branded search trends and conversion data from the pages AI cites. Neither signal proves attribution alone, but moving together across a quarter they build a defensible case — which is what a marketing team needs before it can fund the work.",
    },
    {
      question: "How long does an AI visibility pilot take to show results?",
      answer:
        "Plan on 90 days: measure a baseline, fix structured data and citation gaps on priority prompts, then re-sample. Running an [ecentic Scan](/sign-up) first surfaces your largest gaps in minutes, so the pilot starts against real numbers rather than a guess.",
    },
  ],
  "ga4-ai-traffic": [
    {
      question: "Why don't AI shopping agents recommend my Shopify products?",
      answer:
        "Feed data is the usual cause. Price and availability mismatches, missing GTINs, and disapproved items in Google Merchant Center make Gemini, ChatGPT, and Perplexity skip your products in favour of a competitor whose data is tighter. Fix the feed before anything else — no protocol or content work compensates for a feed an agent cannot trust.",
    },
    {
      question: "Which schema fields matter most for agent recommendations?",
      answer:
        "GTIN or MPN on every SKU, then shippingDetails and hasMerchantReturnPolicy on the product pages. Those are the fields agents read to decide whether an offer is complete enough to recommend, and they are the ones most often missing.",
    },
    {
      question: "How do I make AI agent traffic visible in GA4?",
      answer:
        "GA4 alone will not show it — many agent requests never run page JavaScript. Capture the visits server-side, group them by verified user agent, and attribute orders back through that server-side signal rather than expecting a client-side tag to catch the session.",
    },
    {
      question: "How long does it take to win agent traffic?",
      answer:
        "About 30 to 60 days on a focused plan: audit the Merchant Center feed in day one, populate identifiers in week one, add shipping and returns schema in week two, enable Shopify Agentic Storefronts in week three, and validate with simulation prompts in week four.",
    },
    {
      question: "How do I keep agent visibility from drifting?",
      answer:
        "Treat it like feed health, not a launch. Prices change, stock moves, and models update their selection behaviour, so re-run the simulation on your priority SKUs on a schedule and watch for the win rate slipping before the traffic does.",
    },
  ],
  "optimize-for-ai-overviews": [
    {
      question: "What is the single highest-impact fix for AI shopping agents?",
      answer:
        "Your Google Merchant Center feed. Agents read the feed before they read your product page, so resolving every GTIN mismatch, price error, and availability disapproval gates everything else you might do — feed accuracy decides inclusion, and nothing downstream recovers from a feed that fails it.",
    },
    {
      question: "What are conversational attributes and why do they matter?",
      answer:
        'Q&A entries in the feed that answer the questions shoppers actually ask an assistant — the "Can I…?" and "Will this work if…?" queries. Agents match against them directly, so they lift selection in a way generic marketing copy does not.',
    },
    {
      question: "Which SKUs should I optimize first?",
      answer:
        "The ones where revenue and competition overlap: high-margin products in categories where an agent has several near-identical options to choose between. Those are the comparisons a small data improvement can flip.",
    },
    {
      question: "How do I know whether a listing change actually worked?",
      answer:
        "Record a baseline agent-selection rate before you ship, then re-measure after. Running a Universal Commerce Protocol simulation on your top 10 SKUs gives you that baseline — you can pressure-test your agent surface with the [free UCP validator](/ucp-validator).",
    },
    {
      question: "Is this the same as SEO for AI Overviews?",
      answer:
        "Related, but not the same logic. Traditional SEO optimizes a page for a ranking; AI shopping agent optimization makes structured product data complete and current enough to be selected. The page still matters, but the feed is what gates you in.",
    },
  ],
};

const isForced = process.argv.includes("--force");

/** Same `FAQPage` shape `Blog.parsePublishPayload` normalizes on the webhook. */
const faqJsonLdSchema = z.object({
  mainEntity: z.array(
    z.object({
      name: z.string(),
      acceptedAnswer: z.object({ text: z.string() }).nullish(),
    }),
  ),
});

const publishedFaqs = async (slug: string) => {
  const response = await fetch(
    `https://api.babylovegrowth.ai/api/integrations/v1/articles/by-slug/${encodeURIComponent(slug)}`,
    {
      headers: {
        "X-API-Key": process.env.BABYLOVEGROWTH_BLOG_API_KEY ?? "",
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) return undefined;

  const article = (await response.json()) as { faqJsonLd?: unknown };
  const parsed = faqJsonLdSchema.safeParse(article.faqJsonLd);
  if (!parsed.success) return undefined;

  const faqs = parsed.data.mainEntity
    .map((entry) => ({
      question: entry.name.trim(),
      answer: entry.acceptedAnswer?.text.trim() ?? "",
    }))
    .filter((faq) => faq.question && faq.answer);

  return faqs.length > 0 ? faqs : undefined;
};

/** The `gpt` seat, resolved the way `server/utils/ai.ts` resolves it. */
const gpt = createAzure({
  resourceName: process.env.AZURE_RESOURCE_NAME,
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: process.env.AZURE_API_VERSION,
})(
  process.env.AZURE_DEPLOYMENT_GPT ??
    process.env.AZURE_DEPLOYMENT_GPT4O ??
    "gpt",
);

const translateFaqs = async (faqs: readonly Faq[]) => {
  const { object } = await generateObject({
    model: gpt,
    schema: z.object({ faqs: z.array(faqSchema) }),
    schemaName: "SpanishBlogFaqs",
    system: `You translate ecommerce blog FAQ entries from English to Spanish (es-ES).

Rules:
- Keep the product name "ecentic" untranslated (lowercase as written). Keep ChatGPT, Claude, Gemini, Perplexity, Shopify, and WooCommerce untranslated.
- Keep the same count and order as the input array.
- Keep each question phrased as a question, and translate the answer in full — do not shorten or summarize.
- Preserve [label](url) links and **bold** markers exactly where the English uses them: translate the label, never the url.
- Never add Markdown the English source does not have, and never emit HTML.`,
    prompt: JSON.stringify(faqs),
  });

  // The English array is authoritative for length and order, so a model that
  // drops or invents a pair changes wording only — never the answer count.
  return faqs.map((faq, index) => ({
    question: object.faqs[index]?.question ?? faq.question,
    answer: object.faqs[index]?.answer ?? faq.answer,
  }));
};

const rowsFor = async (locale: "en" | "es") =>
  await db
    .select()
    .from(schema.blogPost)
    .where(eq(schema.blogPost.locale, locale));

const writeFaqs = async (
  id: string,
  faqs: readonly Faq[],
  sections?: typeof schema.blogPost.$inferSelect.sections,
) => {
  await db
    .update(schema.blogPost)
    .set({ faqs, ...(sections ? { sections } : {}), updatedAt: new Date() })
    .where(eq(schema.blogPost.id, id));
};

/**
 * Editorial posts used to end in a section of `**Question** Answer` prose. The
 * English copies move to the `faqs` column through `seed.ts`; their Spanish
 * translations only exist in the database, so they are lifted out of the stored
 * section rather than re-translated — the published Spanish is already reviewed,
 * and asking a model for it again would only introduce drift.
 */
const SPANISH_FAQ_TITLE = /preguntas\s+(m[áa]s\s+)?frecuentes/i;

const splitFaqProse = (content: string): Faq[] =>
  content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const match = block.match(/^\*\*(.+?)\*\*\s*([\s\S]+)$/);
      if (!match) return null;
      return {
        question: (match[1] ?? "").trim(),
        answer: (match[2] ?? "").trim(),
      };
    })
    .filter((faq): faq is Faq => Boolean(faq?.question && faq.answer));

const backfillEnglish = async () => {
  const rows = await rowsFor("en");

  for (const row of rows) {
    if (row.source !== "blg") {
      console.log(
        `[en] ${row.slug}: ${row.faqs.length} pair(s) from seed.ts — skipped`,
      );
      continue;
    }

    if (row.faqs.length > 0 && !isForced) {
      console.log(`[en] ${row.slug}: already has ${row.faqs.length} — skipped`);
      continue;
    }

    const published = await publishedFaqs(row.slug);
    const faqs = published ?? AUTHORED_BLG_FAQS[row.slug];

    if (!faqs) {
      console.log(`[en] ${row.slug}: no faqJsonLd and nothing authored — SKIP`);
      continue;
    }

    await writeFaqs(row.id, faqs);
    console.log(
      `[en] ${row.slug}: wrote ${faqs.length} (${published ? "faqJsonLd" : "authored"})`,
    );
  }
};

const backfillSpanish = async () => {
  const english = new Map(
    (await rowsFor("en")).map((row) => [row.slug, row] as const),
  );

  for (const row of await rowsFor("es")) {
    const source = english.get(row.slug);

    if (!source?.faqs.length) {
      console.log(`[es] ${row.slug}: no English pairs to translate — skipped`);
      continue;
    }

    if (row.faqs.length > 0 && !isForced) {
      console.log(`[es] ${row.slug}: already has ${row.faqs.length} — skipped`);
      continue;
    }

    const stored = row.sections.find((section) =>
      SPANISH_FAQ_TITLE.test(section.title),
    );
    const lifted = stored ? splitFaqProse(stored.content) : [];
    // Only trust the lift when it recovers every English pair — a partial parse
    // would silently publish a shorter Spanish FAQ than the English one.
    const useLifted = lifted.length === source.faqs.length;
    const remaining = stored
      ? row.sections.filter((section) => section !== stored)
      : undefined;

    if (useLifted) {
      await writeFaqs(row.id, lifted, remaining);
      console.log(`[es] ${row.slug}: lifted ${lifted.length} from sections`);
      continue;
    }

    const translated = await translateFaqs(source.faqs);

    await writeFaqs(row.id, translated, remaining);
    console.log(
      `[es] ${row.slug}: translated ${translated.length}${
        stored ? ` (dropped section "${stored.title}")` : ""
      }`,
    );
  }
};

const backfill = async () => {
  console.log(`Backfilling blog FAQs${isForced ? " (--force)" : ""}...`);
  await backfillEnglish();
  await backfillSpanish();

  console.log("Done. Purge the blog cache so static pages pick this up.");
};

void backfill()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Blog FAQ backfill failed.");
    console.error(error);
    process.exit(1);
  });
