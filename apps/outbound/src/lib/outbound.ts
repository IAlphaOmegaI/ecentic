import { resultify } from "@zenncore/utils";
import { getDomain } from "tldts";
import { z } from "zod";
import {
  DEFAULT_FINDING_COPY,
  FINDING_COPY_FIELDS,
  findingCopy,
  preservesControlledParagraphs,
  usesFindingFormula,
} from "./outbound-finding-copy";
import { productInsightSchema } from "./outbound-product-insight";
import { isExcludedRole, matchesRole } from "./outbound-roles";
import {
  DEFAULT_RESEARCH_INSTRUCTIONS,
  shoppingCopy,
  shoppingFindingSchema,
} from "./outbound-shopping-research";
import {
  LINKEDIN_STATUSES,
  type LinkedInStatus,
  type ProspectStatus,
} from "./outbound-status";

export {
  LINKEDIN_STATUSES,
  type LinkedInStatus,
  PROSPECT_STATUSES,
  type ProspectStatus,
} from "./outbound-status";

export const OUTCOME_KINDS = [
  "reply",
  "positive",
  "negative",
  "optout",
  "bounce",
  "meeting",
  "note",
] as const;
export const RELATIONSHIPS = [
  "cold",
  "warm",
  "event",
  "customer",
  "pilot",
  "partner",
  "investor",
  "enterprise",
  "competitor",
] as const;
export const EMAIL_STATUSES = [
  "unknown",
  "verified",
  "invalid",
  "catchAll",
  "guessed",
  "stale",
] as const;
export const TEMPLATE_VARIABLES = [
  "first",
  "name",
  "company",
  "product",
  "productFeature",
  "finding",
  "consequence",
  "askAbout",
  "personalLine",
  "founderLine",
  "callToAction",
  "optout",
  "signature",
] as const;

const text = z.string().trim();
const timestamp = z
  .union([z.string().datetime({ offset: true }), z.literal("")])
  .default("");
const optionalUrl = z
  .union([
    z
      .url()
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Use a public HTTP or HTTPS URL.",
      ),
    z.literal(""),
  ])
  .default("");

export const DEFAULT_HUMANIZER_NOTES =
  "Use the writer's real sent emails as the voice reference. State the useful observation directly. Remove staged openers, repeated conclusions, forced contrasts, inflated claims, generic sales language and decorative formatting. Prefer everyday words and varied sentence lengths. Keep intentional quirks from the examples. Preserve every supported fact and its uncertainty; never invent a detail to make the message sound personal.";

const findingText = text
  .min(1)
  .max(1000)
  .refine(
    (value) =>
      [...value.matchAll(/\{([^{}]+)\}/g)].every((match) =>
        ["reviewCount", "category", "productFeature"].includes(match[1] ?? ""),
      ),
    "Use only reviewCount, category or productFeature in finding wording.",
  );

