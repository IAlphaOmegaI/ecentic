import { z } from "zod";
import {
  countWords,
  type Message,
  type Playbook,
  type ProspectInput,
} from "./outbound";
import type { ShoppingResearch } from "./outbound-shopping-research";

export const LEGACY_WRITING_CONTRACT_VERSION = "discovery-email-v1";
export const WRITING_CONTRACT_VERSION = "discovery-email-v2";
export const COPY_CRITERIA = [
  "openingFits",
  "resultCheckable",
  "reasonToCare",
  "founderTransition",
  "oneChatAsk",
  "naturalVoice",
] as const;

/** These are the only recipient-facing fragments a writer may supply. */
export const writerPartsSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    opening: z.string().trim().min(1).max(1200),
    result: z.string().trim().min(1).max(1600),
    relevance: z.string().trim().min(1).max(1400),
  })
  .strict();
export type WriterParts = z.infer<typeof writerPartsSchema>;
/** Historical reads preserve the original five fields and their hashes. */
export const legacyWriterPartsSchema = writerPartsSchema
  .extend({
    followupFact: z.string().trim().max(1200),
  })
  .strict();
export const storedWriterPartsSchema = z.union([
  legacyWriterPartsSchema,
  writerPartsSchema,
]);
export type StoredWriterParts = z.infer<typeof storedWriterPartsSchema>;

export const copyCriterionSchema = z
  .object({
    criterion: z.enum(COPY_CRITERIA),
    passed: z.boolean(),
    reason: z.string().trim().min(1).max(300),
  })
  .strict();

export const copyVerdictSchema = z
  .object({
    passed: z.boolean(),
    evaluatedAt: z.string().datetime(),
    deterministicIssues: z.array(z.string().min(1).max(1000)).max(100),
    criteria: z.array(copyCriterionSchema).max(COPY_CRITERIA.length),
  })
  .strict();
export type CopyVerdict = z.infer<typeof copyVerdictSchema>;

const hash = z.string().regex(/^[a-f0-9]{64}$/);

/** Optional on historical messages; populated only on a newly written revision. */
export const currentWritingSnapshotSchema = z
  .object({
    version: z.literal(WRITING_CONTRACT_VERSION),
    writingPolicyHash: hash,
    receiptHash: hash,
    contentHash: hash,
    compositionJobId: z.string().uuid().optional(),
    revision: z.number().int().nonnegative().nullable(),
    generatedAt: z.string().datetime(),
    parts: writerPartsSchema,
    queryTopic: z.string().trim().min(1).max(200),
    narrative: z
      .object({
        relationship: z.string().max(100).nullable(),
        occasion: z.string().max(100).nullable(),
      })
      .strict(),
    quality: copyVerdictSchema.nullable(),
  })
  .strict();
export const legacyWritingSnapshotSchema = currentWritingSnapshotSchema
  .extend({
    version: z.literal(LEGACY_WRITING_CONTRACT_VERSION),
    parts: legacyWriterPartsSchema,
  })
  .strict();
export const writingSnapshotSchema = z.discriminatedUnion("version", [
  currentWritingSnapshotSchema,
  legacyWritingSnapshotSchema,
]);
export type WritingSnapshot = z.infer<typeof writingSnapshotSchema>;
export type CurrentWritingSnapshot = z.infer<
  typeof currentWritingSnapshotSchema
>;
export const isCurrentWritingSnapshot = (
  writing: WritingSnapshot,
): writing is z.infer<typeof currentWritingSnapshotSchema> =>
  writing.version === WRITING_CONTRACT_VERSION;

/** Inferences are selected from approved policy; they are never stored as observations. */
export type RelevanceClaim = {
  type: "inference";
  id: string;
  value: string;
};

export const LEGACY_FOLLOWUP_BUMP = "Bumping this up in case it got buried.";
export const FOLLOWUP_BUMP = "Bumping this!";
export const finalFollowup = (first: string) =>
  first.trim() ? `${first.trim()}?` : "Worth a chat?";
const WRITER_LIMITS = { opening: 22, result: 30, relevance: 28 } as const;
const PART_VARIABLES = ["opening", "result", "relevance"] as const;
const FIXED_VARIABLES = [
  "founderLine",
  "callToAction",
  "optout",
  "signature",
] as const;
const COMPOSITION_VARIABLES = [
  "first",
  "name",
  "company",
  "product",
  "queryTopic",
  ...PART_VARIABLES,
  ...FIXED_VARIABLES,
] as const;
type CompositionVariable = (typeof COMPOSITION_VARIABLES)[number];
type Variables = Record<CompositionVariable, string>;
type AssemblyHold = { status: "held"; reason: string };
export type WriterBudget = {
  hardCap: number;
  fixedWords: number;
  availableWords: number;
  /** Combined opening, result and relevance words, excluding fixed text. */
  targetMinWords: number;
  targetMaxWords: number;
  partLimits: typeof WRITER_LIMITS;
};
type AssemblyReady = {
  status: "ready";
  budget: WriterBudget;
  queryTopic: string;
  founderLine: string;
};

