// Best-effort brand logos keyed off a guessed brand domain (e.g. "Sony" →
// sony.com). Returns null when there's no brand to guess from.
//
// Google's favicon service, not Clearbit's logo API: HubSpot shut that one down
// after acquiring Clearbit and `logo.clearbit.com` no longer resolves at all, so
// every stored URL pointed at a dead host. Note the failure modes differ — a
// domain Google doesn't know still answers 200 with a generic globe rather than
// 404ing, so callers can't infer "no logo" from the response and should render
// an onError fallback instead.
export const getBrandLogo = (brand: string | null | undefined) => {
  if (!brand) return null;
  const domain = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}.com&sz=128`;
};