export const playbookSchema = z
  .object({
    name: text.min(1).max(100),
    subjectTemplate: text.min(1).max(300),
    bodyTemplate: text.min(1).max(6000),
    followupOneTemplate: text.min(1).max(1000),
    followupTwoTemplate: text.min(1).max(1000),
    linkedinTemplate: text
      .max(3000)
      .default(
        "Hi {first}, I was looking at {product}. {finding} Would be good to connect.",
      ),
    voiceNotes: text
      .max(6000)
      .default(
        "Write as Juri, a founder speaking plainly to another operator. Use only supplied evidence. Be specific, brief and conversational.",
      ),
    humanizeDrafts: z.boolean().default(true),
    humanizerNotes: text.max(6000).default(DEFAULT_HUMANIZER_NOTES),
    researchInstructions: text
      .max(10000)
      .default(DEFAULT_RESEARCH_INSTRUCTIONS),
    requireShoppingEvidence: z.boolean().default(false),
    founderLine: text.min(1).max(500),
    productCheckIntro: text
      .min(1)
      .max(500)
      .default(
        "I'm Juri, a founder of ecentic. We check how AI shopping assistants understand and compare products.",
      ),
    callToAction: text.min(1).max(300),
    signature: text.min(1).max(100),
    fromName: text.min(1).max(100),
    fromEmail: z.email().max(254),
    senderEmails: text.max(4000).default(""),
    inactiveSenderEmails: text.max(4000).default(""),
    sentEmailExamples: text.max(12000).default(""),
    postalAddress: text.min(10).max(500),
    optout: text.min(1).max(300),
    weeklyTarget: z.number().int().min(1).max(10000),
    dailyCap: z.number().int().min(1).max(50),
    minGapMinutes: z.number().int().min(1).max(60),
    maxGapMinutes: z.number().int().min(1).max(120),
    followupOneDays: z.number().int().min(1).max(14),
    followupTwoDays: z.number().int().min(2).max(30),
    maxBodyWords: z.number().int().min(30).max(99),
    verificationDays: z.number().int().min(1).max(7),
    emailVerificationDays: z.number().int().min(1).max(30).default(7),
    allowedCountries: text.min(2).max(500),
    heldCountries: text.max(500),
    targetRoles: text.min(1).max(4000),
    excludedRoles: text.min(1).max(4000),
    excludedDomains: text.max(10000),
    excludedCompanies: text.max(10000).default(""),
    targetingNotes: text.max(10000).default(""),
    replyClaimNotes: text.max(6000).default(""),
    meetingBookingUrl: z
      .union([
        z.url().refine((value) => value.startsWith("https://")),
        z.literal(""),
      ])
      .default(""),
    firstEmailBlockedClaims: text.max(4000).default(""),
    bannedPhrases: text.max(4000),
    barcodeObservation: findingText.default(
      DEFAULT_FINDING_COPY.barcodeObservation,
    ),
    barcodeConsequence: findingText.default(
      DEFAULT_FINDING_COPY.barcodeConsequence,
    ),
    barcodeAskAbout: findingText.default(DEFAULT_FINDING_COPY.barcodeAskAbout),
    reviewsObservation: findingText.default(
      DEFAULT_FINDING_COPY.reviewsObservation,
    ),
    reviewsConsequence: findingText.default(
      DEFAULT_FINDING_COPY.reviewsConsequence,
    ),
    reviewsAskAbout: findingText.default(DEFAULT_FINDING_COPY.reviewsAskAbout),
    noBarcodeObservation: findingText.default(
      DEFAULT_FINDING_COPY.noBarcodeObservation,
    ),
    noBarcodeConsequence: findingText.default(
      DEFAULT_FINDING_COPY.noBarcodeConsequence,
    ),
    noBarcodeAskAbout: findingText.default(
      DEFAULT_FINDING_COPY.noBarcodeAskAbout,
    ),
    noProductObservation: findingText.default(
      DEFAULT_FINDING_COPY.noProductObservation,
    ),
    noProductConsequence: findingText.default(
      DEFAULT_FINDING_COPY.noProductConsequence,
    ),
    noProductAskAbout: findingText.default(
      DEFAULT_FINDING_COPY.noProductAskAbout,
    ),
    publishedProductObservation: findingText.default(
      DEFAULT_FINDING_COPY.publishedProductObservation,
    ),
    publishedProductConsequence: findingText.default(
      DEFAULT_FINDING_COPY.publishedProductConsequence,
    ),
    publishedProductAskAbout: findingText.default(
      DEFAULT_FINDING_COPY.publishedProductAskAbout,
    ),
    automationEnabled: z.boolean().default(false),
    dailyCompanyTarget: z.number().int().min(1).max(10000).default(50),
    linkedinAutomationEnabled: z.boolean().default(false),
    linkedinAccountId: text.max(200).default(""),
    linkedinDailyInvites: z.number().int().min(1).max(15).default(15),
    linkedinWeeklyInvites: z.number().int().min(1).max(50).default(50),
    linkedinDailyMessages: z.number().int().min(1).max(15).default(15),
    senderConfirmed: z.boolean(),
    historyConfirmed: z.boolean().default(false),
    allowIncompleteHistory: z.boolean().default(false),
    competingSendersPaused: z.boolean().default(false),
    senderTested: z.boolean().default(false),
    sendingEnabled: z.boolean(),
  })
  .refine(
    (settings) =>
      splitList(settings.senderEmails || settings.fromEmail).every(
        (email) => z.email().max(254).safeParse(email).success,
      ),
    {
      path: ["senderEmails"],
      message: "Use a valid email address for every sender inbox.",
    },
  )
  .refine(
    (settings) => {
      const inactive = splitList(settings.inactiveSenderEmails).map((email) =>
        email.toLowerCase(),
      );
      const active = splitList(settings.senderEmails || settings.fromEmail).map(
        (email) => email.toLowerCase(),
      );
      return inactive.every(
        (email) =>
          z.email().max(254).safeParse(email).success &&
          !active.includes(email),
      );
    },
    {
      path: ["inactiveSenderEmails"],
      message:
        "Saved inactive inboxes must be valid addresses outside the active sender pool.",
    },
  )
  .refine((settings) => settings.maxGapMinutes >= settings.minGapMinutes, {
    path: ["maxGapMinutes"],
    message: "Maximum gap must be at least the minimum gap.",
  })
  .refine((settings) => settings.followupTwoDays > settings.followupOneDays, {
    path: ["followupTwoDays"],
    message: "The second follow-up must come after the first.",
  });

