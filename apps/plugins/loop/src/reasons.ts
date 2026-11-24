import { assertMerchant } from "./guard";
import { redactComment } from "./privacy";
import type { LoopCategory } from "./types";

export const normalizeReason = (
  store: string,
  reason: string,
  parent: string | null = null,
) => {
  assertMerchant(store);
  const normalize = (value: string) =>
    redactComment(store, value)
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  const normalized = normalize(reason);
  const ancestor = parent === null ? null : normalize(parent) || null;
  return {
    reason: normalized,
    parent: ancestor,
    key: JSON.stringify([normalized, ancestor]),
  };
};

type Rule = { pattern: RegExp; category: LoopCategory; dataFixable: boolean };
const rules: Rule[] = [
  {
    pattern:
      /\b(damag(?:ed|e) (?:in|during) (?:transit|shipping)|broken (?:on arrival|in transit)|shipping damage|arrived (?:damaged|broken))\b/,
    category: "damaged",
    dataFixable: false,
  },
  {
    pattern:
      /\b(arrived late|late delivery|delivery delay|shipping delay|not delivered|never arrived|lost (?:package|parcel)|delayed shipment)\b/,
    category: "shipping",
    dataFixable: false,
  },
  {
    pattern:
      /\b(changed (?:my |their )?mind|change of mind|ordered (?:by mistake|in error)|accidental (?:order|purchase)|duplicate (?:order|purchase)|unwanted gift|no longer (?:want|need)|bought by mistake)\b/,
    category: "changed_mind",
    dataFixable: false,
  },
  {
    pattern: /\b(damaged|defective|broken|faulty)\b/,
    category: "damaged",
    dataFixable: false,
  },
  {
    pattern:
      /\b(compatib(?:le|ility)|incompatible|does(?:n't| not) (?:work|fit) with|wrong (?:connector|model)|device support)\b/,
    category: "compatibility",
    dataFixable: true,
  },
  {
    pattern:
      /\b(missing (?:parts|pieces|accessories)|(?:box|package) contents|what'?s (?:included|in the box)|not included|incomplete (?:kit|set))\b/,
    category: "contents",
    dataFixable: true,
  },
  {
    pattern:
      /\b(dimensions?|capacity|volume|measurements?|width|height|length|depth)\b/,
    category: "dimensions",
    dataFixable: true,
  },
  {
    pattern:
      /\b(colou?r|shade|appearance|looks? different|not (?:as |like (?:the )?)pictured|darker|lighter|too (?:bright|dark|light))\b/,
    category: "color",
    dataFixable: true,
  },
  {
    pattern:
      /\b((?:material|fabric|quality|texture).*(?:not as|different|expected|description|advertised)|(?:wrong|unexpected|different) (?:material|fabric)|not (?:real |genuine )?(?:leather|cotton|wool|silk)|feels? (?:cheap|different))\b/,
    category: "material",
    dataFixable: true,
  },
  {
    pattern:
      /\b(size|sizing|fit|fits|runs (?:(?:a little|slightly|very) )?(?:small|large|big)|too (?:small|large|big|tight|loose)|true to size)\b/,
    category: "fit",
    dataFixable: true,
  },
  {
    pattern:
      /\b(not as (?:described|advertised|expected)|does(?:n't| not) match (?:the )?description|misleading description|different (?:from|than) (?:the )?description)\b/,
    category: "not_as_described",
    dataFixable: true,
  },
];

/** Rules match concepts in merchant-edited text. Unknown pairs require a merchant-scoped model or override. */
export const classifyReason = (
  store: string,
  reason: string,
  parent: string | null = null,
) => {
  assertMerchant(store);
  const normalized = normalizeReason(store, reason, parent);
  const combined = `${normalized.parent ?? ""} ${normalized.reason}`;
  const rule = rules.find(({ pattern }) => pattern.test(combined));
  return rule
    ? {
        category: rule.category,
        dataFixable: rule.dataFixable,
        source: "rule" as const,
      }
    : null;
};
