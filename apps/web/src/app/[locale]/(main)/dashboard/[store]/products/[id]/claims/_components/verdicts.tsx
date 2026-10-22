import {
  AlertCircleIcon,
  CheckBadgeIcon,
  CircleMinusIcon,
  QuoteIcon,
  SearchIcon,
  XCircleIcon,
} from "@zenncore/icons";
import type { ReactNode } from "react";
import type * as Rules from "@/server/app/intelligence/claim-check-rules";

/**
 * How each verdict reads, shared by the server report and the client claim
 * list. Type-only on the rules module: it imports `node:crypto`, which must
 * never reach a client bundle.
 */

type Tone = "success" | "warning" | "error" | "primary" | "neutral";

/** Message keys are camelCase; verdicts are kebab-case values in the report. */
export const VERDICT_KEY = {
  verified: "verified",
  cited: "cited",
  "merchant-only": "merchantOnly",
  contradicted: "contradicted",
  "not-checkable": "notCheckable",
  unresearched: "unresearched",
} as const satisfies Record<Rules.Verdict, string>;

export type VerdictKey = (typeof VERDICT_KEY)[Rules.Verdict];

/** Display order: what needs the merchant's attention first. */
export const VERDICT_ORDER: Rules.Verdict[] = [
  "contradicted",
  "merchant-only",
  "cited",
  "verified",
  "not-checkable",
  "unresearched",
];

export const VERDICT_TONE: Record<Rules.Verdict, Tone> = {
  verified: "success",
  cited: "primary",
  "merchant-only": "warning",
  contradicted: "error",
  "not-checkable": "neutral",
  unresearched: "neutral",
};

export const VERDICT_ICON: Record<Rules.Verdict, ReactNode> = {
  verified: <CheckBadgeIcon className="size-4" />,
  cited: <QuoteIcon className="size-4" />,
  "merchant-only": <CircleMinusIcon className="size-4" />,
  contradicted: <XCircleIcon className="size-4" />,
  "not-checkable": <AlertCircleIcon className="size-4" />,
  unresearched: <SearchIcon className="size-4" />,
};

export const CONSISTENCY_TONE: Record<Rules.Consistency, Tone> = {
  consistent: "success",
  conflicting: "error",
  unknown: "neutral",
};

export const STANCE_TONE: Record<Rules.AssistantStance, Tone> = {
  agrees: "success",
  diverges: "error",
  unknown: "neutral",
};

/** Report notes are kebab-case values; message keys are camelCase. */
export const NOTE_KEY = {
  "no-page": "noPage",
  "no-markup": "noMarkup",
  "ambiguous-markup": "ambiguousMarkup",
  "missing-in-listing": "missingInListing",
  "missing-on-page": "missingOnPage",
  "currency-mismatch": "currencyMismatch",
  "currency-missing": "currencyMissing",
  "variant-not-matched": "variantNotMatched",
  "invalid-gtin": "invalidGtin",
} as const satisfies Record<Rules.CoreFactNote, string>;

export const ASSISTANT_LABEL: Record<Rules.AssistantId, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};