export type Playbook = z.infer<typeof playbookSchema>;

/** An explicit repeat-contact decision does not claim that old history was imported. */
export const contactHistoryReady = (settings: {
  historyConfirmed: boolean;
  allowIncompleteHistory?: boolean;
}) => settings.historyConfirmed || settings.allowIncompleteHistory === true;
export const defaultPlaybook: Playbook = {
  ...DEFAULT_FINDING_COPY,
  name: "ecentic outbound",
  subjectTemplate: "{product}",
  bodyTemplate:
    "Hi {first}!\n\n{personalLine}\n\nI was looking at {product} on your site. {finding}\n\n{founderLine} {callToAction}\n\n({optout})\n\n{signature}",
  followupOneTemplate: "Bumping this!",
  followupTwoTemplate: "{first}?",
  linkedinTemplate:
    "Hi {first}, I was looking at {product}. {finding} Would be good to connect.",
  voiceNotes:
    "Write as Juri, a founder speaking plainly to another operator. Use only supplied evidence. Be specific, brief and conversational.",
  humanizeDrafts: true,
  humanizerNotes: DEFAULT_HUMANIZER_NOTES,
  researchInstructions: DEFAULT_RESEARCH_INSTRUCTIONS,
  requireShoppingEvidence: false,
  founderLine: "I'm Juri, founder of ecentic, and we help fix gaps like this.",
  productCheckIntro:
    "I'm Juri, a founder of ecentic. We check how AI shopping assistants understand and compare products.",
  callToAction: "Worth a quick chat?",
  signature: "Juri",
  fromName: "Juri ecentic",
  fromEmail: "xhuri@joinecentic.com",
  senderEmails: "",
  inactiveSenderEmails: "",
  sentEmailExamples: "",
  postalAddress: "ecentic, 440 N Wolfe Rd, Sunnyvale, CA 94085, USA",
  optout: 'Reply "no" and I won\'t follow up.',
  weeklyTarget: 50,
  dailyCap: 15,
  minGapMinutes: 12,
  maxGapMinutes: 28,
  followupOneDays: 3,
  followupTwoDays: 7,
  maxBodyWords: 99,
  verificationDays: 7,
  emailVerificationDays: 7,
  allowedCountries: "US",
  heldCountries: "DE, AT, CH, FR, ES, IT, NL, GB",
  targetRoles:
    "Head of E-commerce\nE-commerce Manager\nHead of Growth\nCMO\nVP Marketing\nHead of Marketing\nDirector of Marketing\nMarketing Manager\nFounder\nCo-Founder\nCEO\nOwner\nManaging Director",
  excludedRoles:
    "intern\nrecruiter\nHR\nhuman resources\nadvisor\ninvestor\nformer\nCTO\ndeveloper\nengineer\ncustomer service\naccountant\nstudent",
  excludedDomains:
    "ecentic.ai\njoinecentic.com\nfeedonomics.com\nsyndigo.com\nrefibuy.com\nathenahq.ai\nrecomaze.ai",
  excludedCompanies: "",
  targetingNotes: "",
  replyClaimNotes: "",
  meetingBookingUrl: "",
  firstEmailBlockedClaims: "",
  bannedPhrases:
    "I hope this email finds you well\nI wanted to reach out\nQuick context\nbrutally honest\nwhen I googled\nValued Recipient\nDear customer\ngame-changer\nrevolutionize\nunlock\nleverage\nsynergy\ncircle back\nChatGPT, Gemini\nGTIN\nJSON-LD\nschema\nUCP\nGEO\nAEO\nMCP\ncrawler",
  senderConfirmed: false,
  automationEnabled: false,
  dailyCompanyTarget: 50,
  linkedinAutomationEnabled: false,
  linkedinAccountId: "",
  linkedinDailyInvites: 15,
  linkedinWeeklyInvites: 50,
  linkedinDailyMessages: 15,
  historyConfirmed: false,
  allowIncompleteHistory: false,
  competingSendersPaused: false,
  senderTested: false,
  sendingEnabled: false,
};

