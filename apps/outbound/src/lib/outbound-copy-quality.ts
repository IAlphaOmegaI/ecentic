import {
  countWords,
  type Message,
  type Playbook,
  type ProspectInput,
} from "./outbound";
import {
  assembleSequence,
  COPY_CRITERIA,
  canonicalSequenceInput,
  compositionSentences,
  copyVerdictSchema,
  FOLLOWUP_BUMP,
  finalFollowup,
  preflightWriterAssembly,
  type WriterParts,
} from "./outbound-composition";
import type { CopyRulesContext } from "./outbound-round3-copy";
import type { ShoppingResearch } from "./outbound-shopping-research";
import {
  type CompositionPeer,
  validateWriterParts,
  validateWriterSubject,
} from "./outbound-writing";

export const COPY_QUALITY_VERSION = "copy-checks-v2";
export type CopyQualityContext = CopyRulesContext & {
  prospect: ProspectInput;
  receipt: ShoppingResearch;
  playbook: Playbook & { relevanceLines?: string[] };
  parts: WriterParts;
  messages: Message[];
  peers?: CompositionPeer[];
  globalVoiceNotes?: string;
};

const normalize = (value: string) =>
  value.normalize("NFKC").replaceAll("’", "'");
const escapeExpression = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Phrases are literal words: code does not match barcode, or GEO match George. */
export const copyPhrasePresent = (text: string, phrase: string) =>
  Boolean(phrase.trim()) &&
  new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeExpression(normalize(phrase.trim())).replace(/\s+/g, "\\s+")}(?=$|[^\\p{L}\\p{N}])`,
    "iu",
  ).test(normalize(text));
const phrases = (value: string) =>
  value
    .split(/[;\n]+/)
    .map((phrase) => phrase.trim())
    .filter(Boolean);
const readable = (value: string) =>
  normalize(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Checks actual delivered message text as well as the four writer-owned fields. */
export const deterministicCopyIssues = (
  context: CopyQualityContext,
): string[] => {
  const { prospect, receipt, playbook, parts, messages } = context;
  const preflight = preflightWriterAssembly(prospect, receipt, playbook);
  const assembled = assembleSequence(
    prospect,
    receipt,
    playbook,
    parts,
    context,
  );
  const canonical = canonicalSequenceInput(messages, context);
  const issues = [
    ...validateWriterParts({
      ...context,
      ...(preflight.status === "ready" ? { budget: preflight.budget } : {}),
    }),
    ...validateWriterSubject(
      messages[0]?.subject ?? "",
      receipt,
      prospect,
      context,
    ),
    ...(preflight.status === "held" ? [preflight.reason] : []),
    ...(assembled.status === "held" ? [assembled.reason] : []),
  ];
  if (
    canonical.status !== "ready" ||
    assembled.status !== "ready" ||
    canonical.canonicalText !== assembled.canonicalText
  )
    issues.push(
      "The exact messages differ from their writer parts, fixed controls or delivery order.",
    );
  const query = receipt.queries[receipt.selected.queryIndex]?.query ?? "";
  const attributes = [
    ...new Set(
      (receipt.claims ?? [])
        .filter((claim) => claim.kind === "product-attribute")
        .map((claim) => readable(claim.value))
        .filter(Boolean),
    ),
  ];
  for (const message of messages) {
    if (message.step > 1) {
      if (
        message.body !==
          (message.step === 2
            ? FOLLOWUP_BUMP
            : finalFollowup(prospect.first)) ||
        message.afterDays !== (message.step === 2 ? 3 : 7) ||
        message.subject !== `Re: ${messages[0]?.subject ?? ""}`
      )
        issues.push(
          `Message ${message.step} must be the exact fixed threaded bump.`,
        );
      continue;
    }
    const content = `${message.subject}\n${message.body}`;
    const text = normalize(content);
    const label = `Message ${message.step}`;
    if (
      /https?:|www\.|mailto:|(?:^|[\s<(])(?:[\p{L}\p{N}][\p{L}\p{N}-]*\.)+[\p{L}]{2,63}(?:[/?#][^\s]*)?/imu.test(
        text,
      )
    )
      issues.push(`${label} includes a link.`);
    if (/[\u2013\u2014]|&[mn]dash;|&#(?:821[12]|x201[34]);/iu.test(text))
      issues.push(`${label} includes an en or em dash.`);
    if (
      /\b(?:lost|losing)\s+sales\b|\brevenue\b|\binvisible\b|\b(?:can't|cannot|can not)\s+(?:see|read)\b|\b(?:took|stole)\s+(?:(?:the|a|your)\s+)?sales?\b|%|\bpercent(?:age)?s?\b/iu.test(
        text,
      )
    )
      issues.push(
        `${label} claims forbidden certainty or an unmeasured outcome.`,
      );
    const banned = phrases(playbook.bannedPhrases).find((phrase) =>
      copyPhrasePresent(text, phrase),
    );
    if (banned)
      issues.push(`${label} contains the blocked phrase “${banned}”.`);
    if (message.step === 1) {
      const blocked = phrases(playbook.firstEmailBlockedClaims).find((phrase) =>
        copyPhrasePresent(text, phrase),
      );
      if (blocked)
        issues.push(`${label} contains a prohibited first-email claim.`);
      if (countWords(message.body) > Math.min(99, playbook.maxBodyWords))
        issues.push("The whole first email exceeds its word limit.");
    }
    if (
      compositionSentences(message.body).some(
        (sentence) => countWords(sentence) > 25,
      )
    )
      issues.push(`${label} contains a sentence over 25 words.`);
    if (/[{}]|\[name\]|\bTODO\b/iu.test(text))
      issues.push(`${label} contains an unresolved placeholder.`);
    if (/^\s*[-*•]\s/m.test(message.body))
      issues.push(`${label} contains a bullet.`);
    if (/(?:[©®™]\uFE0F|(?![©®™])\p{Extended_Pictographic})/u.test(text))
      issues.push(`${label} contains an emoji.`);
    const withoutGreeting = message.body.replace(
      /^(?:Hey|Hi|Hello|Dear) [^!\r\n]+!\r?\n/u,
      "",
    );
    if (/!/.test(withoutGreeting) || /!/.test(message.subject))
      issues.push(
        `${label} includes an exclamation mark outside its greeting.`,
      );
    const withoutQuery = query
      ? message.body.split(query).join(" ")
      : message.body;
    const mentioned = attributes.filter((attribute) =>
      copyPhrasePresent(readable(withoutQuery), attribute),
    );
    if (mentioned.length > 1)
      issues.push(`${label} recaps more than one product attribute.`);
  }
  if (
    attributes.some((attribute) =>
      copyPhrasePresent(readable(parts.relevance), attribute),
    )
  )
    issues.push(
      "Relevance repeats a product attribute instead of giving a reason to care.",
    );
  return [...new Set(issues)];
};

/** Both a genuine fail and a pass are complete; missing or inconsistent judgments are not. */
export const hasCompleteCopyVerdict = (value: unknown) => {
  const parsed = copyVerdictSchema.safeParse(value);
  if (!parsed.success) return false;
  const verdict = parsed.data;
  return (
    verdict.criteria.length === COPY_CRITERIA.length &&
    COPY_CRITERIA.every(
      (criterion) =>
        verdict.criteria.filter((entry) => entry.criterion === criterion)
          .length === 1,
    ) &&
    verdict.criteria.every((entry) => !/[\r\n]/.test(entry.reason)) &&
    verdict.deterministicIssues.every((issue) => !/[\r\n]/.test(issue)) &&
    verdict.passed ===
      (verdict.deterministicIssues.length === 0 &&
        verdict.criteria.every((entry) => entry.passed))
  );
};

/** The caller prefixes Copy once; reasons never imply reply-performance scores. */
export const copyVerdictProblem = (value: unknown): string | null => {
  if (!hasCompleteCopyVerdict(value))
    return "verdict: A complete, consistent six-check copy decision is required.";
  const parsed = copyVerdictSchema.safeParse(value);
  if (!parsed.success) return "verdict: The saved copy decision is invalid.";
  const verdict = parsed.data;
  if (verdict.deterministicIssues.length)
    return `deterministic: ${verdict.deterministicIssues[0]}`;
  const failed = verdict.criteria.find((criterion) => !criterion.passed);
  return failed ? `${failed.criterion}: ${failed.reason}` : null;
};
