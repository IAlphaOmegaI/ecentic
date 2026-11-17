export const normalizeRoleTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/e[ -]?commerce/g, "ecommerce")
    .replace(/\bvice president\b/g, "vp")
    .replace(/\bchief marketing officer\b/g, "cmo")
    .replace(/\bchief executive officer\b/g, "ceo")
    .replace(/\bof\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesRole = (title: string, role: string) => {
  const escaped = normalizeRoleTitle(role).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  return (
    Boolean(escaped) &&
    new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, "i").test(
      normalizeRoleTitle(title),
    )
  );
};

/** Alias matching changes comparisons only; the provider's actual title is always retained. */
export const matchesRole = (title: string, role: string) => {
  const scoped = (value: string) =>
    normalizeRoleTitle(value)
      .replace(/\b(?:global|international|regional|senior|sr)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return includesRole(scoped(title), scoped(role));
};

export const isExcludedRole = (title: string, excluded: string[]) =>
  /\b(?:assistant|junior|jr|trainee|intern|fractional|advisor|adviser|consultant)\b/i.test(
    title,
  ) || excluded.some((role) => includesRole(title, role));