export const prospectSchema = z.object({
  id: z.string().min(1).optional(),
  company: text.min(1).max(200),
  domain: text.min(3).max(253),
  website: optionalUrl,
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  platform: z
    .enum(["shopify", "woocommerce", "other", "unknown"])
    .default("unknown"),
  relationship: z.enum(RELATIONSHIPS).default("cold"),
  name: text.min(1).max(200),
  first: text.max(100).default(""),
  title: text.max(200).default(""),
  email: z.union([z.email().max(254), z.literal("")]).default(""),
  linkedinUrl: optionalUrl,
  roleSource: optionalUrl,
  roleCheckedAt: timestamp,
  timezone: text.max(100).default(""),
  emailStatus: z.enum(EMAIL_STATUSES).default("unknown"),
  emailVerifiedAt: timestamp,
  emailSource: text.max(500).default(""),
  mxProvider: z
    .enum(["google", "microsoft", "other", "unknown"])
    .default("unknown"),
  mxCheckedAt: timestamp,
  product: text.max(300).default(""),
  productUrl: optionalUrl,
  gap: text.max(200).default(""),
  finding: text.max(2000).default(""),
  productInsight: productInsightSchema.nullish(),
  evidence: text.max(10000).default(""),
  evidenceCheckedAt: timestamp,
  findingReviewed: z.boolean().default(false),
  automationEvidenceId: z.union([z.string().uuid(), z.literal("")]).default(""),
  automationRefreshId: z.union([z.string().uuid(), z.literal("")]).default(""),
  shoppingResearchId: z.union([z.string().uuid(), z.literal("")]).default(""),
  shoppingFinding: shoppingFindingSchema.nullish(),
  productCategory: text.max(100).default(""),
  reviewCount: text.regex(/^\d*$/).max(10).default(""),
  distributionSource: optionalUrl,
  personalLine: text.max(1000).default(""),
  personalSource: optionalUrl,
  personalPublishedAt: timestamp,
  personalCheckedAt: timestamp,
  legitEvidence: text.max(2000).default(""),
  source: text.max(500).default("manual"),
  notes: text.max(5000).default(""),
  lang: z.enum(["en", "de", "es", "it"]).default("en"),
});
export type ProspectInput = z.infer<typeof prospectSchema>;

export type Message = {
  step: 1 | 2 | 3;
  afterDays: number;
  subject: string;
  body: string;
};
export type Issue = { code: string; field: string };
export type Prospect = ProspectInput & {
  id: string;
  campaignId?: string | null;
  senderEmail: string;
  sentStep: number;
  sentFirstMessage: Message | null;
  sentPostalAddress: string | null;
  companyId: string;
  personId: string;
  status: ProspectStatus;
  messages: Message[];
  revision: number;
  approvedAt: string | null;
  approvedBy: string | null;
  approvalHash: string | null;
  playbookRevision: number;
  holdReason: string;
  linkedinStatus: LinkedInStatus;
  linkedinDraft: string;
  linkedinNextActionAt: string | null;
  linkedinNote: string;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  issues: Issue[];
};
export type Activity = {
  id: string;
  prospectId: string | null;
  kind: string;
  detail: string;
  actor: string;
  createdAt: string;
};
export type Suppression = {
  id: string;
  scope: "email" | "domain";
  value: string;
  reason: string;
  createdAt: string;
};
export const mailboxConnected = (inbox: {
  transport?: "gmail-oauth" | "google-app-password";
  refreshToken?: string | null;
  appPassword?: string | null;
}) =>
  inbox.transport === "google-app-password"
    ? Boolean(inbox.appPassword)
    : Boolean(inbox.refreshToken);

export type Inbox = {
  transport: "gmail-oauth" | "google-app-password";
  id: string;
  email: string;
  fromName: string;
  signer: string;
  enabled: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  dailyCap: number;
  nextSendAt: string | null;
};

export const splitList = (value: string) => [
  ...new Set(
    value
      .split(/[\n,;]/)
      .map((entry) => entry.trim())
      .filter(Boolean),
  ),
];
export const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;