const hold = (reason: string): AssemblyHold => ({ status: "held", reason });
const normalizeNewlines = (value: string) => value.replace(/\r\n?/g, "\n");
const tokens = (template: string) =>
  [...template.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1] ?? "");
const paragraphs = (value: string) =>
  normalizeNewlines(value)
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/** Plain text is never silently stripped or interpreted as HTML before hashing. */
const plainTextProblem = (value: string) => {
  if (/<\/?[a-z][^>]*>|<!|<\?/i.test(value))
    return "Messages and templates must contain plain text, without HTML.";
  if (
    [...normalizeNewlines(value)].some((character) => {
      const point = character.codePointAt(0) ?? 0;
      return (
        (point < 32 && point !== 10) ||
        (point >= 127 && point <= 159) ||
        /\p{Cf}/u.test(character)
      );
    })
  )
    return "Messages and templates contain an unsupported control character.";
  return null;
};

/** Decimal points stay inside sentences; fixed paragraphs are checked too. */
export const compositionSentences = (value: string) =>
  normalizeNewlines(value)
    .split(/(?<=[.!?])["'\u201d\u2019)]*(?:\s+|$)|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const sentenceProblem = (value: string) =>
  compositionSentences(value).some((sentence) => countWords(sentence) > 25)
    ? "A sentence exceeds 25 words, including the configured fixed text."
    : null;

/** Page findings use the page introduction; every supported answer finding uses the answer introduction. */
export const compositionFounderLine = (
  receipt: ShoppingResearch,
  settings: Playbook,
) => {
  switch (receipt.selected.kind) {
    case "product-data-gap":
      return settings.founderLine;
    case "query-comparison":
    case "discovery-absence":
    case "discovery-outranked":
      return settings.productCheckIntro;
    default:
      return null;
  }
};

/** A prompt hint only: the validated writer subject supplies the final queryTopic. */
export const queryTopicForReceipt = (receipt: ShoppingResearch) =>
  (
    receipt.queries[receipt.selected.queryIndex]?.basis?.category ||
    receipt.product.name
  )
    .trim()
    .toLowerCase();

const variablesFor = (
  prospect: ProspectInput,
  receipt: ShoppingResearch,
  settings: Playbook,
  parts?: WriterParts,
): Variables => ({
  first: prospect.first,
  name: prospect.name,
  company: prospect.company,
  product: receipt.product.name,
  queryTopic: parts?.subject || queryTopicForReceipt(receipt),
  opening: parts?.opening ?? "",
  result: parts?.result ?? "",
  relevance: parts?.relevance ?? "",
  founderLine: compositionFounderLine(receipt, settings) ?? "",
  callToAction: settings.callToAction,
  optout: settings.optout,
  signature: settings.signature,
});

const render = (template: string, variables: Variables) =>
  normalizeNewlines(template)
    .replace(/\{([^{}]+)\}/g, (original, key: string) =>
      Object.hasOwn(variables, key)
        ? variables[key as CompositionVariable]
        : original,
    )
    .trim();

const templateProblem = (
  name: string,
  template: string,
  variables: Variables,
  required: readonly CompositionVariable[],
  allowed: readonly CompositionVariable[],
) => {
  if (!template.trim()) return `The ${name} template is empty.`;
  const textProblem = plainTextProblem(template);
  if (textProblem) return textProblem;
  const placeholders = tokens(template);
  const unknown = placeholders.find(
    (placeholder) => !allowed.some((key) => key === placeholder),
  );
  if (unknown) return `The ${name} template cannot use {${unknown}}.`;
  if (/[{}]/.test(template.replace(/\{([^{}]+)\}/g, "")))
    return `The ${name} template contains an incomplete variable.`;
  const missing = required.find(
    (key) =>
      placeholders.filter((placeholder) => placeholder === key).length !== 1,
  );
  if (missing)
    return `The ${name} template must include {${missing}} exactly once.`;
  const empty = placeholders.find(
    (key) =>
      !PART_VARIABLES.some((part) => part === key) &&
      !variables[key as CompositionVariable]?.trim(),
  );
  if (empty) return `The ${name} template is missing a value for {${empty}}.`;
  const invalid = placeholders.find((key) => {
    const value = variables[key as CompositionVariable];
    return (
      value &&
      (plainTextProblem(value) ||
        /[{}]/.test(value) ||
        (!FIXED_VARIABLES.some((fixed) => fixed === key) &&
          /[\r\n]/.test(value)))
    );
  });
  return invalid
    ? `The value for {${invalid}} must be plain text without template variables.`
    : null;
};

const fixedParagraphProblem = (template: string, name: string) => {
  const blocks = paragraphs(template);
  if (
    blocks.some((block) => block.includes("{optout}") && block !== "{optout}")
  )
    return `The ${name} template must keep {optout} as its own exact paragraph.`;
  if (blocks.at(-1) !== "{signature}")
    return `The ${name} template must end with the exact {signature} paragraph.`;
  if (
    blocks.some(
      (block) =>
        block.includes("{founderLine}") &&
        !["{founderLine}", "{founderLine} {callToAction}"].includes(block),
    )
  )
    return `The ${name} template must keep the founder line and call to action unchanged.`;
  return null;
};

const templatesProblem = (settings: Playbook, variables: Variables) => {
  const identity: CompositionVariable[] = [
    "first",
    "name",
    "company",
    "product",
    "queryTopic",
  ];
  const checks = [
    templateProblem(
      "subject",
      settings.subjectTemplate,
      variables,
      [],
      ["queryTopic", "product"],
    ),
    templateProblem(
      "first email",
      settings.bodyTemplate,
      variables,
      [...PART_VARIABLES, ...FIXED_VARIABLES],
      [...identity, ...PART_VARIABLES, ...FIXED_VARIABLES],
    ),
    settings.followupOneTemplate !== FOLLOWUP_BUMP ||
    settings.followupTwoTemplate !== "{first}?" ||
    settings.followupOneDays !== 3 ||
    settings.followupTwoDays !== 7
      ? "New sequences require the fixed day-three and day-seven bumps."
      : null,
    templateProblem(
      "LinkedIn",
      settings.linkedinTemplate,
      variables,
      ["result"],
      [...identity, "result"],
    ),
    ...[["first email", settings.bodyTemplate]].map(([name, template]) =>
      fixedParagraphProblem(template ?? "", name ?? "email"),
    ),
  ];
  const problem = checks.find(Boolean);
  if (problem) return problem;
  if (
    !tokens(settings.subjectTemplate).some((token) =>
      ["queryTopic", "product"].includes(token),
    )
  )
    return "The subject template must include {queryTopic}, with {product} available as the fallback.";
  if (/\n/.test(normalizeNewlines(settings.subjectTemplate)))
    return "The subject template must be a single line.";
  return null;
};

/** Count the actual greeting, configured controls and template literals before any writer call. */
export const preflightWriterAssembly = (
  prospect: ProspectInput,
  receipt: ShoppingResearch,
  settings: Playbook,
): AssemblyReady | AssemblyHold => {
  const founderLine = compositionFounderLine(receipt, settings);
  if (!founderLine)
    return hold(
      "This finding is not eligible for a written outreach sequence.",
    );
  if (
    !receipt.discovery ||
    !receipt.claims?.length ||
    !receipt.claimExcerpts?.length
  )
    return hold("The finding needs its observed fact ledger before writing.");
  const variables = variablesFor(prospect, receipt, settings);
  const problem = templatesProblem(settings, variables);
  if (problem) return hold(problem);
  const fixedBody = render(settings.bodyTemplate, variables);
  const fixedProblem = sentenceProblem(fixedBody);
  if (fixedProblem) return hold(fixedProblem);
  const hardCap = Math.min(99, settings.maxBodyWords);
  const fixedWords = countWords(fixedBody);
  const availableWords = hardCap - fixedWords;
  if (!Number.isInteger(hardCap) || availableWords < 40)
    return hold(
      `The configured greeting and fixed text use ${fixedWords} words, leaving fewer than 40 for the opening, result and relevance.`,
    );
  const followupProblem = sentenceProblem(
    render(settings.followupTwoTemplate, variables),
  );
  if (followupProblem) return hold(followupProblem);
  return {
    status: "ready",
    founderLine,
    queryTopic: variables.queryTopic,
    budget: {
      hardCap,
      fixedWords,
      availableWords,
      targetMinWords: Math.max(0, Math.min(70, hardCap) - fixedWords),
      targetMaxWords: Math.max(0, Math.min(90, hardCap) - fixedWords),
      partLimits: WRITER_LIMITS,
    },
  };
};

/** Hash only recipient-visible text and delivery order, excluding self-referential writing metadata. */
export const canonicalSequenceInput = (
  messages: readonly Message[],
): { status: "ready"; canonicalText: string } | AssemblyHold => {
  if (
    messages.length !== 3 ||
    messages.some((message, index) => message.step !== index + 1)
  )
    return hold("A sequence needs its three messages in delivery order.");
  const invalid = messages.find(
    (message) =>
      !Number.isInteger(message.afterDays) ||
      message.afterDays < 0 ||
      !message.subject.trim() ||
      /[\r\n]/.test(message.subject) ||
      !message.body.trim() ||
      plainTextProblem(message.subject) ||
      plainTextProblem(message.body),
  );
  if (invalid)
    return hold(
      "The sequence contains an invalid subject, body or delivery day.",
    );
  return {
    status: "ready",
    canonicalText: JSON.stringify({
      version: messages[0]?.writing?.version ?? WRITING_CONTRACT_VERSION,
      messages: messages.map(({ step, afterDays, subject, body }) => ({
        step,
        afterDays,
        subject: normalizeNewlines(subject),
        body: normalizeNewlines(body),
      })),
    }),
  };
};

/** The LinkedIn note reuses the reviewed result; it never creates another finding or biography. */
export const renderLinkedInResult = (
  prospect: ProspectInput,
  settings: Playbook,
  parts: WriterParts,
): { status: "ready"; text: string } | AssemblyHold => {
  const parsed = writerPartsSchema.safeParse(parts);
  if (!parsed.success)
    return hold("Review the sequence before preparing a LinkedIn note.");
  const variables: Variables = {
    first: prospect.first,
    name: prospect.name,
    company: prospect.company,
    product: prospect.product,
    queryTopic: parsed.data.subject,
    opening: "",
    result: parsed.data.result,
    relevance: "",
    founderLine: "",
    callToAction: "",
    optout: "",
    signature: "",
  };
  const problem = templateProblem(
    "LinkedIn",
    settings.linkedinTemplate,
    variables,
    ["result"],
    ["first", "name", "company", "product", "queryTopic", "result"],
  );
  if (problem) return hold(problem);
  const text = render(settings.linkedinTemplate, variables);
  return text.length > 3000
    ? hold("The LinkedIn note exceeds 3,000 characters.")
    : { status: "ready", text };
};

/** Pure assembly: never falls back to the legacy template or removes a writer-owned part. */
export const assembleSequence = (
  prospect: ProspectInput,
  receipt: ShoppingResearch,
  settings: Playbook,
  suppliedParts: WriterParts,
):
  | (AssemblyReady & {
      messages: Message[];
      linkedin: string;
      canonicalText: string;
    })
  | AssemblyHold => {
  const preflight = preflightWriterAssembly(prospect, receipt, settings);
  if (preflight.status === "held") return preflight;
  const parsed = writerPartsSchema.safeParse(suppliedParts);
  if (!parsed.success)
    return hold(
      "The writer must provide exactly the four required text fields.",
    );
  const parts = parsed.data;
  if (
    Object.values(parts).some(
      (value) => plainTextProblem(value) || /[{}\r\n]/.test(value),
    )
  )
    return hold(
      "Writer parts must be single plain-text paragraphs without template variables.",
    );
  const oversized = PART_VARIABLES.find(
    (part) => countWords(parts[part]) > WRITER_LIMITS[part],
  );
  if (oversized)
    return hold(
      `The ${oversized} exceeds its ${WRITER_LIMITS[oversized]}-word limit.`,
    );
  const variables = variablesFor(prospect, receipt, settings, parts);
  const subject = render(settings.subjectTemplate, variables);
  if (
    countWords(subject) < 2 ||
    countWords(subject) > 5 ||
    /[\p{N}?\r\n]/u.test(subject) ||
    subject !== subject.toLowerCase()
  )
    return hold(
      "The subject must be two to five lowercase words without numbers or a question mark.",
    );
  const messages: Message[] = [
    {
      step: 1,
      afterDays: 0,
      subject,
      body: render(settings.bodyTemplate, variables),
    },
    {
      step: 2,
      afterDays: 3,
      subject: `Re: ${subject}`,
      body: FOLLOWUP_BUMP,
    },
    {
      step: 3,
      afterDays: 7,
      subject: `Re: ${subject}`,
      body: finalFollowup(prospect.first),
    },
  ];
  const first = messages[0];
  if (!first || countWords(first.body) > preflight.budget.hardCap)
    return hold(
      `The complete first email exceeds ${preflight.budget.hardCap} words, including its greeting, fixed text and signature.`,
    );
  const longSentence = messages
    .map((message) => sentenceProblem(message.body))
    .find(Boolean);
  if (longSentence) return hold(longSentence);
  const canonical = canonicalSequenceInput(messages);
  if (canonical.status === "held") return canonical;
  return {
    ...preflight,
    queryTopic: variables.queryTopic,
    messages,
    linkedin: render(settings.linkedinTemplate, variables),
    canonicalText: canonical.canonicalText,
  };
};
