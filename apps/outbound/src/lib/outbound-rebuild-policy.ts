import type { Playbook, SenderProfile } from "./outbound";

/** Exact section 7 proposals. These are never live defaults or approved examples. */
export const PROPOSED_REBUILD_PLAYBOOK = {
  subjectTemplate: "{queryTopic}",
  bodyTemplate:
    "Hey {first}!\n\n{opening}\n\n{result} {relevance}\n\n{founderLine} {callToAction}\n\n{optout}\n\n{signature}",
  founderLine:
    "I'm Iseld. I left Shopify Plus to start ecentic, where we help stores get picked when AI does the shopping.",
  productCheckIntro:
    "I'm Iseld. I left Shopify Plus to start ecentic, where we help stores get picked in answers like that.",
  callToAction: "Worth a quick chat?",
  optout: '(Reply "no" and I won\'t follow up.)',
  followupOneTemplate: "Bumping this!",
  followupOneDays: 3,
  followupTwoTemplate: "{first}?",
  followupTwoDays: 7,
  linkedinTemplate: "Hi {first}, {result} Would be good to connect.",
  voiceNotes:
    'Write as Iseld. English only. Aim for 70 to 90 words for the whole first email and never go over 99, counting greeting, opt-out and signature. Start with "Hey {first}!" on its own line.\n\nShape. (1) Opening, one sentence, 22 words at most: a short sender-side shopping reason tied to the product or category, running straight into the search that was actually run, with the query in quotes. (2) Result, one or two short sentences: who the answer named and where the store stood, exactly as the saved answer shows. (3) Relevance, one to three short sentences: why that search matters to this store, as plain reasoning and never as a measured effect. (4) The configured founder line and "Worth a quick chat?". (5) Opt-out and signature.\n\nThe owner allows a made-up shopping reason in the opening: a gift, an occasion, a relationship. Keep it short and vary it. Don\'t use the same relationship or occasion more than once in ten emails. It never describes a purchase, product use, a test, or anything about the recipient.\n\nEverything else is fact. The query in quotes is the exact query that ran. Brand names, order, prices and product details come from the saved answer and page, with their qualifiers. Write "when I asked" and "it picked": past tense, one search, one answer. Name Google\'s AI Mode only when that is where the query ran. Never say or imply lost sales, lost revenue, that AI can\'t see or read the store, that the store is invisible, or that a competitor took a sale. No percentages or statistics. No customer names or results.\n\nOne point per email. A product detail may appear once, as context. Two product details in a row is a recap and fails review.\n\nShort sentences, contractions, plain words. No jargon, no compliments, no booking links, bullets, emojis, links, or em or en dashes. No exclamation marks except the greeting and the fixed follow-up "Bumping this!". Don\'t explain what ecentic does beyond the founder line. Don\'t offer to send findings, a report, a comparison or more information. The ask is a conversation. The brand is always "ecentic".\n\nFollow-ups stay in the thread and are fixed text: "Bumping this!" on day 3 and "{first}?" on day 7. Nothing else goes in them.',
  humanizerNotes:
    'Read the draft out loud and cut anything a person wouldn\'t say to another person. Keep the sender-side shopping reason and make it run naturally into the search. Keep every fact, name, price, position and quoted query exactly as given. Never round, reorder, strengthen or soften a result, and never turn one answer into a general claim. Don\'t add pleasantries, compliments, a second ask, or a description of ecentic. Prefer "didn\'t come up" to "was absent", "picked" to "recommended", "asked" to "queried". Vary sentence length. No sentence over 25 words. Leave the configured founder line, "Worth a quick chat?", opt-out and signature unchanged.',
  researchInstructions:
    "For every lead, research one real product through the question a shopper would ask without knowing the brand. Build a natural 2 to 8 word question from the product's category plus one attribute or use supported by its title or rendered page. A use or occasion is optional. Ordinary product-title words are allowed; brand, model and product-line names and the merchant domain are not. Before buying a search, check that this exact product is an obvious candidate for that question. Run it on Google AI Mode and save the exact query, surface, time, full answer and cited links. Market, locale and signed-in state stay unknown unless the capture establishes them.\n\nThen record, from the full answer and its links: whether the store, its domain or the product appears; if so, in what position and how it is described; and the brands, retailers and products the answer names, with any prices shown. Record a position only for an explicitly numbered or ranked list. Grouped product cards have unknown overall order. A store counts as absent only when none of its names and not its domain appear anywhere in the full answer or its links. If the answer is cut off, blocked or unclear, that is not absence.\n\nIf the store is absent or listed after others, that is the finding. If the store is present and the answer gets its price, variant or details wrong against the rendered product page, that is the finding. If the store is present with unknown card order, or present, first and correct in an explicit ranking, run one broader category question. If it appears again without a supported discrepancy, save \"no gap found\" and hold the lead for another product or season. A product detail from the store's own page is context, not a finding.\n\nOpen the product page in a browser and read its visible text and its product data. A defect in the page's own data is a page finding: attribute it to the page and state any effect as a possibility. Never say an AI answer missed something unless a saved answer shows it.\n\nPrice and variant comparisons need the same product, variant, currency and purchase terms. A sale or cart discount is not automatically a mismatch. A competitor comparison needs a competitor page that was actually opened.\n\nCheckout is not tested; record it as unknown. A public UCP profile does not prove checkout works.\n\nNever invent a query, an answer, a result, a ranking, a purchase, product use, a lost sale or a checkout failure. Keep quotations, URLs, timestamps and unknowns in the receipt. The sender's made-up shopping reason is narrative copy for the opening only. It never goes in the receipt, in a verified personal line, or anywhere marked verified. An absence or ranking finding must be 7 days old or less when the email is approved. Older ones are re-run.",
  bannedPhrases:
    "following up; just checking in; circling back; touching base; I noticed; I came across; I was impressed; hope you're well; quick question; invisible; lost sales; losing sales; lost revenue; leaving money on the table; ROI; platform; AI-powered; AI visibility; SEO; optimize; streamline; thoughts?",
  relevanceLines: [
    "absence (everything else): That's the kind of search a new customer starts with.",
    "absence (gift products): Gift shoppers usually don't know your name yet. They just ask for {a category phrase}.",
    "outranked: The first couple of names in a list like that get the first look.",
    "comparison: If that's what shoppers see, they get the wrong {price or detail} before they reach your page.",
    "page data: AI shopping tools read that data when they compare options, so it may count against you.",
    "contrast (optional, only with a saved exact-name answer that is correct): By name, it got your {short product name} exactly right.",
  ],
  sentEmailExamples: "",
  maxBodyWords: 99,
  humanizeDrafts: true,
} as const;