/** Public suffixes keep different companies under co.uk/private hosting domains separate. */
export const normalizeDomain = (value: string) => {
  const parsed = z
    .url()
    .safeParse(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`,
    );
  if (!parsed.success) return "";
  const url = new URL(parsed.data);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    return "";
  return getDomain(url.hostname, { allowPrivateDomains: true }) ?? "";
};

const escapeExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsPhrase = (value: string, phrase: string) =>
  new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeExpression(phrase)}(?:$|[^\\p{L}\\p{N}])`,
    "iu",
  ).test(value);

export const templateIssues = (value: string): Issue[] => {
  const unknown = [...value.matchAll(/\{([^{}]+)\}/g)].filter(
    (match) => !TEMPLATE_VARIABLES.some((variable) => variable === match[1]),
  );
  return unknown.map((match) => ({
    code: "unknownVariable",
    field: match[1] ?? "template",
  }));
};

const renderDraft = (prospect: ProspectInput, settings: Playbook) => {
  const copy =
    prospect.gap === "shopping-research"
      ? shoppingCopy(prospect)
      : usesFindingFormula(settings)
        ? findingCopy(prospect, settings)
        : null;
  const variables: Record<(typeof TEMPLATE_VARIABLES)[number], string> = {
    first: prospect.first || "there",
    name: prospect.name,
    company: prospect.company,
    product: prospect.product,
    productFeature: prospect.productInsight?.feature ?? "{productFeature}",
    finding: copy?.finding ?? prospect.finding,
    consequence: copy?.consequence ?? "{consequence}",
    askAbout: copy?.askAbout ?? "{askAbout}",
    personalLine: prospect.personalLine,
    founderLine: ["product-published-data", "shopping-research"].includes(
      prospect.gap,
    )
      ? settings.productCheckIntro
      : settings.founderLine,
    callToAction: settings.callToAction,
    optout: settings.optout,
    signature: settings.signature,
  };
  const render = (template: string, personalLine = prospect.personalLine) =>
    template
      .replace(/\{([^{}]+)\}/g, (original, variable: string) =>
        variable === "personalLine"
          ? personalLine
          : (variables[variable as keyof typeof variables] ?? original),
      )
      .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n")
      .trim();
  const subject = render(settings.subjectTemplate);
  const withPersonalLine = render(settings.bodyTemplate);
  const personalLine =
    settings.bodyTemplate.includes("{personalLine}") &&
    countWords(withPersonalLine) <= settings.maxBodyWords
      ? prospect.personalLine
      : "";
  const messages: Message[] = [
    {
      step: 1,
      afterDays: 0,
      subject,
      body: render(settings.bodyTemplate, personalLine),
    },
    {
      step: 2,
      afterDays: settings.followupOneDays,
      subject: `Re: ${subject}`,
      body: render(settings.followupOneTemplate),
    },
    {
      step: 3,
      afterDays: settings.followupTwoDays,
      subject: `Re: ${subject}`,
      body:
        !prospect.first && settings.followupTwoTemplate.trim() === "{first}?"
          ? "Worth a chat?"
          : render(settings.followupTwoTemplate),
    },
  ];
  return { messages, personalLine };
};

export const renderMessages = (prospect: ProspectInput, settings: Playbook) =>
  renderDraft(prospect, settings).messages;

/** The optional opening is the only content omitted to meet the saved word limit. */
export const personalLineForDraft = (
  prospect: ProspectInput,
  settings: Playbook,
) => renderDraft(prospect, settings).personalLine;

export const lintMessages = (
  messages: Message[],
  settings: Playbook,
  prospect?: ProspectInput,
): Issue[] =>
  messages.flatMap((message) => {
    const field = `message${message.step}`;
    const content = `${message.subject}\n${message.body}`;
    const copy =
      prospect?.gap === "shopping-research"
        ? shoppingCopy(prospect)
        : prospect && usesFindingFormula(settings)
          ? findingCopy(prospect, settings)
          : null;
    const rendered = prospect
      ? (renderMessages(prospect, settings)[0]?.body ?? "")
      : "";
    const original =
      prospect &&
      (usesFindingFormula(settings) || prospect.gap === "shopping-research")
        ? rendered
        : "";
    const greeting = prospect
      ? rendered.match(/^[^!\n]+!/)?.[0]
      : message.body.match(/^(?:Hi|Hallo|Hola|Ciao|Buongiorno) [^!\n]+!/)?.[0];
    return [
      ...(message.step === 1 &&
      (usesFindingFormula(settings) || prospect?.gap === "shopping-research") &&
      prospect &&
      (!copy ||
        (prospect.gap === "shopping-research" &&
          (!original.includes(copy.finding) ||
            !message.body.includes(copy.finding))) ||
        !preservesControlledParagraphs(
          message.body,
          original,
          prospect.gap === "shopping-research"
            ? Object.values(copy).filter((phrase) => original.includes(phrase))
            : Object.values(copy),
        ))
        ? [{ code: "findingCopyChanged", field }]
        : []),
      ...(message.step === 1 &&
      usesFindingFormula(settings) &&
      prospect &&
      !preservesControlledParagraphs(message.body, original, [
        ["product-published-data", "shopping-research"].includes(prospect.gap)
          ? settings.productCheckIntro
          : settings.founderLine,
        settings.callToAction,
      ])
        ? [{ code: "templateControlsChanged", field }]
        : []),
      ...(message.step === 1 &&
      (splitList(settings.firstEmailBlockedClaims).some((phrase) =>
        containsPhrase(content, phrase),
      ) ||
        /\d[\d.,]*\s*(?:%|percent\b)/i.test(content))
        ? [{ code: "claimNotAllowed", field }]
        : []),
      ...(!message.body.trim() || !message.subject.trim()
        ? [{ code: "emptyMessage", field }]
        : []),
      ...(message.step === 1 &&
      (countWords(message.subject) < 2 || countWords(message.subject) > 5)
        ? [{ code: "subjectLength", field }]
        : []),
      ...(message.step === 1 && countWords(message.body) > settings.maxBodyWords
        ? [{ code: "wordLimit", field }]
        : []),
      ...(/[{}]|\[name\]|\bTODO\b/i.test(content)
        ? [{ code: "unresolvedVariable", field }]
        : []),
      ...(/[\u2013\u2014]|&[mn]dash;|&#821[12];/.test(content)
        ? [{ code: "dash", field }]
        : []),
      ...(/https?:\/\/|www\.|\bcal\.com\b/i.test(content)
        ? [{ code: "link", field }]
        : []),
      ...(/^\s*[-*•]\s/m.test(message.body) ? [{ code: "bullet", field }] : []),
      // Text-style legal marks occur in product names; emoji presentation remains disallowed.
      ...(/(?:[©®™]\uFE0F|(?![©®™])\p{Extended_Pictographic})/u.test(content)
        ? [{ code: "emoji", field }]
        : []),
      ...(splitList(settings.bannedPhrases).some((phrase) =>
        containsPhrase(content, phrase),
      )
        ? [{ code: "bannedPhrase", field }]
        : []),
      ...(message.step === 1 && !message.body.includes(settings.optout)
        ? [{ code: "optoutMissing", field }]
        : []),
      ...(message.step === 1 &&
      !message.body.trim().endsWith(settings.signature)
        ? [{ code: "signatureMissing", field }]
        : []),
      ...(message.step === 1 &&
      /!/.test(
        greeting && message.body.startsWith(greeting)
          ? message.body.slice(greeting.length)
          : message.body,
      )
        ? [{ code: "exclamation", field }]
        : []),
    ];
  });

const fresh = (value: string, days: number, now: Date) => {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp <= now.getTime() + 60_000 &&
    now.getTime() - timestamp <= days * 86_400_000
  );
};

