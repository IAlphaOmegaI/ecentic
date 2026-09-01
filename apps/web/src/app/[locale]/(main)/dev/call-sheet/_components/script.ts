/**
 * The cold-call script, as spoken.
 *
 * Hardcoded English on purpose. This is copy the rep tunes by ear between
 * calls; routing it through `messages/fragments/*.{en,es}.json` would turn
 * every wording tweak into a two-file, two-language edit plus a `typegen` and
 * an `i18n:check` run, for a page only ecentic staff can open. `/dev/*` is
 * already hardcoded English throughout.
 *
 * Everything here is a plain constant so `spec/call-script.test.ts` can assert
 * what is NOT in it — see {@link FORBIDDEN_CLAIMS}.
 */
import { formatPlanPrice } from "@/lib/agent-api";

export type Placeholders = {
  rep: string;
  contact: string;
  company: string;
  product: string;
  finding: string;
  email: string;
};

/**
 * Substitutes `{{token}}`. An unfilled token renders as its own fallback
 * rather than the raw braces, so a half-filled form never puts "{{contact}}"
 * in front of someone reading it aloud.
 */
export const fill = (template: string, values: Placeholders): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => {
    const value = values[token as keyof Placeholders];
    return value?.trim()
      ? value.trim()
      : FALLBACKS[token as keyof Placeholders];
  });

const FALLBACKS: Placeholders = {
  rep: "…",
  contact: "there",
  company: "your store",
  product: "product",
  finding: "what I found",
  email: "that address",
};

export type Block = {
  id: string;
  title: string;
  /** Guidance under the spoken lines — never read out. */
  note?: string;
  lines: string[];
  /** Blocks 4 and 5 stay shut; their moment is the prospect's question. */
  open: boolean;
};

export const BLOCKS: Block[] = [
  {
    id: "open",
    title: "1 · Open — keep the promise",
    note: "Under fifteen seconds. The honesty is the hook; don't soften it.",
    open: true,
    lines: [
      "Hi, this is {{rep}} from ecentic. I'm going to be straight with you, this is a cold call — do you want to give me thirty seconds or should I get out of your way?",
    ],
  },
  {
    id: "reason",
    title: "2 · The reason — one sentence, then stop",
    note: "One sentence. Then stop talking, even if the pause is uncomfortable.",
    open: true,
    lines: [
      "We check how ChatGPT and Gemini read a store's product data, and I ran yours before calling. There's something on the {{product}} page worth thirty seconds of your time.",
    ],
  },
  {
    id: "ask",
    title: "3 · Then ask about them, and shut up",
    note: "Any question that makes them think about their own business beats another sentence about ours. One-word answers by minute three — thank them and go.",
    open: true,
    lines: [
      "Before I get into it — who owns the product data on your side, you or an agency?",
      "How much of your traffic have you seen coming off AI tools this year?",
    ],
  },
  {
    id: "expansion",
    title: "4 · The expansion — only if they ask",
    note: "Their question is the signal to open this. Reaching for it unprompted is how the call turns into a pitch.",
    open: false,
    lines: [
      "Until recently, when someone wanted a product they searched for it themselves. Now they ask ChatGPT which one to buy. If AI doesn't understand your business correctly, it may not recommend you at all — and a competitor appears ahead of you not because their product is better, but because their data is better organised for the way AI selects information.",
      "That's what we do. So when someone asks an AI for a recommendation, your products are in the running.",
    ],
  },
  {
    id: "close",
    title: "5 · The close",
    note: "Getting the email confirmed is the win. The meeting comes off the back of the finding they read at their desk.",
    open: false,
    lines: [
      "Let me send you what I found on {{product}}. If it's useful, we'll do twenty minutes on the rest. Is {{email}} the right address?",
    ],
  },
];

/** Pinned under the script for the length of the call. */
export const DONTS: string[] = [
  "Don't demo.",
  "Don't quote a price unless asked.",
  'Don\'t say "we solve exactly that" when they describe the pain — say "that\'s actually why we started ecentic" and ask another question.',
];

export type Objection = {
  id: string;
  title: string;
  lines: string[];
  note?: string;
};

/**
 * Prices are read from `PLAN_CATALOG` (`lib/agent-api.ts`), the same constant
 * the public plans endpoint serves, so the rep and an agent can never be
 * quoted different numbers.
 */
export const objections = (values: Placeholders): Objection[] => [
  {
    id: "price-merchant",
    title: "“How much is it?” — merchant",
    note: "Answer it. Deflecting a direct price question costs more than the number does. Confirm the current tiers against the Shopify App Store listing before quoting — the listing is maintained separately from this constant.",
    lines: [
      `Compete is ${formatPlanPrice("compete")} a month for up to 100 products, Scale is ${formatPlanPrice("scale")} for up to 1,000. Month to month, no setup fee, no minimum. Most stores your size sit on Scale.`,
      `The reason I'd still take twenty minutes: ${values.finding.trim() || "what I found on your product data"}. Thursday 14:00 or Friday 10:00? I'll send the invite.`,
    ],
  },
  {
    id: "price-agency",
    title: "“How much is it?” — agency",
    note: "There is no agency number yet. Saying so plainly is the script — inventing one is a commitment somebody has to honour later.",
    lines: [
      "Depends on the shape, and I'd rather not guess. The variables are how many client workspaces you'd want live at once, whether reports go out with your branding, and whether you resell or refer.",
      "Rather than write novels back and forth — do you have five minutes today or tomorrow?",
    ],
  },
  {
    id: "shopify",
    title: "“Shopify already does this for free.”",
    note: "Say the one line, then name the finding. The finding is the whole answer.",
    lines: [
      "Shopify sends what's there. The question is what's there.",
      values.finding.trim()
        ? `On your store: ${values.finding.trim()}`
        : "Run the scan first — this answer is only as good as the finding you name next.",
    ],
  },
  {
    id: "seo",
    title: "“We already do SEO.”",
    lines: [
      "This isn't the Google surface. It's what a model returns when nobody's looking at a ranking.",
    ],
  },
];

/**
 * Claims that must never appear on this page. Enforced by
 * `server/spec/call-script.test.ts`, which greps this module and the findings
 * copy — the rep reads this screen out loud, and an unverifiable claim said on
 * a call is not recoverable.
 */
export const FORBIDDEN_CLAIMS: string[] = [
  "Flaviar",
  "Salsify",
  "Amazon Seller Central",
  "BigCommerce",
  "scheduled re-sync",
  "one-click publish",
  "revenue attribution",
  "SLA",
  "white-label it yourself",
];

/**
 * Sent instead of calling when the scan finds nothing. Asking them to name a
 * product is the cheapest way to earn the one fact that makes a call worth
 * making.
 */
export const NO_FINDING_EMAIL = {
  subject: "Quick question about {{company}}'s product data",
  body: [
    "Hi {{contact}},",
    "",
    "We look at how AI shopping assistants read a store's product data — what ChatGPT or Gemini can actually tell a shopper about a product, versus what's on the page.",
    "",
    "I ran {{company}} and didn't find anything worth interrupting you over, which is a decent sign. If you name one product you'd expect to win on, I'll check that one specifically and send you what comes back.",
    "",
    "{{rep}}",
  ].join("\n"),
};