/** Local draft only. Saved authors, profiles, examples and research remain explicit. */
export const rebuildWritingProposal = (settings: Playbook): Playbook => ({
  ...settings,
  subjectTemplate: PROPOSED_REBUILD_PLAYBOOK.subjectTemplate,
  bodyTemplate: PROPOSED_REBUILD_PLAYBOOK.bodyTemplate,
  followupOneTemplate: PROPOSED_REBUILD_PLAYBOOK.followupOneTemplate,
  followupTwoTemplate: PROPOSED_REBUILD_PLAYBOOK.followupTwoTemplate,
  followupOneDays: 3,
  followupTwoDays: 7,
  linkedinTemplate: PROPOSED_REBUILD_PLAYBOOK.linkedinTemplate,
  callToAction: PROPOSED_REBUILD_PLAYBOOK.callToAction,
  optout: PROPOSED_REBUILD_PLAYBOOK.optout,
  humanizerNotes: PROPOSED_REBUILD_PLAYBOOK.humanizerNotes,
  maxBodyWords: PROPOSED_REBUILD_PLAYBOOK.maxBodyWords,
  humanizeDrafts: PROPOSED_REBUILD_PLAYBOOK.humanizeDrafts,
  voiceNotes: PROPOSED_REBUILD_PLAYBOOK.voiceNotes.replace(
    "Write as Iseld.",
    "Write as the configured sender.",
  ),
  relevanceLines: [...PROPOSED_REBUILD_PLAYBOOK.relevanceLines],
  bannedPhrases: [
    ...new Set([
      ...settings.bannedPhrases
        .split(/[;\n]/)
        .map((phrase) => phrase.trim())
        .filter(Boolean),
      ...PROPOSED_REBUILD_PLAYBOOK.bannedPhrases
        .split(";")
        .map((phrase) => phrase.trim()),
    ]),
  ].join("\n"),
});

const heldReviewSenderEmail = "iseld@joinecentic.com";
const iseldBiography =
  "I'm Iseld. I left Shopify Plus to start ecentic, where we help stores ";
const hasHeldReviewIdentity = (
  identity: Pick<
    SenderProfile,
    "fromName" | "signature" | "founderLine" | "productCheckIntro"
  >,
) =>
  identity.fromName.trim() === "Iseld ecentic" &&
  identity.signature.trim() === "Iseld" &&
  [identity.founderLine, identity.productCheckIntro].every((line) =>
    line
      .trim()
      .replaceAll("’", "'")
      .replace(/\s+/g, " ")
      .startsWith(iseldBiography),
  );

/** Unapplied held-review copy only; the verified sender keeps the saved identity. */
export const rebuildHeldReviewWritingProposal = (
  settings: Playbook,
): Playbook => {
  const proposed = rebuildWritingProposal(settings);
  const profile = settings.senderProfiles.find(
    (candidate) => candidate.email.toLowerCase() === heldReviewSenderEmail,
  );
  const introductions = {
    founderLine: PROPOSED_REBUILD_PLAYBOOK.founderLine,
    productCheckIntro: PROPOSED_REBUILD_PLAYBOOK.productCheckIntro,
  };
  if (profile)
    return hasHeldReviewIdentity(profile)
      ? {
          ...proposed,
          senderProfiles: proposed.senderProfiles.map((candidate) =>
            candidate === profile
              ? { ...candidate, ...introductions }
              : candidate,
          ),
        }
      : proposed;
  return settings.fromEmail.toLowerCase() === heldReviewSenderEmail &&
    hasHeldReviewIdentity(settings)
    ? { ...proposed, ...introductions }
    : proposed;
};