export const personalSourceReadyForDraft = (
  prospect: ProspectInput,
  settings: Playbook,
  now = new Date(),
) =>
  !personalLineForDraft(prospect, settings) ||
  Boolean(
    prospect.personalSource &&
      fresh(prospect.personalPublishedAt, 274, now) &&
      fresh(prospect.personalCheckedAt, 1, now) &&
      Date.parse(prospect.personalCheckedAt) >=
        Date.parse(prospect.personalPublishedAt),
  );

export const companyExcluded = (settings: Playbook, company: string) => {
  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const candidate = normalize(company);
  return (
    Boolean(candidate) &&
    splitList(settings.excludedCompanies).some(
      (name) => normalize(name) === candidate,
    )
  );
};

export const prospectIssues = (
  prospect: ProspectInput,
  settings: Playbook,
  now = new Date(),
): Issue[] => {
  const domain = normalizeDomain(prospect.domain);
  const emailDomain = normalizeDomain(prospect.email.split("@")[1] ?? "");
  const excluded = splitList(settings.excludedDomains).map(normalizeDomain);
  const role = prospect.title.toLowerCase();
  const allowed = splitList(settings.allowedCountries).map((country) =>
    country.toUpperCase(),
  );
  const held = splitList(settings.heldCountries).map((country) =>
    country.toUpperCase(),
  );
  const copy = usesFindingFormula(settings)
    ? findingCopy(prospect, settings)
    : null;
  return [
    ...(settings.requireShoppingEvidence &&
    (!prospect.shoppingResearchId ||
      !prospect.shoppingFinding ||
      prospect.gap !== "shopping-research")
      ? [{ code: "shoppingResearchRequired", field: "shoppingResearchId" }]
      : []),
    ...(usesFindingFormula(settings) &&
    !["shopify", "woocommerce"].includes(prospect.platform)
      ? [{ code: "platformHeld", field: "platform" }]
      : []),
    ...(usesFindingFormula(settings) &&
    (!copy ||
      !(prospect.gap === "shopping-research"
        ? Boolean(prospect.shoppingResearchId && prospect.shoppingFinding)
        : prospect.gap === "product-published-data"
          ? settings.automationEnabled && Boolean(prospect.automationEvidenceId)
          : prospect.findingReviewed) ||
      Object.values(copy).some((line) => /[{}]/.test(line)) ||
      (prospect.gap === "barcode-missing-from-page-data" &&
        !prospect.distributionSource))
      ? [{ code: "findingReviewRequired", field: "findingReviewed" }]
      : []),
    ...(companyExcluded(settings, prospect.company)
      ? [{ code: "excludedCompany", field: "company" }]
      : []),
    ...(!domain ? [{ code: "domainInvalid", field: "domain" }] : []),
    ...(emailDomain && emailDomain !== domain
      ? [{ code: "emailDomainMismatch", field: "email" }]
      : []),
    ...(prospect.productUrl && normalizeDomain(prospect.productUrl) !== domain
      ? [{ code: "productDomainMismatch", field: "productUrl" }]
      : []),
    ...(excluded.includes(domain) || excluded.includes(emailDomain)
      ? [{ code: "excludedCompany", field: "domain" }]
      : []),
    ...(prospect.relationship !== "cold"
      ? [{ code: "relationshipExcluded", field: "relationship" }]
      : []),
    ...(!allowed.includes(prospect.country) || held.includes(prospect.country)
      ? [{ code: "countryHeld", field: "country" }]
      : []),
    ...(!prospect.email ||
    prospect.emailStatus !== "verified" ||
    !prospect.emailSource ||
    !fresh(prospect.emailVerifiedAt, settings.emailVerificationDays, now)
      ? [{ code: "emailUnverified", field: "email" }]
      : []),
    ...(/^(?:info|hello|contact|support|sales|admin|office|team|careers|jobs|noreply|no-reply)@/i.test(
      prospect.email,
    )
      ? [{ code: "sharedInbox", field: "email" }]
      : []),
    ...(prospect.mxProvider === "microsoft"
      ? [{ code: "microsoftHeld", field: "mxProvider" }]
      : []),
    ...(prospect.mxProvider === "unknown" ||
    !fresh(prospect.mxCheckedAt, 1, now)
      ? [{ code: "mxUnknown", field: "mxProvider" }]
      : []),
    ...(!prospect.title ||
    !prospect.roleSource ||
    !fresh(prospect.roleCheckedAt, 30, now)
      ? [{ code: "roleUnverified", field: "title" }]
      : []),
    ...(isExcludedRole(role, splitList(settings.excludedRoles))
      ? [{ code: "roleExcluded", field: "title" }]
      : []),
    ...(!splitList(settings.targetRoles).some((targetRole) =>
      matchesRole(role, targetRole),
    )
      ? [{ code: "roleOutsideTarget", field: "title" }]
      : []),
    ...(!prospect.legitEvidence
      ? [{ code: "legitUnverified", field: "legitEvidence" }]
      : []),
    ...(!prospect.product ||
    !prospect.productUrl ||
    !prospect.finding ||
    !prospect.evidence ||
    !fresh(prospect.evidenceCheckedAt, settings.verificationDays, now)
      ? [{ code: "evidenceMissing", field: "product" }]
      : []),
    ...(personalLineForDraft(prospect, settings) &&
    (!prospect.personalSource ||
      !fresh(prospect.personalPublishedAt, 274, now) ||
      !fresh(prospect.personalCheckedAt, 274, now) ||
      Date.parse(prospect.personalCheckedAt) <
        Date.parse(prospect.personalPublishedAt))
      ? [{ code: "personalSourceMissing", field: "personalSource" }]
      : []),
    ...(!settings.senderConfirmed
      ? [{ code: "senderUnconfirmed", field: "senderConfirmed" }]
      : []),
    ...(!z.email().max(254).safeParse(settings.fromEmail).success
      ? [{ code: "senderDomain", field: "fromEmail" }]
      : []),
    ...(!isTimezone(prospect.timezone)
      ? [{ code: "timezoneMissing", field: "timezone" }]
      : []),
  ];
};

