// Best-effort brand logos via Clearbit's logo API, keyed off a guessed brand
// domain (e.g. "Sony" → sony.com). Returns null when there's no brand to guess
// from; brands Clearbit doesn't recognize 404 and the Avatar fallback covers it.
export const getBrandLogo = (brand: string | null | undefined) => {
  if (!brand) return null;
  const domain = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}.com`;
};