export const isTimezone = (timezone: string) =>
  Boolean(timezone) &&
  resultify(() =>
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(),
  ).success;

/** Monday–Thursday, 08:00 inclusive through 14:00 exclusive in the verified recipient zone. */
export const inSendWindow = (timezone: string, now = new Date()) => {
  if (!isTimezone(timezone)) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return (
    ["Mon", "Tue", "Wed", "Thu"].includes(weekday) && hour >= 8 && hour < 14
  );
};

export const draftSchema = z.object({
  prospect: z.string().min(1),
  revision: z.number().int().min(0),
  subject: text.min(1).max(300),
  body: text.min(1).max(6000),
  followupOne: text.min(1).max(1000),
  followupTwo: text.min(1).max(1000),
});
export const reviewSchema = z.object({
  prospect: z.string().min(1),
  revision: z.number().int().min(0),
  decision: z.enum(["approve", "hold", "skip", "review"]),
  reason: text.max(1000).default(""),
});
export const linkedinSchema = z.object({
  prospect: z.string().min(1),
  status: z.enum(LINKEDIN_STATUSES),
  draft: text.max(5000),
  nextActionAt: timestamp,
  note: text.max(2000).default(""),
});
export const outcomeSchema = z.object({
  prospect: z.string().min(1),
  kind: z.enum(OUTCOME_KINDS),
  note: text.max(5000).default(""),
});

export const senderPool = (settings: Playbook) =>
  [
    ...new Set(
      splitList(settings.senderEmails || settings.fromEmail).map((email) =>
        email.toLowerCase(),
      ),
    ),
  ].sort();

/** Saving a sender address explicitly authorizes connection, never delivery. */
export const registeredSender = (email: string, settings: Playbook) => {
  const normalized = email.trim().toLowerCase();
  return (
    z.email().max(254).safeParse(normalized).success &&
    [
      ...senderPool(settings),
      ...splitList(settings.inactiveSenderEmails).map((address) =>
        address.toLowerCase(),
      ),
    ].includes(normalized)
  );
};

/** Stable assignment is part of the approval; changing the configured pool revokes approval. */
export const senderFor = (prospect: string, settings: Playbook) => {
  const pool = senderPool(settings);
  const hash = [...prospect].reduce(
    (value, character) =>
      Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return pool[hash % pool.length] ?? settings.fromEmail.toLowerCase();
};

export const deliveredBody = (
  message: Message,
  original: Message,
  postalAddress: string,
) => {
  const first = `${original.body}\n\n${postalAddress}`;
  return message.step === 1
    ? first
    : `${message.body}\n\n${first
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}`;
};

export const draftSimilarityIssues = (
  messages: Message[],
  peers: Message[][],
  settings: Playbook,
): Issue[] => {
  const first = messages.find((message) => message.step === 1);
  if (!first) return [];
  const normalize = (value: string) =>
    value.toLowerCase().replace(/\s+/g, " ").trim();
  const sentences = (body: string) => {
    const personalized = [
      settings.founderLine,
      settings.callToAction,
      settings.optout,
      settings.signature,
      ...(usesFindingFormula(settings)
        ? [
            ...FINDING_COPY_FIELDS.flatMap((field) =>
              settings[field]
                .split(/\{(?:category|reviewCount)\}/g)
                .filter(Boolean),
            ),
            ...settings.bodyTemplate
              .split(/\{[^{}]+\}/g)
              .filter((part) => /\p{L}/u.test(part)),
          ]
        : []),
    ].reduce((value, phrase) => value.replaceAll(phrase, ""), body);
    return personalized
      .split(/[.!?\n]+/)
      .map(normalize)
      .filter((sentence) => countWords(sentence) >= 8);
  };
  const other = peers.flatMap((messages) =>
    messages.filter((message) => message.step === 1),
  );
  const repeated = new Set(other.flatMap((message) => sentences(message.body)));
  return [
    ...(other.some(
      (message) => normalize(message.subject) === normalize(first.subject),
    )
      ? [{ code: "duplicateSubject", field: "message1" }]
      : []),
    ...(sentences(first.body).some((sentence) => repeated.has(sentence))
      ? [{ code: "repeatedSentence", field: "message1" }]
      : []),
  ];
};
